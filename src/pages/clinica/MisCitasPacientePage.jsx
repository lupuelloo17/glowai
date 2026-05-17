import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, Clock, ChevronLeft, Plus, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'
import SolicitarCitaDrawer from '../../components/SolicitarCitaDrawer'

const ESTADO_BADGE = {
  pendiente:  { bg: '#fef9c3', text: '#a16207', label: 'Pendiente'   },
  confirmada: { bg: '#dcfce7', text: '#15803d', label: 'Confirmada'  },
  completada: { bg: '#dbeafe', text: '#1d4ed8', label: 'Completada'  },
  cancelada:  { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelada'   },
  no_asistio: { bg: '#f3f4f6', text: '#6b7280', label: 'No asistió'  },
}

function fmtFechaHora(d) {
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  const fecha = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora  = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fecha} · ${hora}`
}

export default function MisCitasPacientePage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { user } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [citas, setCitas]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function recargar() {
    if (!supabase || !user?.id) { setCargando(false); return }
    setCargando(true)
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false })
    if (!error) setCitas(data || [])
    setCargando(false)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supabase || !user?.id) { setCargando(false); return }
      const { data } = await supabase
        .from('citas')
        .select('*')
        .eq('paciente_id', user.id)
        .order('fecha', { ascending: false })
      if (!cancelled) {
        setCitas(data || [])
        setCargando(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // Separar próximas vs histórico
  const { proximas, historico } = useMemo(() => {
    const ahora = new Date()
    const prox  = []
    const hist  = []
    for (const c of citas) {
      const f = new Date(c.fecha)
      if (f > ahora && c.estado !== 'cancelada' && c.estado !== 'completada') {
        prox.push(c)
      } else {
        hist.push(c)
      }
    }
    prox.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    return { proximas: prox, historico: hist }
  }, [citas])

  async function handleCancelar(cita) {
    const horasRestantes = (new Date(cita.fecha) - new Date()) / 36e5
    if (horasRestantes < 24) {
      alert('No se puede cancelar con menos de 24 horas de antelación. Contacta con tu clínica.')
      return
    }
    if (!confirm(`¿Cancelar la cita de ${cita.tratamiento}? La clínica recibirá la notificación.`)) return
    if (!supabase) return alert('Modo demo: sin Supabase configurado')
    const { error } = await supabase
      .from('citas')
      .update({ estado: 'cancelada' })
      .eq('id', cita.id)
    if (error) return alert('Error: ' + error.message)
    recargar()
  }

  return (
    <ClinicLayout>
      <div className="animate-fade-in">
        <div className="bg-white px-5 pt-6 pb-5 border-b border-gray-100">
          <button
            onClick={() => navigate(`/clinica/${slug}/mi-perfil`)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-3"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <h1 className="text-gray-900 font-bold text-xl">Mis citas</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {citas.length} {citas.length === 1 ? 'cita registrada' : 'citas registradas'}
          </p>
        </div>

        <div className="px-5 py-5 space-y-5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: brand }}
          >
            <Plus size={16} /> Solicitar nueva cita
          </button>

          {cargando && (
            <p className="text-center text-gray-400 text-sm py-4">Cargando citas…</p>
          )}

          {!cargando && (
            <Section title="Próximas" brand={brand} icon={CalendarDays}>
              {proximas.length === 0 ? (
                <EmptyState text="No tienes citas próximas. Pulsa 'Solicitar nueva cita' para reservar." />
              ) : (
                proximas.map(c => (
                  <CitaCard
                    key={c.id}
                    cita={c}
                    brand={brand}
                    onCancelar={() => handleCancelar(c)}
                  />
                ))
              )}
            </Section>
          )}

          {!cargando && historico.length > 0 && (
            <Section title="Histórico" brand={brand} icon={Clock}>
              {historico.map(c => (
                <CitaCard key={c.id} cita={c} brand={brand} compacta />
              ))}
            </Section>
          )}
        </div>
      </div>

      {drawerOpen && (
        <SolicitarCitaDrawer
          onClose={() => setDrawerOpen(false)}
          onGuardado={() => recargar()}
        />
      )}
    </ClinicLayout>
  )
}

function Section({ title, brand, icon: Icon, children }) {
  return (
    <div>
      <p className="text-gray-800 font-semibold text-sm mb-2 flex items-center gap-2">
        <Icon size={14} style={{ color: brand }} /> {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function CitaCard({ cita, brand, compacta, onCancelar }) {
  const estado = ESTADO_BADGE[cita.estado] || ESTADO_BADGE.pendiente
  const f = new Date(cita.fecha)
  const horasRestantes = (f - new Date()) / 36e5

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border"
      style={{
        borderColor: compacta ? '#f3f4f6' : '#e5e7eb',
        borderLeftWidth: compacta ? '1px' : '4px',
        borderLeftColor: compacta ? '#f3f4f6' : brand,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-bold ${compacta ? 'text-gray-600' : 'text-gray-900'}`}>
          {cita.tratamiento}
        </p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: estado.bg, color: estado.text }}>
          {estado.label}
        </span>
      </div>
      <p className="text-gray-600 text-xs flex items-center gap-1.5 capitalize">
        <Clock size={11} className="text-gray-400" /> {fmtFechaHora(f)}
      </p>
      {cita.duracion_minutos && (
        <p className="text-gray-400 text-[11px] mt-0.5">{cita.duracion_minutos} min</p>
      )}
      {cita.notas_previas && !compacta && (
        <p className="text-gray-500 text-[11px] mt-2 leading-relaxed bg-gray-50 rounded-lg px-2.5 py-1.5">
          {cita.notas_previas}
        </p>
      )}

      {!compacta && cita.estado === 'pendiente' && (
        <div className="mt-3 flex items-center gap-2 text-amber-600 text-[11px]">
          <AlertCircle size={11} />
          <span>Pendiente de confirmación por la clínica</span>
        </div>
      )}

      {!compacta && onCancelar && (cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
        <button
          onClick={onCancelar}
          disabled={horasRestantes < 24}
          className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title={horasRestantes < 24 ? 'No se puede cancelar con <24h' : 'Cancelar cita'}
        >
          Cancelar cita
        </button>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 text-center">
      <p className="text-gray-400 text-xs leading-relaxed">{text}</p>
    </div>
  )
}
