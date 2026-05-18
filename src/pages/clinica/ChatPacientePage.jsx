import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send, Paperclip, Check, CheckCheck,
  Calendar, Microscope, Pill, Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_MEDICO = {
  id: 'mock-garcia',
  nombre: 'Dra. María García',
  especialidad: 'Medicina Estética',
  foto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face',
  online: true,
}
const NOW = Date.now()
const MOCK_MENSAJES = [
  { id: 'm1', remitente_id: 'mock-garcia', contenido: '¡Hola! ¿Cómo te encuentras después de la última sesión?', tipo: 'texto', leido: true, creado_en: new Date(NOW - 3 * 86400000).toISOString() },
  { id: 'm2', remitente_id: 'mock-paciente', contenido: 'Muy bien, los resultados son increíbles 😊', tipo: 'texto', leido: true, creado_en: new Date(NOW - 3 * 86400000 + 300000).toISOString() },
  { id: 'm3', remitente_id: 'mock-garcia', contenido: '¡Me alegra mucho! Tu próxima cita está confirmada:', tipo: 'texto', leido: true, creado_en: new Date(NOW - 2 * 86400000).toISOString() },
  { id: 'm4', remitente_id: 'mock-garcia', contenido: null, tipo: 'recordatorio', leido: true,
    creado_en: new Date(NOW - 2 * 86400000 + 1000).toISOString(),
    metadata: { tipo_cita: 'Revisión Botox', fecha: 'jue 15 jun · 11:00', medico: 'Dra. García' } },
  { id: 'm5', remitente_id: 'mock-garcia', contenido: 'Además ya tienes tu último análisis disponible:', tipo: 'texto', leido: false, creado_en: new Date(NOW - 1800000).toISOString() },
  { id: 'm6', remitente_id: 'mock-garcia', contenido: null, tipo: 'resultado_analisis', leido: false,
    creado_en: new Date(NOW - 1700000).toISOString(),
    metadata: { puntuacion: 2, nivel_riesgo: 'bajo' } },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtHora(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function fmtDia(iso) {
  const d     = new Date(iso)
  const ahora = new Date()
  const diffMs = ahora.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)
  if (diffMs <= 0)           return 'Hoy'
  if (diffMs <= 86400000)    return 'Ayer'
  return new Date(iso).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
}

function groupByDay(msgs) {
  const result = []
  let lastDia = null
  for (const m of msgs) {
    const dia = fmtDia(m.creado_en)
    if (dia !== lastDia) {
      result.push({ _divider: true, label: dia, key: `div-${m.creado_en}` })
      lastDia = dia
    }
    result.push(m)
  }
  return result
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ChatPacientePage() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [mensajes,    setMensajes]    = useState([])
  const [medico,      setMedico]      = useState(null)
  const [texto,       setTexto]       = useState('')
  const [enviando,    setEnviando]    = useState(false)
  const [cargando,    setCargando]    = useState(true)
  const [escribiendo, setEscribiendo] = useState(false)

  const bottomRef   = useRef(null)
  const channelRef  = useRef(null)
  const typingTimer = useRef(null)
  const fileRef     = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    cargar()
    return () => {
      channelRef.current?.unsubscribe()
      clearTimeout(typingTimer.current)
    }
  }, [user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [mensajes.length])

  async function cargar() {
    if (!user?.id) { setCargando(false); return }

    if (!supabase) {
      setMensajes(MOCK_MENSAJES)
      setMedico(MOCK_MEDICO)
      setCargando(false)
      return
    }

    // Cargar mensajes y médico asignado en paralelo
    const [msgsRes, pacRes] = await Promise.all([
      supabase
        .from('mensajes')
        .select('*')
        .eq('clinica_id', user.clinica_id)
        .or(`destinatario_id.eq.${user.id},remitente_id.eq.${user.id}`)
        .order('creado_en', { ascending: true }),
      supabase
        .from('pacientes')
        .select('medico_id')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    setMensajes(msgsRes.data ?? [])

    if (pacRes.data?.medico_id) {
      const { data: med } = await supabase
        .from('usuarios')
        .select('id, nombre, foto, especialidad')
        .eq('id', pacRes.data.medico_id)
        .maybeSingle()
      setMedico(med)
    }

    setCargando(false)

    // Marcar no leídos como leídos
    const noLeidos = (msgsRes.data ?? []).filter(
      m => !m.leido && m.remitente_id !== user.id
    )
    if (noLeidos.length > 0) {
      await supabase
        .from('mensajes')
        .update({ leido: true, fecha_lectura: new Date().toISOString() })
        .in('id', noLeidos.map(m => m.id))
    }

    // Suscripción Realtime
    const ch = supabase
      .channel(`chat-paciente-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${user.id}`,
      }, async (payload) => {
        // Saltar mensajes propios (ya añadidos localmente tras el insert)
        if (payload.new.remitente_id === user.id) return
        setMensajes(prev => [...prev, payload.new])
        // Marcar como leído automáticamente
        await supabase
          .from('mensajes')
          .update({ leido: true, fecha_lectura: new Date().toISOString() })
          .eq('id', payload.new.id)
      })
      // Typing broadcast del médico
      .on('broadcast', { event: 'typing' }, () => {
        setEscribiendo(true)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setEscribiendo(false), 3000)
      })
      .subscribe()

    channelRef.current = ch
  }

  async function handleEnviar() {
    const msg = texto.trim()
    if (!msg || enviando) return
    setTexto('')
    setEnviando(true)

    try {
      if (!supabase) {
        const nuevo = {
          id: `local-${Date.now()}`,
          remitente_id: user.id,
          destinatario_id: user.id,
          contenido: msg,
          tipo: 'texto',
          leido: false,
          creado_en: new Date().toISOString(),
        }
        setMensajes(prev => [...prev, nuevo])
        return
      }

      const { data, error } = await supabase
        .from('mensajes')
        .insert({
          clinica_id:             user.clinica_id,
          remitente_id:           user.id,
          destinatario_id:        user.id,
          destinatario_usuario_id: medico?.id ?? null,
          contenido:              msg,
          tipo:                   'texto',
        })
        .select()
        .single()

      if (error) throw error
      setMensajes(prev => [...prev, data])
    } catch (err) {
      alert('Error enviando: ' + err.message)
      setTexto(msg)
    } finally {
      setEnviando(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  // Auto-resize textarea
  function handleTextareaChange(e) {
    setTexto(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }

  const mensajesConDia = useMemo(() => groupByDay(mensajes), [mensajes])

  return (
    <ClinicLayout>
      <div className="flex flex-col h-full">

        {/* Header — médico */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
          {medico?.foto ? (
            <div className="relative flex-shrink-0">
              <img src={medico.foto} alt={medico.nombre}
                   className="w-10 h-10 rounded-full object-cover" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                 style={{ backgroundColor: brand }}>
              {(medico?.nombre?.[0] ?? 'M').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm truncate">
              {medico?.nombre ?? 'Tu médico'}
            </p>
            <p className="text-xs h-4">
              {escribiendo
                ? <span style={{ color: brand }} className="animate-pulse">escribiendo...</span>
                : <span className="text-gray-400">{medico?.especialidad ?? ''}</span>
              }
            </p>
          </div>
        </div>

        {/* Lista de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
          {cargando ? (
            <div className="flex justify-center pt-12">
              <span className="w-5 h-5 border-2 border-gray-200 border-t-[#C8A882] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {mensajesConDia.map((item) =>
                item._divider ? (
                  <DividerDia key={item.key} label={item.label} />
                ) : (
                  <Burbuja
                    key={item.id}
                    msg={item}
                    esMio={item.remitente_id === user?.id}
                    brand={brand}
                  />
                )
              )}
              {escribiendo && <TypingBubble />}
              <div ref={bottomRef} className="h-1" />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex items-end gap-2 flex-shrink-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mb-0.5"
          >
            <Paperclip size={15} className="text-gray-500" />
          </button>

          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2.5 min-h-[38px]">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje…"
              rows={1}
              className="w-full bg-transparent text-sm text-gray-800 outline-none resize-none placeholder-gray-400 leading-[1.4]"
              style={{ maxHeight: '112px' }}
            />
          </div>

          <button
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-all disabled:opacity-40 active:scale-90"
            style={{ backgroundColor: brand }}
          >
            <Send size={15} className="text-white translate-x-px" />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => { /* adjuntar foto: misma lógica que EvolucionPage */ }}
        />
      </div>
    </ClinicLayout>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function DividerDia({ label }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-gray-400 text-[10px] font-medium capitalize whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2 mt-1">
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-3">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Burbuja({ msg, esMio, brand }) {
  const hora = fmtHora(msg.creado_en)

  if (msg.tipo === 'recordatorio' && msg.metadata) {
    return <TarjetaCita meta={msg.metadata} esMio={esMio} hora={hora} brand={brand} />
  }
  if (msg.tipo === 'resultado_analisis' && msg.metadata) {
    return <TarjetaAnalisis meta={msg.metadata} esMio={esMio} hora={hora} brand={brand} />
  }
  if (msg.tipo === 'protocolo' && msg.metadata) {
    return <TarjetaProtocolo meta={msg.metadata} esMio={esMio} hora={hora} brand={brand} />
  }
  if (msg.tipo === 'foto' && msg.archivo_url) {
    return (
      <div className={`flex items-end gap-2 mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
        <div className={`max-w-[65%] rounded-2xl overflow-hidden shadow-sm ${esMio ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
          <img src={msg.archivo_url} alt="foto" className="w-full h-48 object-cover" />
          <div className={`px-2 py-1 text-[10px] flex items-center gap-1 ${esMio ? 'justify-end' : ''}`}
               style={{ backgroundColor: esMio ? brand : '#fff', color: esMio ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
            {hora}
            {esMio && (msg.leido ? <CheckCheck size={10} /> : <Check size={10} />)}
          </div>
        </div>
      </div>
    )
  }

  // Texto normal
  return (
    <div className={`flex items-end gap-2 mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${esMio ? 'rounded-br-sm' : 'rounded-bl-sm bg-white'}`}
        style={{
          backgroundColor: esMio ? brand : undefined,
          color:           esMio ? '#fff' : '#1f2937',
        }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.contenido}</p>
        <div className={`flex items-center gap-1 mt-0.5 ${esMio ? 'justify-end' : ''}`}>
          <span className="text-[10px]" style={{ opacity: 0.6 }}>{hora}</span>
          {esMio && (
            msg.leido
              ? <CheckCheck size={11} style={{ opacity: 0.8 }} />
              : <Check      size={11} style={{ opacity: 0.5 }} />
          )}
        </div>
      </div>
    </div>
  )
}

function TarjetaCita({ meta, esMio, hora, brand }) {
  return (
    <div className={`flex mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
      <div className="max-w-[78%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar size={13} style={{ color: brand }} />
            <p className="text-gray-900 font-semibold text-sm">Cita confirmada</p>
          </div>
          {meta.tipo_cita && <p className="text-gray-700 text-xs font-medium">{meta.tipo_cita}</p>}
          {meta.fecha    && <p className="text-gray-500 text-xs mt-0.5">{meta.fecha}</p>}
          {meta.medico   && <p className="text-gray-400 text-[10px] mt-0.5">{meta.medico}</p>}
        </div>
        <div className="border-t border-gray-100 px-4 py-1.5 flex justify-end">
          <span className="text-[10px] text-gray-400">{hora}</span>
        </div>
      </div>
    </div>
  )
}

const RIESGO_COLORS = {
  bajo:     { bg: '#dcfce7', text: '#15803d' },
  moderado: { bg: '#fef9c3', text: '#a16207' },
  alto:     { bg: '#fee2e2', text: '#b91c1c' },
}

function TarjetaAnalisis({ meta, esMio, hora, brand }) {
  const rc = RIESGO_COLORS[meta.nivel_riesgo ?? 'bajo'] ?? RIESGO_COLORS.bajo
  return (
    <div className={`flex mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
      <div className="max-w-[78%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Microscope size={13} style={{ color: brand }} />
            <p className="text-gray-900 font-semibold text-sm">Análisis listo</p>
          </div>
          <p className="text-gray-600 text-xs">
            Puntuación: <strong>{meta.puntuacion}/9</strong>
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block capitalize"
                style={{ backgroundColor: rc.bg, color: rc.text }}>
            Riesgo {meta.nivel_riesgo}
          </span>
        </div>
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
          <button className="text-xs font-semibold" style={{ color: brand }}>Ver informe →</button>
          <span className="text-[10px] text-gray-400">{hora}</span>
        </div>
      </div>
    </div>
  )
}

function TarjetaProtocolo({ meta, esMio, hora, brand }) {
  return (
    <div className={`flex mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
      <div className="max-w-[78%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pill size={13} style={{ color: brand }} />
            <p className="text-gray-900 font-semibold text-sm">Nuevo protocolo</p>
          </div>
          {meta.nombre && <p className="text-gray-600 text-xs">{meta.nombre}</p>}
        </div>
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
          <button className="text-xs font-semibold" style={{ color: brand }}>Ver pasos →</button>
          <span className="text-[10px] text-gray-400">{hora}</span>
        </div>
      </div>
    </div>
  )
}
