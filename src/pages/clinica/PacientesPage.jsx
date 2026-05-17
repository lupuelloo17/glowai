import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, Plus, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useClinic } from '../../contexts/ClinicContext'
import ClinicLayout from './ClinicLayout'
import NuevoPacienteDrawer from '../../components/NuevoPacienteDrawer'
import PACIENTES from '../../data/pacientes'
import { supabase } from '../../lib/supabase'
import { formatFecha } from '../../utils/fecha'

const RIESGO_STYLE = {
  bajo:     { bg: '#dcfce7', text: '#15803d' },
  moderado: { bg: '#fef9c3', text: '#a16207' },
  alto:     { bg: '#fee2e2', text: '#b91c1c' },
}

export default function PacientesPage() {
  const navigate    = useNavigate()
  const { slug }    = useParams()
  const { clinica } = useClinic()
  const brand       = clinica?.color_primario ?? '#C8A882'

  const [pacientes,  setPacientes]  = useState(PACIENTES)
  const [cargando,   setCargando]   = useState(false)
  const [query,      setQuery]      = useState('')
  const [filter,     setFilter]     = useState('todos')
  const [showDrawer, setShowDrawer] = useState(false)
  const [toast,      setToast]      = useState(null)

  // ── Cargar pacientes desde Supabase cuando esté disponible ──────
  useEffect(() => {
    if (!supabase || !clinica?.id || clinica._isMock) return
    setCargando(true)
    supabase
      .from('pacientes')
      .select('*')
      .eq('clinica_id', clinica.id)
      .order('creado_en', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length) setPacientes(data)
        setCargando(false)
      })
  }, [clinica?.id])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleGuardado(nuevo) {
    // Supabase returns the full record; mock returns our own shape.
    // Both contain the fields we need — just prepend to the list.
    setPacientes(prev => [nuevo, ...prev])
    showToast('Paciente añadido correctamente')
  }

  const filtered = pacientes.filter(p => {
    const matchQuery = `${p.nombre} ${p.apellido}`.toLowerCase().includes(query.toLowerCase())
    const matchRisk  = filter === 'todos' || p.riesgo === filter
    return matchQuery && matchRisk
  })

  return (
    <ClinicLayout>
      <div className="animate-fade-in">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg animate-fade-in">
            <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="bg-white px-5 pt-7 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-gray-900 font-bold text-lg">Pacientes</h1>
              <p className="text-gray-400 text-xs">{pacientes.length} registros · {clinica?.nombre}</p>
            </div>
            <button
              onClick={() => setShowDrawer(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform"
              style={{ backgroundColor: brand }}
              title="Nuevo paciente"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* Risk filter pills */}
        <div className="bg-white px-5 pb-3 flex gap-2 overflow-x-auto border-b border-gray-100">
          {['todos', 'bajo', 'moderado', 'alto'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-all"
              style={filter === f
                ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
              }
            >
              {f === 'todos' ? 'Todos' : `Riesgo ${f}`}
            </button>
          ))}
        </div>

        {/* Patient list */}
        <div className="bg-gray-50 px-5 py-3 space-y-2">
          {cargando && (
            <p className="text-center text-gray-400 text-sm py-10">Cargando pacientes…</p>
          )}
          {!cargando && filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">Sin resultados</p>
          )}
          {filtered.map(p => {
            const rStyle   = RIESGO_STYLE[p.riesgo] ?? RIESGO_STYLE.bajo
            const initials = `${p.nombre[0]}${p.apellido?.[0] ?? ''}`.toUpperCase()
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/clinica/${slug}/paciente/${p.id}`)}
                className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm text-left active:scale-95 transition-transform"
              >
                {p.foto_perfil
                  ? <img src={p.foto_perfil} alt={p.nombre} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: brand }}
                    >
                      {initials}
                    </div>
                  )
                }
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-semibold truncate">
                    {p.nombre} {p.apellido}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {p.tipo_piel ? `Piel ${p.tipo_piel.toLowerCase()} · ` : ''}{p.total_visitas} visitas
                  </p>
                  <p className="text-gray-300 text-[10px] mt-0.5">Última: {formatFecha(p.ultima_visita)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: rStyle.bg, color: rStyle.text }}
                  >
                    {p.riesgo}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {showDrawer && (
        <NuevoPacienteDrawer
          onClose={() => setShowDrawer(false)}
          onGuardado={handleGuardado}
        />
      )}
    </ClinicLayout>
  )
}
