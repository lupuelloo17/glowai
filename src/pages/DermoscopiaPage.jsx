import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Camera, Upload, FileText, RefreshCw, CalendarDays, Printer,
  Grid3x3, Cloud, Activity, Sun, Palette, Circle, MinusCircle, Send, Shield, CheckCircle2,
} from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { msg: 'Procesando parámetros morfológicos…',                pct: 20 },
  { msg: 'Evaluando red pigmentada y estructuras vasculares…', pct: 45 },
  { msg: 'Aplicando algoritmo Seven-Point Checklist…',         pct: 70 },
  { msg: 'Generando informe dermoscópico…',                    pct: 95 },
]

// 7-Point Checklist de Argenziano (Arch Dermatol. 1998;134(12):1563-1570)
// 3 criterios mayores (2pts c/u) + 4 menores (1pt c/u). Score ≥3 → derivar a Dermatología.
//   - label:      nombre clínico oficial
//   - clinical:   descripción técnica para el informe médico
//   - accessible: explicación en lenguaje paciente-friendly
//   - icon:       icono visual de lucide-react
const CRITERIA = [
  { id: 1, major: true,  pts: 2, label: 'Red de pigmento atípica',     icon: Grid3x3,
    clinical:   'Retículo melanocítico irregular con líneas engrosadas y orificios asimétricos.',
    accessible: 'Un patrón de "red" en la piel que normalmente es uniforme, pero en esta lesión parece desigual o roto.' },
  { id: 2, major: true,  pts: 2, label: 'Velo azul-blanquecino',       icon: Cloud,
    clinical:   'Área azul-blanca difusa e irregular superpuesta sobre una zona elevada de la lesión.',
    accessible: 'Un área que se ve como cubierta por una capa azulada o blanquecina, como si tuviera un velo encima.' },
  { id: 3, major: true,  pts: 2, label: 'Patrón vascular atípico',     icon: Activity,
    clinical:   'Vasos sanguíneos irregulares: puntiformes, glomerulares, en horquilla o polimorfos no asociados a regresión.',
    accessible: 'Vasos sanguíneos visibles con formas o disposición fuera de lo normal dentro de la lesión.' },
  { id: 4, major: false, pts: 1, label: 'Estrías radiales irregulares', icon: Sun,
    clinical:   'Proyecciones lineales en la periferia de la lesión sin pigmentación folicular visible.',
    accessible: 'Pequeñas líneas que salen del borde de la lesión hacia fuera, como rayos de sol asimétricos.' },
  { id: 5, major: false, pts: 1, label: 'Manchas de pigmento irregulares', icon: Palette,
    clinical:   'Áreas de pigmentación marrón, gris o negra con distribución asimétrica e irregular.',
    accessible: 'Zonas de distinto color (marrón, gris, negro) repartidas de forma desigual.' },
  { id: 6, major: false, pts: 1, label: 'Puntos y glóbulos irregulares', icon: Circle,
    clinical:   'Estructuras redondeadas u ovales, negras, marrones o grises con variación en tamaño y distribución irregular.',
    accessible: 'Puntitos pequeños y "bolitas" dentro de la lesión, con tamaños y distribución desiguales.' },
  { id: 7, major: false, pts: 1, label: 'Estructuras de regresión',     icon: MinusCircle,
    clinical:   'Áreas blancas cicatriciales o zonas de pigmentación azul-pizarra (peppering) en el contexto de la lesión melanocítica.',
    accessible: 'Áreas más claras o blanquecinas, como si la piel se hubiera "despigmentado" en esa zona.' },
]

const MORPHO_PARAMS = [
  { label: 'Asimetría estructural (ABCD rule)', options: ['Simétrica', 'Asimétrica leve', 'Asimétrica en 2 ejes'] },
  { label: 'Bordes',                            options: ['Regulares', 'Irregulares', 'Microlobulados', 'Mal definidos'] },
  { label: 'Cromatismo',                        options: ['Monocromo', 'Bicrómico', 'Policrómico (>2 colores)'] },
  { label: 'Diámetro estimado',                 options: ['<6mm', '6-10mm', '>10mm'] },
  { label: 'Evolución reportada',               options: ['Sin cambios', 'Cambio reciente', 'Crecimiento activo'] },
]

const RESULT_STYLE = {
  present:       { label: 'PRESENTE',      bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',   dot: 'bg-red-500'    },
  absent:        { label: 'AUSENTE',       bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300', dot: 'bg-green-500'  },
  indeterminate: { label: 'INDETERMINADO', bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300', dot: 'bg-amber-500'  },
}

function riskConfig(score) {
  if (score <= 1) return {
    label: 'BAJO', nivel: 'bajo', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
    barColor: 'bg-green-500',
    text: 'Lesión de bajo riesgo. Control fotográfico en 12 meses recomendado.',
    accessible: 'No se detectan signos de alarma. Te recomendamos una revisión rutinaria con tu médico.',
    impression: 'Hallazgos dermoscópicos dentro de parámetros benignos. Ausencia de criterios mayores de malignidad. Se recomienda control fotográfico comparativo en 12 meses.',
  }
  if (score <= 4) return {
    label: 'MODERADO', nivel: 'moderado', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    barColor: 'bg-amber-500',
    text: 'Lesión de riesgo moderado. Valoración dermatoscópica presencial recomendada en 4-6 semanas.',
    accessible: 'Algunos criterios merecen atención. Te recomendamos consultar con tu médico en las próximas semanas.',
    impression: 'Presencia de criterios menores con potencial de atipía. Se recomienda valoración dermatoscópica presencial en 4-6 semanas para establecer diagnóstico diferencial con nevus atípico displásico.',
  }
  return {
    label: 'ALTO', nivel: 'alto', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
    barColor: 'bg-red-500',
    text: 'Lesión de alto índice de sospecha. Derivación urgente a Dermatología recomendada.',
    accessible: 'Se detectan criterios de alerta. Consulta dermatológica presencial urgente recomendada.',
    impression: 'Criterios mayores positivos con puntuación de alto índice de sospecha. Derivación urgente a Dermatología para valoración presencial, biopsia escisional y estudio anatomopatológico.',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomResult() {
  const r = Math.random()
  if (r < 0.45) return 'absent'
  if (r < 0.80) return 'present'
  return 'indeterminate'
}

function buildResults() {
  const results = {}
  CRITERIA.forEach(c => { results[c.id] = randomResult() })
  return results
}

function buildMorpho() {
  const m = {}
  MORPHO_PARAMS.forEach(p => {
    m[p.label] = p.options[Math.floor(Math.random() * p.options.length)]
  })
  return m
}

function calcScore(results) {
  return CRITERIA.reduce((sum, c) =>
    results[c.id] === 'present' ? sum + c.pts : sum, 0)
}

function formatDatetime() {
  return new Date().toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Cosmeceutical catalog ────────────────────────────────────────────────────

const BRAND = {
  zo:   { name: 'ZO Skin Health', bg: '#000000', text: '#FFFFFF' },
  obagi:{ name: 'Obagi',          bg: '#1B3A6B', text: '#FFFFFF' },
  sc:   { name: 'SkinCeuticals',  bg: '#8B6914', text: '#FFFFFF' },
  mc:   { name: 'Medicube',       bg: '#E85D4A', text: '#FFFFFF' },
}

const ALL_PRODUCTS = [
  // ── Pigmentation ──
  { id: 'zo-brightalive', brand: 'zo',
    name: 'Brightalive Skin Brightener',
    indication: 'Hiperpigmentación irregular y discromía melanocítica',
    active: 'Retinol estabilizado 0.1% + niacinamida',
    pauta: 'Aplicación nocturna. Evitar exposición solar sin fotoprotección SPF50+',
    rule: 'pigmentation' },
  { id: 'obagi-clearfx', brand: 'obagi',
    name: 'Nu-Derm Clear Fx',
    indication: 'Hiperpigmentación postinflamatoria y lentigos solares',
    active: 'Ácido kójico + arbutina. Sin hidroquinona',
    pauta: 'Mañana y noche sobre piel limpia y seca',
    rule: 'pigmentation' },
  { id: 'sc-discolor', brand: 'sc',
    name: 'Discoloration Defense',
    indication: 'Discromía refractaria y melasma epidérmico',
    active: 'Tranexámico 3% + niacinamida 5% + HEPES 5%',
    pauta: 'Sérum de aplicación diaria, mañana y noche',
    rule: 'pigmentation' },
  // ── Regression ──
  { id: 'zo-retinol1', brand: 'zo',
    name: 'Retinol Skin Brightener 1%',
    indication: 'Remodelación epidérmica y estimulación de colágeno dérmico',
    active: 'Retinol encapsulado 1% + vitamina E',
    pauta: 'Uso nocturno. Iniciar 2 noches/semana. Aumentar progresivamente',
    rule: 'regression' },
  { id: 'sc-ceferulic', brand: 'sc',
    name: 'C E Ferulic',
    indication: 'Fotoprotección antioxidante y reparación del ADN celular',
    active: 'Vitamina C 15% + vitamina E 1% + ácido ferúlico 0.5%',
    pauta: 'Aplicación matutina sobre piel limpia, previo a fotoprotector',
    rule: 'regression' },
  { id: 'obagi-profc', brand: 'obagi',
    name: 'Professional-C Serum 20%',
    indication: 'Daño actínico acumulado y disfunción de barrera cutánea',
    active: 'L-Ascórbico puro 20%',
    pauta: 'Mañana. Conservar en frío. Cambiar si vira a naranja',
    rule: 'regression' },
  // ── Vascular ──
  { id: 'zo-rozatrol', brand: 'zo',
    name: 'Rozatrol',
    indication: 'Reactividad vascular y eritema perilesional',
    active: 'ZO-RRS2 + ZPOLY + niacinamida',
    pauta: 'Mañana y noche. Compatible con tratamientos tópicos prescritos',
    rule: 'vascular' },
  { id: 'sc-phyto', brand: 'sc',
    name: 'Phyto Corrective Gel',
    indication: 'Sensibilización cutánea y eritema asociado a lesiones activas',
    active: 'Cucumber + thyme + dipeptide-2',
    pauta: 'Aplicar en capa fina sobre la zona afectada 2 veces al día',
    rule: 'vascular' },
  // ── Maintenance / low risk ──
  { id: 'mc-stick', brand: 'mc',
    name: 'Red Erasing Stick',
    indication: 'Rojeces puntuales y manchas postinflamatorias residuales',
    active: 'Niacinamida 10% + centella asiática',
    pauta: 'Aplicación localizada mañana y noche',
    rule: 'maintenance' },
  { id: 'mc-pad', brand: 'mc',
    name: 'Zero Pore Pad',
    indication: 'Hiperqueratosis folicular y poro dilatado perilesional',
    active: 'BHA 0.5% + AHA 10% + PHA 5%',
    pauta: '1 pad en noche, máximo 3 veces por semana. No usar sobre lesión activa',
    rule: 'maintenance' },
  // ── Universal (always eligible as fallback) ──
  { id: 'zo-spf', brand: 'zo',
    name: 'Sunscreen + Primer SPF30',
    indication: 'Fotoprotección obligatoria en toda lesión pigmentada estudiada',
    active: 'Filtros físicos + químicos de amplio espectro',
    pauta: 'OBLIGATORIO cada mañana. Reaplicar cada 2h en exposición solar',
    rule: 'universal' },
]

function selectProducts(results, morpho, score) {
  const hasPigmentation = results[5] === 'present' ||
    morpho['Cromatismo'] === 'Policrómico (>2 colores)'
  const hasRegression   = results[7] === 'present'
  const hasVascular     = results[3] === 'present' || score >= 2
  const isLowRisk       = score <= 1

  // Build ordered candidate list (no duplicates)
  const seen = new Set()
  const candidates = []

  function add(rule) {
    ALL_PRODUCTS.filter(p => p.rule === rule && !seen.has(p.id))
      .forEach(p => { seen.add(p.id); candidates.push(p) })
  }

  if (hasPigmentation) add('pigmentation')
  if (hasRegression)   add('regression')
  if (hasVascular)     add('vascular')
  if (isLowRisk)       add('maintenance')

  // Always add SPF if not already included & there's room
  if (!seen.has('zo-spf')) add('universal')

  // If still empty, return full fallback
  if (candidates.length === 0) {
    return ALL_PRODUCTS.filter(p => p.rule === 'maintenance' || p.rule === 'universal').slice(0, 3)
  }

  return candidates.slice(0, 3)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CriterionCard({ criterion, result, index, visible }) {
  const s = RESULT_STYLE[result]
  const Icon = criterion.icon || Circle
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 0.3s ease ${index * 90}ms, transform 0.3s ease ${index * 90}ms`,
      }}
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
        criterion.major ? 'border-l-4 border-l-gray-700' : 'border-l-4 border-l-gray-300'
      }`}
    >
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-start gap-3">
          {/* Icono visual */}
          <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
            result === 'present' ? 'bg-red-50' : result === 'absent' ? 'bg-green-50' : 'bg-amber-50'
          }`}>
            <Icon size={20} className={
              result === 'present' ? 'text-red-600' : result === 'absent' ? 'text-green-600' : 'text-amber-600'
            } />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {criterion.major
                ? <span className="text-[9px] font-bold bg-gray-800 text-white px-1.5 py-0.5 rounded tracking-wide">MAYOR · {criterion.pts}pts</span>
                : <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded tracking-wide">MENOR · {criterion.pts}pt</span>
              }
              <span className="text-gray-400 text-[9px]">#{criterion.id}</span>
            </div>
            <p className="text-gray-900 text-sm font-semibold leading-snug">{criterion.label}</p>
          </div>

          <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
        {/* Descripción accesible para paciente + clínica colapsable */}
        <div className="mt-2.5 ml-13" style={{ paddingLeft: '52px' }}>
          <p className="text-gray-700 text-xs leading-relaxed mb-1">
            {criterion.accessible}
          </p>
          <details className="text-[10px]">
            <summary className="text-gray-400 cursor-pointer hover:text-gray-600 select-none">
              Ver descripción clínica
            </summary>
            <p className="text-gray-500 mt-1 leading-relaxed">{criterion.clinical}</p>
          </details>
        </div>
      </div>
    </div>
  )
}

function MorphoCard({ param, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
      <p className="text-gray-600 text-xs leading-snug flex-1">{param}</p>
      <span className="text-gray-900 text-xs font-semibold text-right flex-shrink-0 max-w-[120px]">{value}</span>
    </div>
  )
}

function ProductCard({ product }) {
  const brand = BRAND[product.brand]
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Brand header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: brand.bg }}
      >
        <span className="text-xs font-bold tracking-wide" style={{ color: brand.text }}>
          {brand.name}
        </span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-white/30"
          style={{ color: brand.text, opacity: 0.85 }}
        >
          Uso bajo supervisión médica
        </span>
      </div>
      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-gray-900 text-sm font-bold leading-snug">{product.name}</p>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">
            Indicación clínica
          </p>
          <p className="text-gray-700 text-xs leading-relaxed">{product.indication}</p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">
            Principio activo
          </p>
          <p className="text-gray-700 text-xs leading-relaxed">{product.active}</p>
        </div>
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold mb-0.5">
            Pauta de aplicación
          </p>
          <p className="text-gray-700 text-xs leading-relaxed">{product.pauta}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

// `embedded`: cuando es true, no renderiza su propio BottomNav (se asume que
// está dentro de un layout que ya lo aporta, ej. ClinicLayout) y ajusta la
// navegación de "volver" a la pantalla anterior en vez del legacy /home.
export default function DermoscopiaPage({ embedded = false }) {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const { user } = useAuth()

  // step: 'capture' | 'analyzing' | 'report'
  const [step, setStep]         = useState('capture')
  const [preview, setPreview]   = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [analysisId, setAnalysisId] = useState(null)
  const [guardando, setGuardando]   = useState(false)
  const [compartido, setCompartido] = useState(false)

  // Analysis state
  const [progress, setProgress]       = useState(0)
  const [loadingMsg, setLoadingMsg]   = useState(LOADING_STEPS[0].msg)
  const [msgVisible, setMsgVisible]   = useState(true)

  // Report state
  const [results, setResults]         = useState({})
  const [morpho, setMorpho]           = useState({})
  const [score, setScore]             = useState(0)
  const [cardsVisible, setCardsVisible] = useState(false)
  const [reportVisible, setReportVisible] = useState(false)

  // ── Image load ──
  function loadImage(file) {
    if (!file?.type.startsWith('image/')) return
    setPreviewFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    loadImage(e.dataTransfer.files[0])
  }

  // ── Run analysis ──
  function startAnalysis() {
    setStep('analyzing')
    setProgress(0)

    // Progress animation over 3s
    let pct = 0
    const interval = setInterval(() => {
      pct += 1
      setProgress(pct)
      if (pct >= 100) clearInterval(interval)
    }, 30)

    // Sequential messages
    LOADING_STEPS.forEach(({ msg, pct: threshold }, i) => {
      setTimeout(() => {
        setMsgVisible(false)
        setTimeout(() => { setLoadingMsg(msg); setMsgVisible(true) }, 200)
      }, i * 750)
    })

    // Complete at 3s
    setTimeout(async () => {
      const r = buildResults()
      const m = buildMorpho()
      const s = calcScore(r)
      setResults(r)
      setMorpho(m)
      setScore(s)
      setStep('report')
      setTimeout(() => setCardsVisible(true), 100)
      setTimeout(() => setReportVisible(true), CRITERIA.length * 90 + 300)

      // Si hay paciente logueado y Supabase configurado, guardar persistente
      if (supabase && user?.id && user?.rol === 'paciente' && previewFile) {
        await saveAnalysis(r, s, riskConfig(s))
      }
    }, 3000)
  }

  // ── Persistencia: sube foto al bucket "analisis" e inserta fila ──
  async function saveAnalysis(results, score, risk) {
    setGuardando(true)
    try {
      // 1. Resolver clinica_id + medico_id del paciente
      const { data: pac } = await supabase
        .from('pacientes')
        .select('medico_id, clinica_id')
        .eq('id', user.id)
        .maybeSingle()
      const medicoId  = pac?.medico_id ?? null
      const clinicaId = pac?.clinica_id ?? user.clinica_id
      if (!clinicaId) throw new Error('clinica_id no resuelto')

      // 2. Subir imagen al bucket "analisis" (path: clinica/paciente/timestamp.ext)
      const ext  = previewFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${clinicaId}/${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('analisis')
        .upload(path, previewFile, { contentType: previewFile.type })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('analisis').getPublicUrl(path)

      // 3. Construir JSON de criterios y guardar análisis
      const criteriosJson = {}
      CRITERIA.forEach(c => { criteriosJson[c.label] = results[c.id] })

      const { data, error } = await supabase
        .from('analisis_dermoscopicos')
        .insert({
          paciente_id: user.id,
          clinica_id:  clinicaId,
          medico_id:   medicoId,
          fecha:       new Date().toISOString(),
          criterios:   criteriosJson,
          puntuacion_total: score,
          nivel_riesgo:     risk.nivel,
          imagen_url:       pub.publicUrl,
          compartido_medico: false,
        })
        .select()
        .single()
      if (error) throw error
      setAnalysisId(data.id)
    } catch (err) {
      console.error('[Dermoscopia save]', err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleCompartir() {
    if (!analysisId || !supabase) {
      alert('Para compartir, inicia sesión como paciente.')
      return
    }
    const { error } = await supabase
      .from('analisis_dermoscopicos')
      .update({ compartido_medico: true })
      .eq('id', analysisId)
    if (error) return alert('Error: ' + error.message)
    setCompartido(true)
  }

  // Destino "Solicitar cita" según rol del usuario
  const solicitarCitaPath = user?.rol === 'paciente'
    ? `/clinica/${user.clinica_slug || 'clinica-lumiere'}/mi-perfil/citas`
    : '/reservar'

  // ── Reset ──
  function reset() {
    setStep('capture'); setPreview(null); setPreviewFile(null)
    setProgress(0); setResults({}); setMorpho({})
    setScore(0); setCardsVisible(false); setReportVisible(false)
    setAnalysisId(null); setCompartido(false)
  }

  const risk = riskConfig(score)
  const majorPositive = CRITERIA.filter(c => c.major  && results[c.id] === 'present').length
  const minorPositive = CRITERIA.filter(c => !c.major && results[c.id] === 'present').length
  const datetime = formatDatetime()
  const products = step === 'report' ? selectProducts(results, morpho, score) : []

  // ── Render ──
  return (
    <div className="flex flex-col flex-1 animate-fade-in">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-5 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => {
              if (step === 'report') return reset()
              if (embedded && user?.rol === 'paciente') {
                return navigate(`/clinica/${user.clinica_slug || 'clinica-lumiere'}/analisis`)
              }
              return navigate(-1)
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-gray-900 font-semibold text-base leading-tight">
              Análisis Dermoscópico Asistido
            </h1>
            <p className="text-gray-400 text-xs">
              Seven-Point Checklist · Argenziano et al., 1998
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-3 ml-12">
          {['Captura', 'Análisis', 'Informe'].map((label, i) => {
            const stepIdx = step === 'capture' ? 0 : step === 'analyzing' ? 1 : 2
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <div key={label} className="flex items-center gap-1">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${
                  done   ? 'bg-gray-800 border-gray-800 text-white' :
                  active ? 'bg-white border-gray-800 text-gray-800' :
                           'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-4 h-px bg-gray-200 mx-0.5" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4 space-y-4">

        {/* ══ STEP 1: Capture ══ */}
        {step === 'capture' && (
          <>
            {/* Upload area */}
            <div
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                dragging ? 'border-gray-400 bg-gray-100' : 'border-gray-300 bg-white'
              }`}
              style={{ minHeight: preview ? 220 : 180 }}
            >
              {preview ? (
                <img src={preview} alt="Lesión" className="w-full object-cover rounded-xl" style={{ maxHeight: 260 }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Upload size={20} className="text-gray-400" />
                  </div>
                  <p className="text-gray-700 text-sm font-medium mb-1">
                    Fotografiar lesión o subir imagen
                  </p>
                  <p className="text-gray-400 text-xs">
                    JPG, PNG · Arrastra o toca para seleccionar
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => loadImage(e.target.files[0])}
            />

            {/* Two capture buttons */}
            {!preview && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { fileRef.current.removeAttribute('capture'); fileRef.current.click() }}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl hover:border-gray-300 active:scale-95 transition-all"
                >
                  <Upload size={16} /> Subir imagen
                </button>
                <button
                  onClick={() => { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() }}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-3 rounded-xl hover:border-gray-300 active:scale-95 transition-all"
                >
                  <Camera size={16} /> Fotografiar
                </button>
              </div>
            )}

            {/* Clinical note */}
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-gray-500 text-xs leading-relaxed">
                <span className="font-semibold text-gray-700">Nota clínica: </span>
                Para resultados óptimos, capture la lesión a una distancia de 2–5 cm con iluminación uniforme sin flash directo. Resolución mínima recomendada: 1280×960 px.
              </p>
            </div>

            {/* CTA */}
            <button
              disabled={!preview}
              onClick={startAnalysis}
              className={`w-full font-semibold text-sm py-4 rounded-xl transition-all duration-200 ${
                preview
                  ? 'bg-gray-900 text-white active:scale-95 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Iniciar análisis dermoscópico
            </button>

            {!preview && (
              <button
                onClick={() => {
                  setPreview('https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=400&fit=crop')
                }}
                className="w-full text-gray-500 text-xs border border-dashed border-gray-300 py-2.5 rounded-xl hover:bg-white transition-colors"
              >
                Usar imagen de demostración
              </button>
            )}
          </>
        )}

        {/* ══ STEP 2: Analyzing ══ */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-6">
            {preview && (
              <div className="w-full rounded-xl overflow-hidden" style={{ maxHeight: 180 }}>
                <img src={preview} alt="Lesión" className="w-full object-cover opacity-60" style={{ maxHeight: 180 }} />
              </div>
            )}

            {/* Spinner + message */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
              <p
                className="text-gray-700 text-sm font-medium text-center px-4"
                style={{
                  opacity: msgVisible ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {loadingMsg}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Procesando</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-800 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className="text-gray-400 text-xs text-center">
              Aplicando algoritmo Seven-Point Checklist sobre los parámetros morfológicos detectados
            </p>
          </div>
        )}

        {/* ══ STEP 3: Report ══ */}
        {step === 'report' && (
          <>
            {/* Risk banner */}
            <div className={`rounded-xl border ${risk.bg} ${risk.border} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider">Resultado · Seven-Point Score</p>
                <span className={`text-2xl font-bold ${risk.color}`}>{score} / 9</span>
              </div>
              {/* Score bar */}
              <div className="h-2.5 bg-white/70 rounded-full overflow-hidden mb-2 relative">
                <div
                  className={`h-full ${risk.barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${(score / 9) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mb-2">
                <span>0–1 Bajo</span><span>2–4 Moderado</span><span>5–9 Alto</span>
              </div>
              <p className={`text-sm font-semibold ${risk.color}`}>
                Riesgo {risk.label}
              </p>
              <p className="text-gray-600 text-xs mt-1 leading-relaxed">{risk.text}</p>
            </div>

            {/* Major criteria */}
            <div>
              <h2 className="text-gray-800 font-semibold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-800 rounded-sm inline-block" />
                Criterios mayores (2 pts c/u)
              </h2>
              <div className="space-y-2">
                {CRITERIA.filter(c => c.major).map((c, i) => (
                  <CriterionCard key={c.id} criterion={c} result={results[c.id]} index={i} visible={cardsVisible} />
                ))}
              </div>
            </div>

            {/* Minor criteria */}
            <div>
              <h2 className="text-gray-800 font-semibold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-300 rounded-sm inline-block" />
                Criterios menores (1 pt c/u)
              </h2>
              <div className="space-y-2">
                {CRITERIA.filter(c => !c.major).map((c, i) => (
                  <CriterionCard key={c.id} criterion={c} result={results[c.id]} index={i + 3} visible={cardsVisible} />
                ))}
              </div>
            </div>

            {/* Morphological parameters */}
            <div
              style={{
                opacity: reportVisible ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
            >
              <h2 className="text-gray-800 font-semibold text-xs uppercase tracking-wider mb-2 mt-2">
                Parámetros morfológicos adicionales
              </h2>
              <div className="space-y-2">
                {MORPHO_PARAMS.map(p => (
                  <MorphoCard key={p.label} param={p.label} value={morpho[p.label]} />
                ))}
              </div>
            </div>

            {/* Clinical report */}
            <div
              style={{
                opacity: reportVisible ? 1 : 0,
                transition: 'opacity 0.4s ease 0.2s',
              }}
              className="bg-gray-900 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-gray-400" />
                <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Informe dermoscópico</p>
              </div>
              <pre className="font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">
{`INFORME DERMOSCÓPICO — ${datetime}
Modalidad: Dermoscopia digital simulada
Algoritmo: Seven-Point Checklist
           (Argenziano et al., 1998)
─────────────────────────────────────
Puntuación total:        ${score}/9 puntos
Categoría de riesgo:     ${risk.label}
Criterios mayores (+):   ${majorPositive}/3
Criterios menores (+):   ${minorPositive}/4
─────────────────────────────────────
Impresión diagnóstica:
${risk.impression}
─────────────────────────────────────
AVISO: Este análisis ha sido generado
mediante inteligencia artificial con
fines de orientación clínica prelimi-
nar. No constituye diagnóstico médico
definitivo. Se recomienda confirmación
mediante exploración dermatoscópica
presencial realizada por facultativo
especialista en Dermatología.`}
              </pre>
            </div>

            {/* ── Cosmeceutical protocol ── */}
            <div
              style={{
                opacity: reportVisible ? 1 : 0,
                transition: 'opacity 0.4s ease 0.3s',
              }}
            >
              <div className="border-t border-gray-200 pt-4 mb-3">
                <h2 className="text-gray-900 font-semibold text-sm">
                  Protocolo cosmecéutico complementario
                </h2>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  Los siguientes productos de cosmética médica son compatibles con los
                  hallazgos de la exploración. Su uso no sustituye el tratamiento prescrito
                  por su dermatólogo.
                </p>
              </div>

              <div className="space-y-3">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              <p className="text-gray-400 text-[10px] leading-relaxed mt-3 px-1">
                GlowAI no mantiene relación comercial con las marcas citadas. Las
                recomendaciones se basan en la composición y evidencia clínica publicada
                de cada formulación.
              </p>
            </div>

            {/* Action buttons */}
            <div
              style={{
                opacity: reportVisible ? 1 : 0,
                transition: 'opacity 0.4s ease 0.4s',
              }}
              className="space-y-2 pb-2"
            >
              {/* Indicador de guardado / estado para pacientes */}
              {user?.rol === 'paciente' && (
                <div className="mb-2 px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                     style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  {guardando ? (
                    <span className="text-gray-500">Guardando análisis en tu historial…</span>
                  ) : analysisId ? (
                    <span className="text-green-700 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Análisis guardado en tu historial
                    </span>
                  ) : (
                    <span className="text-gray-500">Análisis disponible solo en esta sesión</span>
                  )}
                </div>
              )}

              <button
                onClick={() => navigate(solicitarCitaPath)}
                className="w-full bg-blush-400 text-white font-semibold text-sm py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <CalendarDays size={16} />
                Solicitar cita con mi médico
              </button>

              {/* Compartir con médico — solo si paciente y análisis guardado */}
              {user?.rol === 'paciente' && analysisId && (
                <button
                  onClick={handleCompartir}
                  disabled={compartido}
                  className="w-full font-semibold text-sm py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    backgroundColor: compartido ? '#dcfce7' : '#dbeafe',
                    color: compartido ? '#15803d' : '#1d4ed8',
                    border: `1px solid ${compartido ? '#bbf7d0' : '#bfdbfe'}`,
                  }}
                >
                  {compartido ? <><CheckCircle2 size={16} /> Compartido con tu médico</> : <><Send size={16} /> Compartir con mi médico</>}
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="w-full bg-white border border-gray-200 text-gray-700 font-medium text-sm py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Descargar informe PDF
              </button>
              <button
                onClick={reset}
                className="w-full text-gray-500 text-sm font-medium py-3 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Nueva exploración
              </button>
            </div>

            {/* Footer reference */}
            <p className="text-gray-400 text-[10px] text-center pb-2 leading-relaxed">
              Basado en: Argenziano G. et al. Arch Dermatol. 1998;134(12):1563–1570
            </p>
          </>
        )}
      </div>

      {!embedded && <BottomNav />}
    </div>
  )
}
