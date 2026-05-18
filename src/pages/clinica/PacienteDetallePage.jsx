import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, AlertCircle, BellOff } from 'lucide-react'
import { useClinic } from '../../contexts/ClinicContext'
import FeatureGate from '../../components/FeatureGate'
import ClinicLayout from './ClinicLayout'
import PACIENTES, { SESIONES_DB, ANALISIS_DB } from '../../data/pacientes'
import { supabase } from '../../lib/supabase'
import NuevaSesionDrawer from '../../components/NuevaSesionDrawer'
import { formatFecha } from '../../utils/fecha'
import EvolucionPage from './EvolucionPage'

const RIESGO_STYLE = {
  bajo:     { bg: '#dcfce7', text: '#15803d' },
  moderado: { bg: '#fef9c3', text: '#a16207' },
  alto:     { bg: '#fee2e2', text: '#b91c1c' },
}

const TABS = ['Información', 'Sesiones', 'Análisis', 'Evolución']

export default function PacienteDetallePage() {
  const navigate     = useNavigate()
  // ── FIX 1: leer `id` de la URL ──────────────────────────────────────────
  const { slug, id } = useParams()
  const { clinica }  = useClinic()
  const brand        = clinica?.color_primario ?? '#C8A882'

  const [tab,      setTab]      = useState(0)
  const [paciente, setPaciente] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [analisis, setAnalisis] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nuevaSesionAbierta, setNuevaSesionAbierta] = useState(false)

  useEffect(() => {
    // ── BUG FIX A: reset state immediately when id changes ───────────
    // Without this, navigating p1 → p2 keeps p1 data while p2 loads
    setPaciente(null)
    setSesiones([])
    setAnalisis([])
    setTab(0)

    if (!id) { setCargando(false); return }

    if (supabase) {
      // ── Supabase mode: fetch real data by UUID ─────────────────────
      setCargando(true)
      Promise.all([
        supabase.from('pacientes').select('*').eq('id', id).single(),
        supabase.from('sesiones').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
        supabase.from('analisis_dermoscopicos').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
      ]).then(([{ data: p, error: pe }, { data: s }, { data: a }]) => {
        if (pe) {
          // ── BUG FIX B: Supabase failed (RLS / not found) → try static ──
          console.warn('[PacienteDetalle] Supabase error, falling back to static:', pe.message)
          const staticP = PACIENTES.find(sp => sp.id === id) ?? null
          setPaciente(staticP)
          setSesiones(SESIONES_DB[id] ?? [])
          setAnalisis(ANALISIS_DB[id] ?? [])
        } else {
          // ── BUG FIX C: normalize Supabase session field names ─────────
          // DB uses tipo_tratamiento / notas_clinicas; UI reads tratamiento / nota
          const normSesiones = (s ?? []).map(row => ({
            ...row,
            tratamiento: row.tipo_tratamiento ?? row.tratamiento,
            nota:        row.notas_clinicas   ?? row.nota,
            medico:      row.medico           ?? 'Dra. García',
            fecha:       row.fecha
              ? new Date(row.fecha).toLocaleDateString('es-ES')
              : row.fecha,
          }))
          const normAnalisis = (a ?? []).map(row => ({
            ...row,
            nivel:         row.nivel_riesgo    ?? row.nivel,
            puntuacion:    row.puntuacion_total ?? row.puntuacion,
            criterios_pos: row.criterios_pos   ?? 0,
            fecha:         row.fecha
              ? new Date(row.fecha).toLocaleDateString('es-ES')
              : row.fecha,
          }))
          setPaciente(p)
          setSesiones(normSesiones)
          setAnalisis(normAnalisis)
        }
        setCargando(false)
      })
    } else {
      // ── Mock mode: look up in static data ─────────────────────────
      setPaciente(PACIENTES.find(p => p.id === id) ?? null)
      setSesiones(SESIONES_DB[id] ?? [])
      setAnalisis(ANALISIS_DB[id] ?? [])
      setCargando(false)
    }
  }, [id])

  if (cargando && !paciente) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">Cargando…</p>
        </div>
      </ClinicLayout>
    )
  }

  // ── FIX 3: pantalla de error si el id no existe ──────────────────────────
  if (!paciente) {
    return (
      <ClinicLayout>
        <div className="flex flex-col items-center justify-center h-64 px-5 text-center">
          <AlertCircle size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold text-sm">Paciente no encontrado</p>
          <p className="text-gray-400 text-xs mt-1 mb-4">ID: {id}</p>
          <button
            onClick={() => navigate(`/clinica/${slug}/pacientes`)}
            className="text-sm font-semibold underline"
            style={{ color: brand }}
          >
            Volver a la lista
          </button>
        </div>
      </ClinicLayout>
    )
  }

  const alergiasDestacadas = paciente.alergias &&
    !paciente.alergias.toLowerCase().includes('ninguna')

  return (
    <ClinicLayout>
      <div className="animate-fade-in">

        {/* Header */}
        <div className="bg-white px-5 pt-7 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(`/clinica/${slug}/pacientes`)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-gray-900 font-bold text-base leading-tight truncate">
                {paciente.nombre} {paciente.apellido}
              </h1>
              <p className="text-gray-400 text-xs">
                {paciente.edad ? `${paciente.edad} años · ` : ''}{paciente.medico ?? 'Dra. García'}
              </p>
            </div>
            {/* Marketing badge */}
            {!paciente.marketing_aceptado && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0"
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                title="Sin consentimiento de marketing"
              >
                <BellOff size={11} /> Sin marketing
              </div>
            )}
          </div>

          {/* Avatar + quick stats */}
          <div className="flex items-center gap-4">
            {paciente.foto_perfil
              ? <img src={paciente.foto_perfil} alt={paciente.nombre} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
              : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ backgroundColor: brand }}
                >
                  {paciente.nombre[0]}{paciente.apellido?.[0] ?? ''}
                </div>
              )
            }
            <div className="flex gap-4">
              {[
                { label: 'Visitas',   value: paciente.total_visitas },
                { label: 'Análisis',  value: analisis.length },
                { label: 'Tipo piel', value: paciente.tipo_piel ?? '—' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-gray-900 font-bold text-base">{s.value}</p>
                  <p className="text-gray-400 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-100 flex">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="flex-1 py-3 text-xs font-semibold border-b-2 transition-colors"
              style={tab === i
                ? { borderBottomColor: brand, color: brand }
                : { borderBottomColor: 'transparent', color: '#9ca3af' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 px-5 py-4 space-y-3">

          {/* ── Tab 0: Info ── */}
          {tab === 0 && (
            <>
              {/* Alergias destacadas en amarillo */}
              {alergiasDestacadas && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-700 text-xs font-semibold">Alerta de alergias</p>
                    <p className="text-amber-600 text-xs mt-0.5">{paciente.alergias}</p>
                  </div>
                </div>
              )}

              {/* Marketing warning */}
              {!paciente.marketing_aceptado && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <BellOff size={14} className="text-gray-400 flex-shrink-0" />
                  <p className="text-gray-500 text-xs">
                    Esta paciente <strong>no ha dado consentimiento de marketing</strong>. No enviar comunicaciones comerciales.
                  </p>
                </div>
              )}

              {/* Contacto */}
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-gray-900 font-semibold text-sm">Datos de contacto</p>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-gray-700 text-sm">{paciente.email}</span>
                </div>
                {paciente.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-gray-700 text-sm">{paciente.telefono}</span>
                  </div>
                )}
              </div>

              {/* Ficha clínica */}
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
                <p className="text-gray-900 font-semibold text-sm">Ficha clínica</p>
                {[
                  { label: 'Tipo de piel',   value: paciente.tipo_piel  ?? '—' },
                  { label: 'Alergias',
                    value: (
                      <span style={{ color: alergiasDestacadas ? '#d97706' : undefined }}>
                        {paciente.alergias ?? '—'}
                      </span>
                    )
                  },
                  { label: 'Medicamentos',   value: paciente.medicamentos ?? '—' },
                  { label: 'Motivo',         value: paciente.motivo_consulta ?? '—' },
                  { label: 'Cómo nos conoció', value: paciente.como_nos_conocio ?? '—' },
                  { label: 'Riesgo',
                    value: (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ backgroundColor: RIESGO_STYLE[paciente.riesgo]?.bg, color: RIESGO_STYLE[paciente.riesgo]?.text }}
                      >
                        {paciente.riesgo}
                      </span>
                    )
                  },
                  { label: 'Paciente desde', value: formatFecha(paciente.creado_en) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 text-xs flex-shrink-0">{label}</span>
                    <span className="text-gray-800 text-xs font-semibold text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Tratamientos previos */}
              {paciente.tratamientos_previos?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-gray-900 font-semibold text-sm mb-2">Tratamientos previos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {paciente.tratamientos_previos.map(t => (
                      <span
                        key={t}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: brand + '18', color: brand }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tab 1: Sesiones ── */}
          {tab === 1 && (
            <div className="space-y-2">
              {sesiones.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Sin sesiones registradas</p>
              )}
              {sesiones.map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-gray-900 text-sm font-semibold">{s.tratamiento}</p>
                    <span className="text-gray-400 text-[10px] flex-shrink-0">{s.fecha}</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-1">{s.medico}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">{s.nota}</p>
                </div>
              ))}
              <button
                onClick={() => setNuevaSesionAbierta(true)}
                className="w-full bg-white border border-dashed text-xs font-semibold py-3 rounded-2xl transition-colors active:scale-[0.99]"
                style={{ borderColor: brand, color: brand }}
              >
                + Nueva sesión
              </button>
            </div>
          )}

          {/* ── Tab 3: Evolución (fotos antes/después) ── */}
          {tab === 3 && (
            <EvolucionPage
              pacienteIdProp={id}
              readOnly={false}
            />
          )}

          {/* ── Tab 2: Análisis ── */}
          {tab === 2 && (
            <FeatureGate feature="dermoscopia_ia">
              <div className="space-y-2">
                {analisis.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-8">Sin análisis registrados</p>
                )}
                {analisis.map(a => {
                  const rs = RIESGO_STYLE[a.nivel]
                  return (
                    <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-xs">{a.fecha}</p>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ backgroundColor: rs.bg, color: rs.text }}
                        >
                          Riesgo {a.nivel}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-gray-900 text-2xl font-bold">{a.puntuacion}</p>
                          <p className="text-gray-400 text-[10px]">/ 9 pts</p>
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(a.puntuacion / 9) * 100}%`, backgroundColor: rs.text }}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 text-sm font-semibold">{a.criterios_pos}</p>
                          <p className="text-gray-400 text-[10px]">criterios +</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={() => navigate(`/clinica/${slug}/analisis`)}
                  className="w-full text-xs font-semibold py-3 rounded-2xl border border-dashed border-gray-200 text-gray-400"
                >
                  + Nuevo análisis dermoscópico
                </button>
              </div>
            </FeatureGate>
          )}
        </div>
      </div>

      {nuevaSesionAbierta && (
        <NuevaSesionDrawer
          pacienteId={id}
          onClose={() => setNuevaSesionAbierta(false)}
          onGuardado={(nueva) => {
            // Añade la sesión al principio (más reciente primero) y cambia a la pestaña Sesiones
            setSesiones(prev => [nueva, ...prev])
            setTab(1)
          }}
        />
      )}
    </ClinicLayout>
  )
}
