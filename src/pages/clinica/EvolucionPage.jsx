import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Camera, X, Check, Trash2, Image as ImageIcon,
  Upload, ChevronLeft, Plus,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { supabase } from '../../lib/supabase'
import ClinicLayout from './ClinicLayout'
import BeforeAfterSlider from '../../components/BeforeAfterSlider'

// ── Constantes ──────────────────────────────────────────────────────────────
const TIPO_LABELS = { antes: 'Antes', despues: 'Después', progreso: 'Progreso' }
const TIPO_COLORS = {
  antes:    { bg: '#fef3c7', text: '#b45309' },
  despues:  { bg: '#dcfce7', text: '#15803d' },
  progreso: { bg: '#e0f2fe', text: '#0369a1' },
}
const TRATAMIENTOS_OPCIONES = [
  'Toxina Botulínica', 'Ácido Hialurónico', 'Peeling Químico',
  'Radiofrecuencia', 'Mesoterapia', 'Láser CO2', 'Hilos Tensores',
  'Bioestimulación', 'Micropigmentación', 'Otro',
]
const MOCK_FOTOS = [
  {
    id: 'm1', tipo: 'antes', tratamiento: 'Toxina Botulínica',
    fecha: new Date(Date.now() - 40 * 86400000).toISOString(), notas: 'Zona de frente y entrecejo',
    foto_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
  },
  {
    id: 'm2', tipo: 'despues', tratamiento: 'Toxina Botulínica',
    fecha: new Date(Date.now() - 10 * 86400000).toISOString(), notas: 'Resultado a las 4 semanas',
    foto_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face',
  },
  {
    id: 'm3', tipo: 'antes', tratamiento: 'Ácido Hialurónico',
    fecha: new Date(Date.now() - 60 * 86400000).toISOString(), notas: '',
    foto_url: 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=400&h=400&fit=crop&crop=face',
  },
  {
    id: 'm4', tipo: 'progreso', tratamiento: 'Ácido Hialurónico',
    fecha: new Date(Date.now() - 30 * 86400000).toISOString(), notas: '3 semanas post-tratamiento',
    foto_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face',
  },
]

function fmtFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function EvolucionPage({ pacienteIdProp, readOnly = false }) {
  const { slug } = useParams()
  const { user } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  // pacienteIdProp: cuando lo usa el médico desde PacienteDetallePage
  const pacienteId = pacienteIdProp ?? user?.id
  const clinicaId  = user?.clinica_id

  const [fotos,        setFotos]        = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [modoElegir,   setModoElegir]   = useState(false)
  const [subiendo,     setSubiendo]     = useState(false)
  const [archivo,      setArchivo]      = useState(null)
  const [preview,      setPreview]      = useState(null)
  const [tipoNueva,    setTipoNueva]    = useState('antes')
  const [tratNueva,    setTratNueva]    = useState('')
  const [notasNueva,   setNotasNueva]   = useState('')
  const [fotoModal,    setFotoModal]    = useState(null)
  const [toast,        setToast]        = useState(null)

  const fileRefCam = useRef(null)
  const fileRefGal = useRef(null)

  useEffect(() => { cargarFotos() }, [pacienteId])

  async function cargarFotos() {
    if (!pacienteId) { setCargando(false); return }
    if (!supabase) {
      setFotos(MOCK_FOTOS)
      setCargando(false)
      return
    }
    const { data, error } = await supabase
      .from('evoluciones')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false })
    if (error) console.warn('[evolucion]', error.message)
    setFotos(data ?? [])
    setCargando(false)
  }

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10 MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Solo JPG, PNG o WebP')
      return
    }
    setArchivo(file)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    setModoElegir(false)
    setPanelAbierto(true)
    e.target.value = ''
  }

  async function handleGuardar() {
    if (!archivo || !tratNueva) return
    setSubiendo(true)
    try {
      let fotoUrl = preview

      if (supabase && clinicaId && pacienteId) {
        const ext  = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${clinicaId}/${pacienteId}/${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('evoluciones')
          .upload(path, archivo, { contentType: archivo.type })
        if (upErr) throw upErr

        const { data: pub } = supabase.storage.from('evoluciones').getPublicUrl(path)
        fotoUrl = pub.publicUrl

        const { data: nueva, error: dbErr } = await supabase
          .from('evoluciones')
          .insert({
            paciente_id: pacienteId,
            clinica_id:  clinicaId,
            medico_id:   readOnly ? user?.id : null,
            tipo:        tipoNueva,
            foto_url:    fotoUrl,
            tratamiento: tratNueva,
            notas:       notasNueva.trim() || null,
          })
          .select()
          .single()
        if (dbErr) throw dbErr
        setFotos(prev => [nueva, ...prev])
      } else {
        const nueva = {
          id: `mock-${Date.now()}`, tipo: tipoNueva,
          tratamiento: tratNueva, notas: notasNueva,
          fecha: new Date().toISOString(), foto_url: fotoUrl,
        }
        setFotos(prev => [nueva, ...prev])
      }

      setPanelAbierto(false)
      setArchivo(null)
      setPreview(null)
      setTratNueva('')
      setNotasNueva('')
      mostrarToast('Foto guardada ✓')
    } catch (err) {
      alert('Error subiendo foto: ' + err.message)
    } finally {
      setSubiendo(false)
    }
  }

  async function handleEliminar(foto) {
    if (!confirm('¿Eliminar esta foto permanentemente?')) return
    if (!supabase) {
      setFotos(prev => prev.filter(f => f.id !== foto.id))
      setFotoModal(null)
      mostrarToast('Foto eliminada')
      return
    }
    const { error } = await supabase.from('evoluciones').delete().eq('id', foto.id)
    if (error) { alert('Error: ' + error.message); return }
    setFotos(prev => prev.filter(f => f.id !== foto.id))
    setFotoModal(null)
    mostrarToast('Foto eliminada')
  }

  // Agrupar por tratamiento
  const grupos = useMemo(() => {
    const map = {}
    for (const f of fotos) {
      const key = f.tratamiento || 'Sin tratamiento'
      if (!map[key]) map[key] = []
      map[key].push(f)
    }
    return Object.entries(map)
  }, [fotos])

  // Par antes/después para el modal
  const parModal = useMemo(() => {
    if (!fotoModal) return null
    const same = fotos.filter(f => f.tratamiento === fotoModal.tratamiento)
    const antes  = same.find(f => f.tipo === 'antes')
    const despues = same.find(f => f.tipo === 'despues')
    if (antes && despues) return { antes, despues }
    return null
  }, [fotoModal, fotos])

  const puedeSubir = !readOnly || user?.rol === 'medico' || user?.rol === 'admin'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      {!pacienteIdProp && (
        <div className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
          <h1 className="text-gray-900 font-bold text-lg">Mi evolución</h1>
          <p className="text-gray-400 text-xs mt-0.5">Fotos antes · después · progreso</p>
        </div>
      )}

      {/* Botón nueva foto */}
      {puedeSubir && !panelAbierto && !modoElegir && (
        <div className="px-5 pt-4">
          <button
            onClick={() => setModoElegir(true)}
            className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-sm active:scale-[0.99] transition-all"
            style={{ backgroundColor: brand }}
          >
            <Camera size={16} /> Nueva foto
          </button>
        </div>
      )}

      {/* Selector cámara / galería */}
      {modoElegir && (
        <div className="px-5 pt-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => { setModoElegir(false); fileRefCam.current?.click() }}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 border-b border-gray-100 active:bg-gray-100"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: brand + '20' }}>
                <Camera size={16} style={{ color: brand }} />
              </div>
              <div>
                <p className="text-gray-900 text-sm font-semibold">Usar cámara</p>
                <p className="text-gray-400 text-xs">Toma una foto ahora</p>
              </div>
            </button>
            <button
              onClick={() => { setModoElegir(false); fileRefGal.current?.click() }}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: brand + '20' }}>
                <Upload size={16} style={{ color: brand }} />
              </div>
              <div>
                <p className="text-gray-900 text-sm font-semibold">Subir desde galería</p>
                <p className="text-gray-400 text-xs">Selecciona una foto existente</p>
              </div>
            </button>
          </div>
          <button onClick={() => setModoElegir(false)} className="w-full py-3 text-gray-400 text-sm">
            Cancelar
          </button>
        </div>
      )}

      {/* Panel de subida */}
      {panelAbierto && (
        <div className="px-5 pt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Preview */}
            <div className="relative aspect-square bg-gray-100">
              {preview
                ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                : <div className="flex items-center justify-center h-full">
                    <ImageIcon size={40} className="text-gray-300" />
                  </div>
              }
              <button
                onClick={() => { setPanelAbierto(false); setArchivo(null); setPreview(null) }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Tipo */}
              <div>
                <p className="text-gray-600 text-xs font-medium mb-1.5">Tipo de foto</p>
                <div className="grid grid-cols-3 gap-2">
                  {['antes', 'despues', 'progreso'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTipoNueva(t)}
                      className="py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95"
                      style={tipoNueva === t
                        ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                        : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }}
                    >
                      {TIPO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tratamiento */}
              <div>
                <label className="text-gray-600 text-xs font-medium block mb-1">Tratamiento *</label>
                <select
                  value={tratNueva}
                  onChange={e => setTratNueva(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#C8A882]"
                >
                  <option value="">— Selecciona —</option>
                  {TRATAMIENTOS_OPCIONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="text-gray-600 text-xs font-medium block mb-1">Notas (opcional)</label>
                <textarea
                  value={notasNueva}
                  onChange={e => setNotasNueva(e.target.value)}
                  rows={2}
                  placeholder="Zona tratada, observaciones clínicas…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#C8A882] resize-none"
                />
              </div>

              <button
                onClick={handleGuardar}
                disabled={subiendo || !tratNueva || !archivo}
                className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ backgroundColor: brand }}
              >
                {subiendo
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check size={16} /> Guardar foto</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inputs de archivo ocultos */}
      <input
        ref={fileRefCam}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={fileRefGal}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Galería */}
      <div className="px-5 pt-5 pb-8 space-y-6">
        {cargando ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-gray-200 border-t-[#C8A882] rounded-full animate-spin" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Sin fotos de evolución</p>
            <p className="text-gray-300 text-xs mt-1 leading-relaxed">
              {puedeSubir
                ? 'Sube tu primera foto para registrar tu evolución'
                : 'Tu médico subirá fotos de seguimiento aquí'}
            </p>
          </div>
        ) : (
          grupos.map(([tratamiento, items]) => {
            const hasPar = items.some(f => f.tipo === 'antes') &&
                           items.some(f => f.tipo === 'despues')
            return (
              <div key={tratamiento}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-semibold text-sm">{tratamiento}</p>
                    <span className="text-gray-400 text-xs">· {items.length} {items.length === 1 ? 'foto' : 'fotos'}</span>
                  </div>
                  {hasPar && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: brand + '20', color: brand }}>
                      Comparador disponible
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {items.map(foto => {
                    const tc = TIPO_COLORS[foto.tipo] ?? TIPO_COLORS.progreso
                    return (
                      <button
                        key={foto.id}
                        onClick={() => setFotoModal(foto)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 active:scale-95 transition-transform"
                      >
                        <img
                          src={foto.foto_url}
                          alt={foto.tipo}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span
                          className="absolute top-1 left-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: tc.bg, color: tc.text }}
                        >
                          {TIPO_LABELS[foto.tipo]}
                        </span>
                        <span className="absolute bottom-1 right-1 text-[7px] text-white bg-black/40 px-1 py-0.5 rounded">
                          {fmtFecha(foto.fecha).slice(0, 6)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal foto / comparador */}
      {fotoModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
          {/* Header modal */}
          <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0">
            <div>
              <p className="text-white font-semibold text-sm">{fotoModal.tratamiento}</p>
              <p className="text-white/50 text-xs">
                {TIPO_LABELS[fotoModal.tipo]} · {fmtFecha(fotoModal.fecha)}
              </p>
            </div>
            <button
              onClick={() => setFotoModal(null)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Imagen / comparador */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 min-h-0">
            {parModal ? (
              <>
                <BeforeAfterSlider
                  beforeUrl={parModal.antes.foto_url}
                  afterUrl={parModal.despues.foto_url}
                  className="w-full max-w-sm aspect-square rounded-2xl"
                />
                <p className="text-white/40 text-xs">Arrastra el handle para comparar</p>
              </>
            ) : (
              <img
                src={fotoModal.foto_url}
                alt={fotoModal.tipo}
                className="w-full max-w-sm aspect-square object-cover rounded-2xl"
              />
            )}
            {fotoModal.notas && (
              <p className="text-white/60 text-xs text-center max-w-xs leading-relaxed px-4">
                {fotoModal.notas}
              </p>
            )}
          </div>

          {/* Footer modal */}
          {(puedeSubir) && (
            <div className="px-5 pb-8 pt-3 flex-shrink-0">
              <button
                onClick={() => handleEliminar(fotoModal)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Eliminar foto
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Wrapper de página (con ClinicLayout) ────────────────────────────────────
export function EvolucionPageStandalone() {
  return (
    <ClinicLayout>
      <EvolucionPage />
    </ClinicLayout>
  )
}
