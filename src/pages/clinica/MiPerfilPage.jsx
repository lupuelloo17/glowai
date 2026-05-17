import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  LogOut, Sparkles, Calendar, Activity, FileText, User as UserIcon,
  Camera, Plus, Pencil, Save, Lock, AlertTriangle, ChevronRight,
  Pill, Clock, CheckCircle2, MessageCircle,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'
import EscribirClinicaDrawer from '../../components/EscribirClinicaDrawer'

const TIPOS_PIEL = ['Seca', 'Grasa', 'Mixta', 'Normal', 'Sensible']

const RIESGO_STYLE = {
  bajo:     { bg: '#dcfce7', text: '#15803d', label: 'Bajo' },
  moderado: { bg: '#fef9c3', text: '#a16207', label: 'Moderado' },
  alto:     { bg: '#fee2e2', text: '#b91c1c', label: 'Alto' },
}

function dateOnly(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
function dateTime(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) +
    ' · ' + dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function MiPerfilPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { hash } = useLocation()
  const { user, logout } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [paciente,  setPaciente]  = useState(null)
  const [proximaCita, setProximaCita] = useState(null)
  const [sesiones,  setSesiones]  = useState([])     // para "Mi evolución"
  const [analisis,  setAnalisis]  = useState([])
  const [protocolo, setProtocolo] = useState(null)
  const [cargando,  setCargando]  = useState(true)
  const [escribirOpen, setEscribirOpen] = useState(false)

  // Auto-scroll al hash #datos cuando la pestaña inferior "Datos" lo solicita
  useEffect(() => {
    if (hash === '#datos') {
      setTimeout(() => {
        document.getElementById('seccion-datos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [hash])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) { setCargando(false); return }

      if (!supabase) {
        // Demo sin Supabase: leer del mock guardado en registro
        try {
          const raw = localStorage.getItem('glowai_paciente_mock')
          if (raw && !cancelled) setPaciente(JSON.parse(raw))
        } catch { /* ignore */ }
        if (!cancelled) setCargando(false)
        return
      }

      // Cargar en paralelo: paciente + próxima cita + sesiones + análisis + protocolo activo
      const [
        pacRes,
        citaRes,
        sesRes,
        anaRes,
        protRes,
      ] = await Promise.all([
        supabase.from('pacientes').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('citas')
          .select('*')
          .eq('paciente_id', user.id)
          .gt('fecha', new Date().toISOString())
          .order('fecha', { ascending: true })
          .limit(1),
        supabase
          .from('sesiones')
          .select('*')
          .eq('paciente_id', user.id)
          .order('fecha', { ascending: false }),
        supabase
          .from('analisis_dermoscopicos')
          .select('*')
          .eq('paciente_id', user.id)
          .order('fecha', { ascending: false }),
        supabase
          .from('protocolos')
          .select('*')
          .eq('paciente_id', user.id)
          .eq('activo', true)
          .order('creado_en', { ascending: false })
          .limit(1),
      ])

      if (cancelled) return
      if (pacRes.error)  console.warn('[mi-perfil] paciente:', pacRes.error.message)
      if (citaRes.error) console.warn('[mi-perfil] citas:',    citaRes.error.message)
      if (sesRes.error)  console.warn('[mi-perfil] sesiones:', sesRes.error.message)
      if (anaRes.error)  console.warn('[mi-perfil] analisis:', anaRes.error.message)
      if (protRes.error) console.warn('[mi-perfil] protocolos:', protRes.error.message)

      setPaciente(pacRes.data)
      setProximaCita((citaRes.data || [])[0] ?? null)
      setSesiones(sesRes.data || [])
      setAnalisis(anaRes.data || [])
      setProtocolo((protRes.data || [])[0] ?? null)
      setCargando(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const nombre = paciente
    ? `${paciente.nombre ?? ''} ${paciente.apellido ?? ''}`.trim()
    : user?.nombre || 'Mi perfil'

  const foto = paciente?.foto_perfil ?? paciente?.foto ?? user?.foto

  const fotosEvolucion = useMemo(() => {
    // Cada sesión puede tener fotos_antes[] y fotos_despues[].
    // Las agregamos por fecha descendente.
    const items = []
    for (const s of sesiones) {
      const fechaTxt = dateOnly(s.fecha)
      ;(s.fotos_antes ?? []).forEach(url => items.push({ url, tipo: 'antes', fecha: fechaTxt, sesion: s.tratamiento || s.tipo_tratamiento }))
      ;(s.fotos_despues ?? []).forEach(url => items.push({ url, tipo: 'después', fecha: fechaTxt, sesion: s.tratamiento || s.tipo_tratamiento }))
    }
    return items
  }, [sesiones])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (cargando) {
    return (
      <ClinicLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Cargando tu perfil…</p>
        </div>
      </ClinicLayout>
    )
  }

  return (
    <ClinicLayout>
      <div className="animate-fade-in">

        {/* ── HEADER ── */}
        <div className="px-5 pt-6 pb-7 relative"
             style={{ background: `linear-gradient(180deg, ${brand}20 0%, transparent 100%)` }}>
          <button
            onClick={handleLogout}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
            title="Cerrar sesión"
          >
            <LogOut size={15} className="text-gray-500" />
          </button>

          <div className="flex flex-col items-center text-center">
            <AvatarEditable foto={foto} nombre={nombre} brand={brand} paciente={paciente} setPaciente={setPaciente} />
            <h1 className="text-gray-900 font-bold text-xl mt-3">{nombre}</h1>
            {paciente?.creado_en && (
              <p className="text-gray-400 text-xs mt-0.5">
                Miembro desde {dateOnly(paciente.creado_en)}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                 style={{ backgroundColor: brand + '20' }}>
              <Sparkles size={12} style={{ color: brand }} />
              <span className="text-xs font-semibold" style={{ color: brand }}>
                Plan {clinica?.plan ? clinica.plan.charAt(0).toUpperCase() + clinica.plan.slice(1) : 'Premium'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4">

          {/* ── SECCIÓN — Mi próxima cita ── */}
          <SeccionMiCita
            brand={brand}
            slug={slug}
            cita={proximaCita}
          />

          {/* ── SECCIÓN — Mi evolución ── */}
          <SeccionEvolucion
            brand={brand}
            fotosEvolucion={fotosEvolucion}
          />

          {/* ── SECCIÓN — Mis análisis ── */}
          <SeccionAnalisis
            brand={brand}
            slug={slug}
            analisis={analisis}
            navigate={navigate}
          />

          {/* ── SECCIÓN — Mi protocolo activo ── */}
          <SeccionProtocolo
            brand={brand}
            protocolo={protocolo}
            setProtocolo={setProtocolo}
          />

          {/* ── SECCIÓN — Escribir a la clínica ── */}
          <button
            onClick={() => setEscribirOpen(true)}
            className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: brand + '20' }}>
              <MessageCircle size={18} style={{ color: brand }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-semibold">Escribir a tu clínica</p>
              <p className="text-gray-400 text-xs">Manda un mensaje directo por email</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
          </button>

          {/* ── SECCIÓN — Mis datos personales ── */}
          <SeccionDatos
            brand={brand}
            paciente={paciente}
            setPaciente={setPaciente}
          />
        </div>
      </div>

      {escribirOpen && <EscribirClinicaDrawer onClose={() => setEscribirOpen(false)} />}
    </ClinicLayout>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  AVATAR EDITABLE — permite cambiar foto, sube a bucket "avatares"
// ═══════════════════════════════════════════════════════════════════
function AvatarEditable({ foto, nombre, brand, paciente, setPaciente }) {
  const fileRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)

  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!supabase || !paciente?.id) return
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB'); return }

    setSubiendo(true)
    try {
      const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${paciente.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatares').getPublicUrl(path)
      const fotoUrl = pub.publicUrl

      await supabase.from('pacientes').update({ foto_perfil: fotoUrl }).eq('id', paciente.id)
      setPaciente(p => ({ ...p, foto_perfil: fotoUrl }))
    } catch (err) {
      alert('Error subiendo foto: ' + err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="relative">
      {foto ? (
        <img src={foto} alt={nombre}
             className="w-24 h-24 rounded-full object-cover shadow-md border-4 border-white" />
      ) : (
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white"
          style={{ backgroundColor: brand }}
        >
          {(nombre?.[0] ?? 'M').toUpperCase()}
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={subiendo}
        className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white"
        style={{ backgroundColor: brand }}
        title="Cambiar foto"
      >
        <Camera size={14} className="text-white" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleChange}
      />
      {subiendo && (
        <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">
          Subiendo…
        </p>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  SECCIÓN: Mi próxima cita
// ═══════════════════════════════════════════════════════════════════
function SeccionMiCita({ brand, slug, cita }) {
  if (!cita) {
    return (
      <Card>
        <SectionTitle icon={Calendar} brand={brand} title="Mi próxima cita" />
        <p className="text-gray-500 text-xs mb-3">
          Aún no tienes ninguna cita programada. Solicita una a tu clínica.
        </p>
        <button
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: brand }}
          onClick={() => alert('Para solicitar una cita, contacta con tu clínica.\n(Pronto disponible desde aquí)')}
        >
          + Solicitar cita
        </button>
      </Card>
    )
  }

  const fecha = cita.fecha instanceof Date ? cita.fecha : new Date(cita.fecha)
  const ahora = new Date()
  const horasRestantes = (fecha - ahora) / (1000 * 60 * 60)
  const puedeCancelar  = horasRestantes >= 24

  function handleAgregarCalendario() {
    // Genera un .ics y dispara descarga
    const dtStart = fecha.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const dtEnd   = new Date(fecha.getTime() + (cita.duracion_minutos || 30) * 60000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:cita-${cita.id}@glowai
DTSTAMP:${dtStart}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${cita.tratamiento || 'Cita estética'}
DESCRIPTION:Con ${cita.medico_nombre || 'tu médico'}
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `cita-${cita.id}.ics`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function handleCancelar() {
    if (!supabase) return alert('Modo demo: no se puede cancelar.')
    if (!confirm('¿Cancelar esta cita? Tu clínica recibirá la notificación.')) return
    const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id)
    if (error) return alert('Error: ' + error.message)
    location.reload()
  }

  return (
    <Card>
      <SectionTitle icon={Calendar} brand={brand} title="Mi próxima cita" />

      <div className="rounded-2xl p-4 mb-3"
           style={{ backgroundColor: brand + '15', borderLeft: `4px solid ${brand}` }}>
        <p className="text-gray-900 font-bold text-sm">{cita.tratamiento}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Clock size={12} className="text-gray-500" />
          <p className="text-gray-700 text-xs font-medium capitalize">{dateTime(fecha)}</p>
        </div>
        <p className="text-gray-500 text-xs mt-1">Con {cita.medico_nombre || 'tu médico'}</p>
        <p className="text-gray-400 text-xs mt-1">{cita.duracion_minutos} min</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleAgregarCalendario}
          className="py-2.5 px-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          + Calendario
        </button>
        <button
          onClick={handleCancelar}
          disabled={!puedeCancelar}
          className="py-2.5 px-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40"
          style={{ borderColor: puedeCancelar ? '#fee2e2' : '#e5e7eb', color: puedeCancelar ? '#b91c1c' : '#9ca3af', backgroundColor: puedeCancelar ? '#fef2f2' : '#fff' }}
          title={puedeCancelar ? 'Cancelar' : 'No se puede cancelar con menos de 24h'}
        >
          Cancelar
        </button>
      </div>
    </Card>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  SECCIÓN: Mi evolución (galería antes/después)
// ═══════════════════════════════════════════════════════════════════
function SeccionEvolucion({ brand, fotosEvolucion }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={Activity} brand={brand} title="Mi evolución" inline />
        <button
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ backgroundColor: brand + '20', color: brand }}
          onClick={() => alert('Próximamente: subir foto desde la cámara.')}
        >
          + Subir foto
        </button>
      </div>

      {fotosEvolucion.length === 0 ? (
        <p className="text-gray-400 text-xs leading-relaxed">
          Aún no tienes fotos de evolución. Cuando comiences un tratamiento, tu médico subirá
          fotos de antes y después para que veas tu progreso.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {fotosEvolucion.slice(0, 9).map((f, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase text-white"
                    style={{ backgroundColor: brand + 'CC' }}>
                {f.tipo}
              </span>
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[8px] font-medium text-white bg-black/40">
                {f.fecha}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  SECCIÓN: Mis análisis dermoscópicos
// ═══════════════════════════════════════════════════════════════════
function SeccionAnalisis({ brand, slug, analisis, navigate }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={FileText} brand={brand} title="Mis análisis" inline />
        <button
          onClick={() => navigate(`/clinica/${slug}/analisis`)}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ backgroundColor: brand + '20', color: brand }}
        >
          + Nuevo
        </button>
      </div>

      {analisis.length === 0 ? (
        <p className="text-gray-400 text-xs leading-relaxed">
          Aún no tienes análisis. Cuando completes uno, aparecerá aquí con tu puntuación y nivel de riesgo.
        </p>
      ) : (
        <div className="space-y-2">
          {analisis.slice(0, 5).map(a => {
            const nivel = (a.nivel_riesgo ?? a.nivel ?? 'bajo').toLowerCase()
            const rs    = RIESGO_STYLE[nivel] ?? RIESGO_STYLE.bajo
            const punt  = a.puntuacion_total ?? a.puntuacion ?? 0
            return (
              <button
                key={a.id}
                onClick={() => alert(`Ver informe completo del análisis ${a.id}\n(Próximamente)`)}
                className="w-full bg-gray-50 rounded-xl p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
              >
                {a.imagen_url ? (
                  <img src={a.imagen_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-xs font-semibold">
                    {dateOnly(a.fecha)}
                  </p>
                  <p className="text-gray-500 text-[11px]">
                    Puntuación <strong>{punt}/9</strong>
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rs.bg, color: rs.text }}>
                  {rs.label}
                </span>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  SECCIÓN: Mi protocolo activo
// ═══════════════════════════════════════════════════════════════════
function SeccionProtocolo({ brand, protocolo, setProtocolo }) {
  if (!protocolo) {
    return (
      <Card>
        <SectionTitle icon={Pill} brand={brand} title="Mi protocolo" />
        <p className="text-gray-400 text-xs leading-relaxed">
          Tu médico aún no te ha asignado un protocolo. Cuando lo haga, verás aquí los pasos a
          seguir y los productos recomendados.
        </p>
      </Card>
    )
  }

  const pasos = Array.isArray(protocolo.pasos) ? protocolo.pasos : []
  const productos = Array.isArray(protocolo.productos) ? protocolo.productos : []
  const completados = pasos.filter(p => p.completado).length
  const progreso = pasos.length > 0 ? Math.round((completados / pasos.length) * 100) : 0

  async function togglePaso(idx) {
    const nuevos = pasos.map((p, i) =>
      i === idx
        ? { ...p, completado: !p.completado, fecha_completado: !p.completado ? new Date().toISOString() : null }
        : p
    )
    setProtocolo({ ...protocolo, pasos: nuevos })
    if (supabase) {
      await supabase.from('protocolos').update({ pasos: nuevos, actualizado_en: new Date().toISOString() }).eq('id', protocolo.id)
    }
  }

  return (
    <Card>
      <SectionTitle icon={Pill} brand={brand} title={protocolo.nombre || 'Mi protocolo'} />
      {protocolo.descripcion && (
        <p className="text-gray-500 text-xs mb-3 leading-relaxed">{protocolo.descripcion}</p>
      )}

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Progreso esta semana</span>
          <span className="font-semibold" style={{ color: brand }}>{completados}/{pasos.length} pasos</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
               style={{ width: `${progreso}%`, backgroundColor: brand }} />
        </div>
      </div>

      {/* Lista de pasos con checkboxes */}
      <div className="space-y-1.5 mb-4">
        {pasos.map((p, i) => (
          <button
            key={p.id ?? i}
            onClick={() => togglePaso(i)}
            className="w-full flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center"
                 style={{ borderColor: p.completado ? brand : '#d1d5db', backgroundColor: p.completado ? brand : '#fff' }}>
              {p.completado && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${p.completado ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {p.texto}
              </p>
              {p.frecuencia && (
                <p className="text-[10px] text-gray-400 mt-0.5">{p.frecuencia}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Productos recomendados */}
      {productos.length > 0 && (
        <div>
          <p className="text-gray-700 text-xs font-semibold mb-2">Productos recomendados</p>
          <div className="space-y-2">
            {productos.map((prod, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                {prod.foto_url ? (
                  <img src={prod.foto_url} alt={prod.nombre} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Sparkles size={16} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {prod.marca && (
                    <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">{prod.marca}</p>
                  )}
                  <p className="text-gray-900 text-xs font-semibold truncate">{prod.nombre}</p>
                  {prod.descripcion && (
                    <p className="text-gray-500 text-[10px] truncate">{prod.descripcion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  SECCIÓN: Mis datos personales — formulario editable
// ═══════════════════════════════════════════════════════════════════
function SeccionDatos({ brand, paciente, setPaciente }) {
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [draft, setDraft] = useState({})

  function startEdit() {
    setDraft({
      telefono:        paciente?.telefono     ?? '',
      ciudad:          paciente?.ciudad       ?? '',
      tipo_piel:       paciente?.tipo_piel    ?? '',
      alergias:        paciente?.alergias     ?? '',
      medicamentos:    paciente?.medicamentos ?? '',
      motivo_consulta: paciente?.motivo_consulta ?? '',
    })
    setEditando(true)
  }

  async function handleGuardar() {
    if (!supabase || !paciente?.id) return
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('pacientes')
        .update(draft)
        .eq('id', paciente.id)
      if (error) throw error
      setPaciente(p => ({ ...p, ...draft }))
      setEditando(false)
    } catch (err) {
      alert('Error guardando: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  function handleCambiarPassword() {
    const nueva = prompt('Nueva contraseña (mínimo 8 caracteres):')
    if (!nueva) return
    if (nueva.length < 8) return alert('La contraseña debe tener al menos 8 caracteres.')
    if (!supabase) return alert('Modo demo: no se puede cambiar la contraseña.')
    supabase.auth.updateUser({ password: nueva })
      .then(({ error }) => alert(error ? 'Error: ' + error.message : 'Contraseña actualizada.'))
  }

  async function handleEliminar() {
    if (!confirm('¿Eliminar tu cuenta permanentemente? Esto borrará tu historial completo. No se puede deshacer.')) return
    if (!confirm('Confirma una vez más: ¿eliminar cuenta y todos los datos asociados (RGPD)?')) return
    alert('La eliminación de cuentas debe gestionarla tu clínica para cumplir con auditoría RGPD. Contacta con ellos.')
  }

  if (!editando) {
    return (
      <Card id="seccion-datos">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={UserIcon} brand={brand} title="Mis datos" inline />
          <button
            onClick={startEdit}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
            style={{ backgroundColor: brand + '20', color: brand }}
          >
            <Pencil size={11} /> Editar
          </button>
        </div>

        <div className="space-y-1.5">
          <Row label="Email"          value={paciente?.email} />
          <Row label="WhatsApp"       value={paciente?.telefono} />
          <Row label="Ciudad"         value={paciente?.ciudad} />
          <Row label="Fecha nac."     value={paciente?.fecha_nacimiento} />
          <Row label="Tipo de piel"   value={paciente?.tipo_piel} />
          <Row label="Alergias"       value={paciente?.alergias} />
          <Row label="Medicamentos"   value={paciente?.medicamentos} />
          <Row label="Motivo"         value={paciente?.motivo_consulta} multiline />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <button
            onClick={handleCambiarPassword}
            className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Lock size={12} /> Cambiar contraseña
          </button>
          <button
            onClick={handleEliminar}
            className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
          >
            <AlertTriangle size={12} /> Eliminar mi cuenta
          </button>
        </div>
      </Card>
    )
  }

  // Modo edición
  return (
    <Card id="seccion-datos">
      <SectionTitle icon={UserIcon} brand={brand} title="Editar mis datos" />

      <div className="space-y-3 mt-3">
        <EditField label="WhatsApp" value={draft.telefono} onChange={v => setDraft({ ...draft, telefono: v })} />
        <EditField label="Ciudad"   value={draft.ciudad}   onChange={v => setDraft({ ...draft, ciudad: v })} />

        <div>
          <label className="text-gray-600 text-xs font-medium block mb-1">Tipo de piel</label>
          <div className="grid grid-cols-5 gap-1.5">
            {TIPOS_PIEL.map(tp => (
              <button
                key={tp} type="button"
                onClick={() => setDraft({ ...draft, tipo_piel: tp })}
                className="py-2 rounded-lg text-[10px] font-semibold border transition-all active:scale-95"
                style={draft.tipo_piel === tp
                  ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>

        <EditField label="Alergias"      value={draft.alergias}     onChange={v => setDraft({ ...draft, alergias: v })}     multiline />
        <EditField label="Medicamentos"  value={draft.medicamentos} onChange={v => setDraft({ ...draft, medicamentos: v })} multiline />
        <EditField label="Motivo de consulta" value={draft.motivo_consulta} onChange={v => setDraft({ ...draft, motivo_consulta: v })} multiline />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => setEditando(false)}
          disabled={guardando}
          className="py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
          style={{ backgroundColor: brand }}
        >
          <Save size={12} /> {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Card>
  )
}


// ═══════════════════════════════════════════════════════════════════
//  COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════
function Card({ children, id }) {
  return (
    <div id={id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, brand, title, inline }) {
  return (
    <p className={`text-gray-900 font-semibold text-sm flex items-center gap-2 ${inline ? '' : 'mb-2'}`}>
      <Icon size={14} style={{ color: brand }} /> {title}
    </p>
  )
}

function Row({ label, value, multiline }) {
  if (!value) return null
  return (
    <div className={`flex ${multiline ? 'flex-col' : 'justify-between'} gap-1 text-xs`}>
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-700 font-medium ${multiline ? '' : 'text-right truncate'}`}>{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange, multiline }) {
  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-400'
  return (
    <div>
      <label className="text-gray-600 text-xs font-medium block mb-1">{label}</label>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2}
                  className={`${inputCls} resize-none`} />
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)}
               className={inputCls} />
      )}
    </div>
  )
}
