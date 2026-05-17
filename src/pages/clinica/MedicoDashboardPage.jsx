import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, CalendarDays, LogOut, Microscope, CheckCircle2, Play } from 'lucide-react'
import { useClinic } from '../../contexts/ClinicContext'
import { useAuth } from '../../contexts/AuthContext'
import { useCitas, ESTADO_STYLE } from '../../contexts/CitasContext'
import FeatureGate from '../../components/FeatureGate'
import ClinicLayout from './ClinicLayout'
import { fTime } from '../../services/recordatorios'
import { supabase } from '../../lib/supabase'
import { formatFecha } from '../../utils/fecha'

const RIESGO_STYLE = {
  bajo:     { bg: '#dcfce7', text: '#15803d' },
  moderado: { bg: '#fef9c3', text: '#a16207' },
  alto:     { bg: '#fee2e2', text: '#b91c1c' },
}

export default function MedicoDashboardPage() {
  const navigate  = useNavigate()
  const { slug }  = useParams()
  const { clinica } = useClinic()
  const { user, logout } = useAuth()
  const { citas } = useCitas()
  const brand = clinica?.color_primario ?? '#C8A882'

  const todayDate = new Date()
  const today = todayDate.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const citasHoy = useMemo(() =>
    citas
      .filter(c => {
        const f = c.fecha instanceof Date ? c.fecha : new Date(c.fecha)
        return f.getFullYear() === todayDate.getFullYear() &&
               f.getMonth()    === todayDate.getMonth()    &&
               f.getDate()     === todayDate.getDate()
      })
      .sort((a, b) => {
        const fa = a.fecha instanceof Date ? a.fecha : new Date(a.fecha)
        const fb = b.fecha instanceof Date ? b.fecha : new Date(b.fecha)
        return fa - fb
      }),
    [citas]
  )

  // Pacientes asignados al médico actual — cargados desde Supabase.
  // La RLS garantiza que solo devuelve filas donde medico_id = auth.uid().
  const [myPatients, setMyPatients] = useState([])
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('pacientes')
      .select('id, nombre, apellido, foto_perfil, total_visitas, ultima_visita, riesgo')
      .then(({ data }) => {
        if (data) setMyPatients(data.map(p => ({
          id:            p.id,
          nombre:        `${p.nombre} ${p.apellido}`,
          foto:          p.foto_perfil ?? null,
          sesiones:      p.total_visitas ?? 0,
          ultima_sesion: formatFecha(p.ultima_visita),
          riesgo:        p.riesgo ?? 'bajo',
        })))
      })
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <ClinicLayout>
      <div className="animate-fade-in">
        {/* ── Header ── */}
        <div className="bg-white px-5 pt-7 pb-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Doctor photo */}
              {user?.foto
                ? <img src={user.foto} alt={user.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: brand }}
                  >
                    {user?.nombre?.[0] ?? 'D'}
                  </div>
                )
              }
              <div>
                <p className="text-gray-400 text-xs font-medium">{clinica?.nombre}</p>
                <h1 className="text-gray-900 font-bold text-lg leading-tight">
                  {user?.nombre ?? 'Doctora'}
                </h1>
                <p className="text-gray-400 text-xs">{user?.especialidad ?? 'Medicina Estética'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Today date */}
          <p className="text-gray-400 text-xs mt-3 capitalize">{today}</p>
        </div>

        <div className="bg-gray-50 px-5 py-4 space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Mis pacientes', value: myPatients.length },
              { label: 'Citas hoy',     value: citasHoy.length },
              { label: 'Pendientes',    value: citasHoy.filter(a => a.estado === 'pendiente').length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-gray-900 text-2xl font-bold">{value}</p>
                <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Today's appointments — sección Hoy */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-900 font-semibold text-sm flex items-center gap-2">
                <CalendarDays size={14} className="text-gray-400" />
                Hoy
              </p>
              <button
                onClick={() => navigate(`/clinica/${slug}/agenda`)}
                className="text-xs font-semibold flex items-center gap-0.5"
                style={{ color: brand }}
              >
                Ver agenda <ChevronRight size={12} />
              </button>
            </div>

            {citasHoy.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">Sin citas para hoy</p>
            ) : (
              <div className="space-y-2">
                {citasHoy.map(cita => {
                  const f = cita.fecha instanceof Date ? cita.fecha : new Date(cita.fecha)
                  const s = ESTADO_STYLE[cita.estado]
                  const completada = cita.estado === 'completada'
                  return (
                    <div
                      key={cita.id}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl border"
                      style={{ borderColor: completada ? '#f3f4f6' : s.border, backgroundColor: completada ? '#fafafa' : s.bg + '40' }}
                    >
                      {/* Hora */}
                      <div
                        className="w-12 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: completada ? '#e5e7eb' : brand, color: '#fff' }}
                      >
                        {fTime(f)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${completada ? 'text-gray-400' : 'text-gray-900'}`}>
                          {cita.paciente_nombre}
                        </p>
                        <p className="text-gray-400 text-xs truncate">{cita.tratamiento}</p>
                      </div>

                      {/* Estado + acción */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {completada
                          ? <CheckCircle2 size={16} className="text-green-500" />
                          : (
                            <button
                              onClick={() => navigate(`/clinica/${slug}/paciente/${cita.paciente_id}`)}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-all active:scale-95"
                              style={{ backgroundColor: brand, color: '#fff' }}
                              title="Iniciar sesión"
                            >
                              <Play size={9} /> Iniciar
                            </button>
                          )
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* My patients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-900 font-semibold text-sm">Mis pacientes</p>
              <button
                onClick={() => navigate(`/clinica/${slug}/pacientes`)}
                className="text-xs font-semibold flex items-center gap-0.5"
                style={{ color: brand }}
              >
                Ver todos <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {myPatients.map(p => {
                const rs = RIESGO_STYLE[p.riesgo]
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/clinica/${slug}/paciente/${p.id}`)}
                    className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm text-left active:scale-95 transition-transform"
                  >
                    {p.foto ? (
                      <img
                        src={p.foto}
                        alt={p.nombre}
                        className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: brand }}
                      >
                        {p.nombre.split(' ').map(s => s[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-semibold truncate">{p.nombre}</p>
                      <p className="text-gray-400 text-xs">{p.sesiones} sesiones · {p.ultima_sesion}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                      style={{ backgroundColor: rs.bg, color: rs.text }}
                    >
                      {p.riesgo}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* New analysis CTA */}
          <FeatureGate feature="dermoscopia_ia">
            <button
              onClick={() => navigate('/dermoscopia')}
              className="w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors active:scale-95"
              style={{ borderColor: brand, color: brand }}
            >
              <Microscope size={16} />
              Iniciar análisis dermoscópico
            </button>
          </FeatureGate>
        </div>
      </div>
    </ClinicLayout>
  )
}
