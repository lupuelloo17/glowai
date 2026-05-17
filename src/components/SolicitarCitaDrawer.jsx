import { useEffect, useState } from 'react'
import { X, Clock, Euro, Calendar, FileText, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useClinic } from '../contexts/ClinicContext'
import { supabase } from '../lib/supabase'
import { TRATAMIENTOS as FALLBACK_TRATAMIENTOS } from '../contexts/CitasContext'

// Devuelve YYYY-MM-DDTHH:MM (formato datetime-local) para "mañana 10:00"
function defaultDateTime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function SolicitarCitaDrawer({ onClose, onGuardado }) {
  const { user } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [tratamientos, setTratamientos] = useState([])
  const [cargando,     setCargando]     = useState(true)

  const [seleccionado, setSeleccionado] = useState(null) // objeto tratamiento
  const [fecha,        setFecha]        = useState(defaultDateTime())
  const [notas,        setNotas]        = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error,    setError]    = useState(null)

  // Cargar catálogo de tratamientos desde Supabase (con fallback al mock)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase || !clinica?.id) {
        setTratamientos(FALLBACK_TRATAMIENTOS
          .filter(t => t.label !== 'Otro')
          .map((t, i) => ({ id: `mock-${i}`, nombre: t.label, duracion_minutos: t.duracion, precio: t.precio }))
        )
        setCargando(false)
        return
      }
      const { data, error } = await supabase
        .from('tratamientos')
        .select('*')
        .eq('clinica_id', clinica.id)
        .eq('activo', true)
        .order('nombre', { ascending: true })
      if (!cancelled) {
        if (error || !data?.length) {
          // Fallback al mock si no hay datos
          setTratamientos(FALLBACK_TRATAMIENTOS
            .filter(t => t.label !== 'Otro')
            .map((t, i) => ({ id: `mock-${i}`, nombre: t.label, duracion_minutos: t.duracion, precio: t.precio }))
          )
        } else {
          setTratamientos(data)
        }
        setCargando(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clinica?.id])

  async function handleEnviar() {
    if (!seleccionado || !fecha) {
      setError('Selecciona un tratamiento y una fecha preferida')
      return
    }
    setEnviando(true)
    setError(null)

    try {
      const fechaISO = new Date(fecha).toISOString()
      const notasFinales = notas.trim()
        ? `[Solicitud del paciente] ${notas.trim()}`
        : '[Solicitud del paciente — pendiente de confirmar fecha]'

      if (!supabase) {
        // Modo demo: solo simular
        await new Promise(r => setTimeout(r, 500))
        onGuardado({
          tratamiento: seleccionado.nombre,
          fecha: fechaISO,
          duracion_minutos: seleccionado.duracion_minutos,
          estado: 'pendiente',
          notas_previas: notasFinales,
        })
        onClose()
        return
      }

      // Insert real. RLS exige paciente_id = auth.uid()
      const { data, error: err } = await supabase
        .from('citas')
        .insert({
          paciente_id:      user.id,
          clinica_id:       clinica.id,
          tratamiento:      seleccionado.nombre,
          precio:           seleccionado.precio ?? null,
          fecha:            fechaISO,
          duracion_minutos: seleccionado.duracion_minutos ?? 30,
          estado:           'pendiente',
          notas_previas:    notasFinales,
        })
        .select()
        .single()
      if (err) throw err

      onGuardado(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al solicitar la cita')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />

      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 animate-slide-up shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-bold text-base">Solicitar cita</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={15} className="text-gray-500" />
            </button>
          </div>

          <p className="text-gray-500 text-xs mb-4 leading-relaxed">
            Elige el tratamiento que te interesa y la fecha preferida. La clínica te confirmará la disponibilidad por WhatsApp.
          </p>

          {/* ── Catálogo de tratamientos ── */}
          <label className="text-gray-600 text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: brand }} /> Tratamiento
          </label>

          {cargando ? (
            <p className="text-gray-400 text-xs py-4 text-center">Cargando tratamientos…</p>
          ) : (
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
              {tratamientos.map(t => {
                const sel = seleccionado?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSeleccionado(t)}
                    className="w-full text-left rounded-xl p-3 border-2 transition-all active:scale-[0.99]"
                    style={{
                      borderColor:    sel ? brand : '#e5e7eb',
                      backgroundColor: sel ? brand + '15' : '#fff',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-semibold">{t.nombre}</p>
                        {t.descripcion && (
                          <p className="text-gray-500 text-[11px] leading-relaxed mt-0.5">{t.descripcion}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {t.duracion_minutos && (
                            <span className="text-gray-400 text-[10px] flex items-center gap-1">
                              <Clock size={9} /> {t.duracion_minutos} min
                            </span>
                          )}
                          {t.precio != null && (
                            <span className="text-gray-400 text-[10px] flex items-center gap-1">
                              <Euro size={9} /> {t.precio} €
                            </span>
                          )}
                        </div>
                      </div>
                      {sel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: brand, color: '#fff' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Fecha preferida ── */}
          <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
            <Calendar size={12} style={{ color: brand }} /> Fecha y hora preferida
          </label>
          <input
            type="datetime-local"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400 mb-4"
          />

          {/* ── Notas opcionales ── */}
          <label className="text-gray-600 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
            <FileText size={12} style={{ color: brand }} /> Mensaje para la clínica (opcional)
          </label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            placeholder="Preferencias, alergias, dudas…"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 resize-none mb-4"
          />

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={enviando}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={enviando || !seleccionado || !fecha}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white active:scale-95 transition-all disabled:opacity-40"
              style={{ backgroundColor: brand }}
            >
              {enviando ? 'Enviando…' : 'Solicitar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
