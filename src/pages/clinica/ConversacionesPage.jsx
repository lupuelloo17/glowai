import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Search, ArrowLeft, Send, Paperclip,
  Check, CheckCheck, MessageCircle,
  Calendar, Microscope, Pill,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'

// ── Mock data ────────────────────────────────────────────────────────────────
const NOW = Date.now()
const MOCK_CONVERSACIONES = [
  {
    paciente_id: 'p1', nombre: 'Sofía', apellido: 'Restrepo',
    foto_perfil: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=80&h=80&fit=crop&crop=face',
    ultimo_msg: '¡Muchas gracias Dra! Los resultados son increíbles 😊',
    ultimo_msg_at: new Date(NOW - 1800000).toISOString(),
    no_leidos: 2, remitente_es_paciente: true,
  },
  {
    paciente_id: 'p2', nombre: 'Lucía', apellido: 'Fernández',
    foto_perfil: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop&crop=face',
    ultimo_msg: 'Cita confirmada para el martes',
    ultimo_msg_at: new Date(NOW - 3 * 86400000).toISOString(),
    no_leidos: 0, remitente_es_paciente: false,
  },
  {
    paciente_id: 'p3', nombre: 'Carmen', apellido: 'López',
    foto_perfil: null,
    ultimo_msg: '¿Cuándo puedo hacer el análisis de nuevo?',
    ultimo_msg_at: new Date(NOW - 7 * 86400000).toISOString(),
    no_leidos: 1, remitente_es_paciente: true,
  },
]
const MOCK_MENSAJES_P1 = [
  { id: '1', remitente_id: 'medico', destinatario_id: 'p1', contenido: 'Hola Sofía, ¿cómo te encuentras después del tratamiento?', tipo: 'texto', leido: true, creado_en: new Date(NOW - 2 * 86400000).toISOString() },
  { id: '2', remitente_id: 'p1', destinatario_id: 'p1', contenido: 'Muy bien! Me encanta el resultado', tipo: 'texto', leido: true, creado_en: new Date(NOW - 2 * 86400000 + 600000).toISOString() },
  { id: '3', remitente_id: 'medico', destinatario_id: 'p1', contenido: null, tipo: 'recordatorio', leido: true, creado_en: new Date(NOW - 86400000).toISOString(),
    metadata: { tipo_cita: 'Revisión Botox', fecha: 'jue 15 jun · 11:00', medico: 'Dra. García' } },
  { id: '4', remitente_id: 'p1', destinatario_id: 'p1', contenido: '¡Muchas gracias Dra! Los resultados son increíbles 😊', tipo: 'texto', leido: false, creado_en: new Date(NOW - 1800000).toISOString() },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtHora(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function fmtRelativo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000)         return 'Ahora'
  if (diff < 3600000)       return `${Math.floor(diff / 60000)} min`
  if (diff < 86400000)      return fmtHora(iso)
  if (diff < 7 * 86400000)  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short' })
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
function fmtDia(iso) {
  const d    = new Date(iso)
  const diff = new Date().setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)
  if (diff <= 0)         return 'Hoy'
  if (diff <= 86400000)  return 'Ayer'
  return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
}
function groupByDay(msgs) {
  const result = []; let lastDia = null
  for (const m of msgs) {
    const dia = fmtDia(m.creado_en)
    if (dia !== lastDia) { result.push({ _div: true, label: dia, key: `d-${m.creado_en}` }); lastDia = dia }
    result.push(m)
  }
  return result
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ConversacionesPage() {
  const { slug }    = useParams()
  const { user }    = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  // Vista: 'lista' | 'chat'
  const [vista,           setVista]           = useState('lista')
  const [conversaciones,  setConversaciones]  = useState([])
  const [seleccionado,    setSeleccionado]    = useState(null) // { paciente_id, nombre, apellido, foto_perfil }
  const [mensajes,        setMensajes]        = useState([])
  const [busqueda,        setBusqueda]        = useState('')
  const [texto,           setTexto]           = useState('')
  const [enviando,        setEnviando]        = useState(false)
  const [cargandoLista,   setCargandoLista]   = useState(true)
  const [cargandoChat,    setCargandoChat]    = useState(false)
  const [escribiendo,     setEscribiendo]     = useState(false)

  const bottomRef   = useRef(null)
  const channelRef  = useRef(null)
  const typingTimer = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { cargarLista() }, [user?.clinica_id])

  useEffect(() => {
    if (seleccionado) cargarChat(seleccionado.paciente_id)
    return () => {
      channelRef.current?.unsubscribe()
      clearTimeout(typingTimer.current)
    }
  }, [seleccionado?.paciente_id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [mensajes.length])

  // ── Cargar lista de conversaciones ────────────────────────────────────────
  async function cargarLista() {
    if (!supabase) {
      setConversaciones(MOCK_CONVERSACIONES)
      setCargandoLista(false)
      return
    }

    // Médico: solo sus propias conversaciones (mensajes enviados o recibidos por él)
    // Admin/recepcion: todas las conversaciones de la clínica
    const isMedico = user?.rol === 'medico'
    let query = supabase
      .from('mensajes')
      .select('destinatario_id, contenido, creado_en, remitente_id, leido, pacientes(nombre,apellido,foto_perfil)')
      .order('creado_en', { ascending: false })

    if (isMedico) {
      query = query.or(`remitente_id.eq.${user.id},destinatario_usuario_id.eq.${user.id}`)
    } else {
      query = query.eq('clinica_id', user.clinica_id)
    }

    const { data: msgs } = await query

    if (!msgs) { setCargandoLista(false); return }

    // Agrupar por paciente: tomar primer (más reciente) mensaje por paciente
    const porPaciente = {}
    for (const m of msgs) {
      const pid = m.destinatario_id
      if (!porPaciente[pid]) {
        porPaciente[pid] = {
          paciente_id: pid,
          nombre:   m.pacientes?.nombre   ?? 'Paciente',
          apellido: m.pacientes?.apellido ?? '',
          foto_perfil: m.pacientes?.foto_perfil ?? null,
          ultimo_msg:     m.contenido,
          ultimo_msg_at:  m.creado_en,
          remitente_es_paciente: m.remitente_id === pid,
          no_leidos: 0,
        }
      }
      // Contar no leídos: mensajes del paciente que no han sido leídos
      if (m.remitente_id === pid && !m.leido) {
        porPaciente[pid].no_leidos++
      }
    }
    setConversaciones(Object.values(porPaciente))
    setCargandoLista(false)
  }

  // ── Cargar chat de un paciente ────────────────────────────────────────────
  async function cargarChat(pacienteId) {
    channelRef.current?.unsubscribe()
    setCargandoChat(true)
    setMensajes([])

    if (!supabase) {
      setMensajes(pacienteId === 'p1' ? MOCK_MENSAJES_P1 : [])
      setCargandoChat(false)
      return
    }

    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .eq('clinica_id', user.clinica_id)
      .eq('destinatario_id', pacienteId)
      .order('creado_en', { ascending: true })

    setMensajes(data ?? [])
    setCargandoChat(false)

    // Marcar como leídos (mensajes del paciente dirigidos a este usuario)
    const noLeidos = (data ?? []).filter(m =>
      !m.leido && m.remitente_id !== user.id
    )
    if (noLeidos.length > 0) {
      await supabase
        .from('mensajes')
        .update({ leido: true, fecha_lectura: new Date().toISOString() })
        .in('id', noLeidos.map(m => m.id))
      // Actualizar badge en la lista
      setConversaciones(prev =>
        prev.map(c => c.paciente_id === pacienteId ? { ...c, no_leidos: 0 } : c)
      )
    }

    // Suscripción Realtime
    const ch = supabase
      .channel(`chat-staff-${pacienteId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${pacienteId}`,
      }, (payload) => {
        // Saltar mensajes propios (ya añadidos localmente tras el insert)
        if (payload.new.remitente_id === user?.id) return
        setMensajes(prev => [...prev, payload.new])
        // Actualizar lista
        setConversaciones(prev =>
          prev.map(c =>
            c.paciente_id === pacienteId
              ? { ...c, ultimo_msg: payload.new.contenido, ultimo_msg_at: payload.new.creado_en }
              : c
          )
        )
      })
      .on('broadcast', { event: 'typing' }, () => {
        setEscribiendo(true)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setEscribiendo(false), 3000)
      })
      .subscribe()

    channelRef.current = ch
  }

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  async function handleEnviar() {
    const msg = texto.trim()
    if (!msg || enviando || !seleccionado) return
    setTexto('')
    setEnviando(true)
    try {
      if (!supabase) {
        const nuevo = {
          id: `local-${Date.now()}`,
          remitente_id: user.id, destinatario_id: seleccionado.paciente_id,
          contenido: msg, tipo: 'texto', leido: false,
          creado_en: new Date().toISOString(),
        }
        setMensajes(prev => [...prev, nuevo])
        setConversaciones(prev =>
          prev.map(c =>
            c.paciente_id === seleccionado.paciente_id
              ? { ...c, ultimo_msg: msg, ultimo_msg_at: nuevo.creado_en, remitente_es_paciente: false }
              : c
          )
        )
        return
      }

      const { data, error } = await supabase
        .from('mensajes')
        .insert({
          clinica_id:      user.clinica_id,
          remitente_id:    user.id,
          destinatario_id: seleccionado.paciente_id,
          contenido:       msg,
          tipo:            'texto',
        })
        .select()
        .single()

      if (error) throw error
      setMensajes(prev => [...prev, data])
      setConversaciones(prev =>
        prev.map(c =>
          c.paciente_id === seleccionado.paciente_id
            ? { ...c, ultimo_msg: msg, ultimo_msg_at: data.creado_en, remitente_es_paciente: false }
            : c
        )
      )

      // Broadcast typing stop
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } })
    } catch (err) {
      alert('Error: ' + err.message)
      setTexto(msg)
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }
  function handleTextareaChange(e) {
    setTexto(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
    // Broadcast typing
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } })
  }

  // Filtro búsqueda
  const conversacionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return conversaciones
    const q = busqueda.toLowerCase()
    return conversaciones.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q)
    )
  }, [conversaciones, busqueda])

  const mensajesConDia = useMemo(() => groupByDay(mensajes), [mensajes])

  // ── Vista: Lista ──────────────────────────────────────────────────────────
  if (vista === 'lista') {
    return (
      <ClinicLayout>
        <div className="animate-fade-in">
          {/* Header */}
          <div className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
            <h1 className="text-gray-900 font-bold text-lg mb-3">Conversaciones</h1>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar paciente…"
                className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 outline-none"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="divide-y divide-gray-50">
            {cargandoLista ? (
              <div className="flex justify-center py-12">
                <span className="w-5 h-5 border-2 border-gray-200 border-t-[#C8A882] rounded-full animate-spin" />
              </div>
            ) : conversacionesFiltradas.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  {busqueda ? 'Sin resultados' : 'Sin conversaciones todavía'}
                </p>
              </div>
            ) : (
              conversacionesFiltradas.map(conv => (
                <button
                  key={conv.paciente_id}
                  onClick={() => {
                    setSeleccionado(conv)
                    setVista('chat')
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors"
                >
                  {/* Avatar */}
                  {conv.foto_perfil ? (
                    <img src={conv.foto_perfil} alt={conv.nombre}
                         className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-base"
                         style={{ backgroundColor: brand }}>
                      {conv.nombre[0]}{conv.apellido?.[0] ?? ''}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-gray-900 font-semibold text-sm truncate">
                        {conv.nombre} {conv.apellido}
                      </p>
                      <span className="text-gray-400 text-[10px] flex-shrink-0">
                        {fmtRelativo(conv.ultimo_msg_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!conv.remitente_es_paciente && (
                        <CheckCheck size={12} className="text-gray-400 flex-shrink-0" />
                      )}
                      <p className={`text-xs truncate flex-1 ${conv.no_leidos > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>
                        {conv.ultimo_msg ?? '📎 Foto'}
                      </p>
                      {conv.no_leidos > 0 && (
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: brand }}
                        >
                          {conv.no_leidos > 9 ? '9+' : conv.no_leidos}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </ClinicLayout>
    )
  }

  // ── Vista: Chat ───────────────────────────────────────────────────────────
  return (
    <ClinicLayout>
      <div className="flex flex-col h-full">

        {/* Header chat */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => { setVista('lista'); setSeleccionado(null); setMensajes([]) }}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>

          {seleccionado?.foto_perfil ? (
            <img src={seleccionado.foto_perfil} alt={seleccionado.nombre}
                 className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                 style={{ backgroundColor: brand }}>
              {seleccionado?.nombre?.[0]}{seleccionado?.apellido?.[0] ?? ''}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm truncate">
              {seleccionado?.nombre} {seleccionado?.apellido}
            </p>
            <p className="text-xs h-4">
              {escribiendo
                ? <span style={{ color: brand }} className="animate-pulse">escribiendo...</span>
                : <span className="text-gray-400">Paciente</span>
              }
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
          {cargandoChat ? (
            <div className="flex justify-center pt-10">
              <span className="w-5 h-5 border-2 border-gray-200 border-t-[#C8A882] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {mensajesConDia.map((item) =>
                item._div ? (
                  <div key={item.key} className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-gray-400 text-[10px] font-medium capitalize whitespace-nowrap">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                ) : (
                  <BurbujaStaff
                    key={item.id}
                    msg={item}
                    esMio={item.remitente_id === user?.id}
                    pacienteId={seleccionado?.paciente_id}
                    brand={brand}
                  />
                )
              )}
              {escribiendo && (
                <div className="flex items-end gap-2 mt-1">
                  <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center h-3">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                              style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} className="h-1" />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex items-end gap-2 flex-shrink-0">
          <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2.5 min-h-[38px]">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje…"
              rows={1}
              className="w-full bg-transparent text-sm text-gray-800 outline-none resize-none placeholder-gray-400 leading-[1.4]"
              style={{ maxHeight: '96px' }}
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
      </div>
    </ClinicLayout>
  )
}

// ── Burbuja para vista del staff ─────────────────────────────────────────────
function BurbujaStaff({ msg, esMio, pacienteId, brand }) {
  const hora = fmtHora(msg.creado_en)

  if (msg.tipo === 'recordatorio' && msg.metadata) {
    return (
      <div className={`flex mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
        <div className="max-w-[78%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={13} style={{ color: brand }} />
              <p className="text-gray-900 font-semibold text-sm">Cita confirmada</p>
            </div>
            {msg.metadata.tipo_cita && <p className="text-gray-700 text-xs">{msg.metadata.tipo_cita}</p>}
            {msg.metadata.fecha     && <p className="text-gray-500 text-xs mt-0.5">{msg.metadata.fecha}</p>}
          </div>
          <div className="border-t border-gray-100 px-4 py-1.5 flex justify-end">
            <span className="text-[10px] text-gray-400">{hora}</span>
          </div>
        </div>
      </div>
    )
  }

  if (msg.tipo === 'resultado_analisis' && msg.metadata) {
    const RIESGO_C = { bajo: { bg: '#dcfce7', text: '#15803d' }, moderado: { bg: '#fef9c3', text: '#a16207' }, alto: { bg: '#fee2e2', text: '#b91c1c' } }
    const rc = RIESGO_C[msg.metadata.nivel_riesgo ?? 'bajo'] ?? RIESGO_C.bajo
    return (
      <div className={`flex mt-1 ${esMio ? 'flex-row-reverse' : ''}`}>
        <div className="max-w-[78%] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Microscope size={13} style={{ color: brand }} />
              <p className="text-gray-900 font-semibold text-sm">Análisis listo</p>
            </div>
            <p className="text-gray-600 text-xs">Puntuación: <strong>{msg.metadata.puntuacion}/9</strong></p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block capitalize"
                  style={{ backgroundColor: rc.bg, color: rc.text }}>
              Riesgo {msg.metadata.nivel_riesgo}
            </span>
          </div>
          <div className="border-t border-gray-100 px-4 py-1.5 flex justify-end">
            <span className="text-[10px] text-gray-400">{hora}</span>
          </div>
        </div>
      </div>
    )
  }

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
          {esMio && (msg.leido
            ? <CheckCheck size={11} style={{ opacity: 0.8 }} />
            : <Check      size={11} style={{ opacity: 0.5 }} />
          )}
        </div>
      </div>
    </div>
  )
}
