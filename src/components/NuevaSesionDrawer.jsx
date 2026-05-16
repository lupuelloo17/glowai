import { useState } from 'react'
import { X, Calendar, Pencil, FileText, Stethoscope } from 'lucide-react'
import { useClinic } from '../contexts/ClinicContext'
import { useAuth } from '../contexts/AuthContext'
import { TRATAMIENTOS } from '../contexts/CitasContext'
import { supabase } from '../lib/supabase'

// Format YYYY-MM-DD for <input type="date"> default
function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Format ISO date to "DD/MM/YYYY" for display in the session list
function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// El ID de paciente puede ser un UUID real (Supabase) o un id estático del demo
// (ej. '1' para Ana). Solo intentamos persistir en Supabase si es UUID válido.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (s) => typeof s === 'string' && UUID_RE.test(s)

export default function NuevaSesionDrawer({ pacienteId, onClose, onGuardado }) {
  const { clinica } = useClinic()
  const { user }    = useAuth()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [tratamiento, setTratamiento] = useState('')
  const [fecha,       setFecha]       = useState(todayISO())
  const [nota,        setNota]        = useState('')

  const [errors,    setErrors]    = useState({})
  const [guardando, setGuardando] = useState(false)

  function validate() {
    const e = {}
    if (!tratamiento) e.tratamiento = 'Selecciona un tratamiento'
    if (!fecha)       e.fecha       = 'La fecha es obligatoria'
    return e
  }

  async function handleGuardar() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setGuardando(true)

    const medicoNombre = user?.nombre || 'Dra. García'

    try {
      // Solo persistimos en Supabase si tenemos cliente Y el pacienteId es UUID real.
      // Si es un id estático de demo (ej. '1'), guardamos solo en memoria.
      const puedeGuardarSupabase = supabase && isUuid(pacienteId) && isUuid(clinica?.id)

      if (puedeGuardarSupabase) {
        const payload = {
          paciente_id:      pacienteId,
          clinica_id:       clinica.id,
          medico_id:        isUuid(user?.id) ? user.id : null,
          tipo_tratamiento: tratamiento,
          fecha:            fecha,
          notas_clinicas:   nota.trim() || null,
        }
        const { data, error } = await supabase
          .from('sesiones')
          .insert(payload)
          .select()
          .single()
        if (error) throw error

        onGuardado({
          id:          data.id,
          tratamiento: data.tipo_tratamiento,
          fecha:       isoToDisplay(data.fecha),
          medico:      medicoNombre,
          nota:        data.notas_clinicas ?? '',
        })
      } else {
        // Mock / demo: solo en memoria, id local
        onGuardado({
          id:          's' + Date.now(),
          tratamiento,
          fecha:       isoToDisplay(fecha),
          medico:      medicoNombre,
          nota:        nota.trim(),
        })
      }
      onClose()
    } catch (err) {
      setErrors({ submit: err.message || 'Error al guardar la sesión' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 animate-slide-up shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-bold text-base">Nueva sesión</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={15} className="text-gray-500" />
            </button>
          </div>

          {/* Tratamiento */}
          <div className="mb-4">
            <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <Pencil size={12} /> Tratamiento
            </label>
            <select
              value={tratamiento}
              onChange={e => setTratamiento(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
            >
              <option value="">— Selecciona un tratamiento —</option>
              {TRATAMIENTOS.map(t => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            {errors.tratamiento && (
              <p className="text-red-500 text-[11px] mt-1">{errors.tratamiento}</p>
            )}
          </div>

          {/* Fecha */}
          <div className="mb-4">
            <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
            />
            {errors.fecha && (
              <p className="text-red-500 text-[11px] mt-1">{errors.fecha}</p>
            )}
          </div>

          {/* Médico (solo lectura) */}
          <div className="mb-4">
            <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <Stethoscope size={12} /> Médico
            </label>
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500">
              {user?.nombre || 'Dra. García'}
            </div>
          </div>

          {/* Notas */}
          <div className="mb-4">
            <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <FileText size={12} /> Notas clínicas
            </label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={4}
              placeholder="Observaciones de la sesión, parámetros, evolución…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
            />
          </div>

          {/* Error de submit (si hubo) */}
          {errors.submit && (
            <p className="text-red-500 text-xs mb-3">{errors.submit}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: brand }}
            >
              {guardando ? 'Guardando…' : 'Guardar sesión'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
