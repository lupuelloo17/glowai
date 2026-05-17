import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Microscope, ChevronRight, AlertCircle, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'

const RIESGO_STYLE = {
  bajo:     { bg: '#dcfce7', text: '#15803d', label: 'Bajo',     icon: Shield },
  moderado: { bg: '#fef9c3', text: '#a16207', label: 'Moderado', icon: AlertCircle },
  alto:     { bg: '#fee2e2', text: '#b91c1c', label: 'Alto',     icon: AlertCircle },
}

const RIESGO_MENSAJE = {
  bajo:     'No se detectan signos de alarma. Revisión rutinaria recomendada.',
  moderado: 'Algunos criterios merecen atención. Consulta con tu médico en las próximas semanas.',
  alto:     'Se detectan criterios de alerta. Consulta dermatológica urgente recomendada.',
}

function fmtFecha(d) {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MisAnalisisPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { user } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [analisis,  setAnalisis]  = useState([])
  const [cargando,  setCargando]  = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supabase || !user?.id) { setCargando(false); return }
      const { data } = await supabase
        .from('analisis_dermoscopicos')
        .select('*')
        .eq('paciente_id', user.id)
        .order('fecha', { ascending: false })
      if (!cancelled) {
        setAnalisis(data || [])
        setCargando(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <ClinicLayout>
      <div className="animate-fade-in">
        <div className="px-5 pt-6 pb-5 border-b border-gray-100"
             style={{ background: `linear-gradient(180deg, ${brand}10 0%, transparent 100%)` }}>
          <h1 className="text-gray-900 font-bold text-xl flex items-center gap-2">
            <Microscope size={20} style={{ color: brand }} />
            Mis análisis
          </h1>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Tus análisis dermoscópicos personales. Solo tú y tu médico podéis verlos.
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          <button
            onClick={() => navigate(`/clinica/${slug}/dermoscopia`)}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: brand }}
          >
            <Microscope size={16} /> Hacer nuevo análisis
          </button>

          {cargando ? (
            <p className="text-center text-gray-400 text-sm py-4">Cargando…</p>
          ) : analisis.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
              <Microscope size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-700 font-semibold text-sm mb-1">Sin análisis aún</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Realiza tu primer análisis dermoscópico para ver aquí los resultados, la puntuación y las recomendaciones de tu médico.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-800 font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText size={14} style={{ color: brand }} /> Histórico
              </p>
              <div className="space-y-3">
                {analisis.map(a => {
                  const nivel = (a.nivel_riesgo ?? a.nivel ?? 'bajo').toLowerCase()
                  const rs    = RIESGO_STYLE[nivel] ?? RIESGO_STYLE.bajo
                  const Icono = rs.icon
                  const punt  = a.puntuacion_total ?? a.puntuacion ?? 0
                  return (
                    <button
                      key={a.id}
                      onClick={() => alert(`Informe completo del análisis del ${fmtFecha(a.fecha)}\n(Próximamente)`)}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border text-left transition-all active:scale-[0.99]"
                      style={{ borderColor: '#e5e7eb', borderLeftWidth: '4px', borderLeftColor: rs.text }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {a.imagen_url ? (
                          <img src={a.imagen_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={24} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-semibold">{fmtFecha(a.fecha)}</p>
                          <p className="text-gray-500 text-xs">Puntuación <strong>{punt}/9</strong> criterios positivos</p>
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                               style={{ backgroundColor: rs.bg, color: rs.text }}>
                            <Icono size={9} /> Riesgo {rs.label}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
                      </div>

                      {/* Mensaje según nivel */}
                      <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
                           style={{ backgroundColor: rs.bg + '50', color: rs.text }}>
                        {RIESGO_MENSAJE[nivel]}
                      </div>

                      {a.compartido_medico && (
                        <p className="text-gray-400 text-[10px] mt-2 flex items-center gap-1">
                          ✓ Compartido con tu médico
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Aviso de privacidad */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
            <Shield size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-[10px] leading-relaxed">
              Tus análisis son privados. Solo tú y el médico que te tiene asignado pueden verlos. Otros miembros de la clínica (excepto admin) no tienen acceso.
            </p>
          </div>
        </div>
      </div>
    </ClinicLayout>
  )
}
