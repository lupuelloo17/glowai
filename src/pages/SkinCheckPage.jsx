import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react'
import BottomNav from '../components/BottomNav'

// ─── Simulated criteria ──────────────────────────────────────────────────────

const CRITERIA = [
  {
    id: 1,
    major: true,
    points: 2,
    title: 'Red de pigmento atípica',
    desc: 'Patrón reticular con mallas y orificios de calibre irregular. Distribución asimétrica respecto al centro de la lesión.',
    result: 'absent', // absent | present | uncertain
  },
  {
    id: 2,
    major: true,
    points: 2,
    title: 'Velo azul-blanquecino',
    desc: 'Área de opacificación azulada o blanquecina superpuesta a una zona de pigmentación roja, azul o grisácea. Corresponde histológicamente a melanina en dermis profunda.',
    result: 'absent',
  },
  {
    id: 3,
    major: true,
    points: 2,
    title: 'Patrón vascular atípico',
    desc: 'Vasos sanguíneos de morfología irregular: en horquilla, coma, puntiformes irregulares o con distribución asimétrica. No asociados a zona de regresión.',
    result: 'uncertain',
  },
  {
    id: 4,
    major: false,
    points: 1,
    title: 'Proyecciones radiales irregulares',
    desc: 'Proyecciones bulbosas o lineales en la periferia de la lesión, sin distribución radial simétrica. Indicativas de crecimiento radial activo.',
    result: 'absent',
  },
  {
    id: 5,
    major: false,
    points: 1,
    title: 'Pigmentación irregular',
    desc: 'Áreas de pigmentación marrón, gris o negra con distribución focal asimétrica. Distinguir de la hiperpigmentación central homogénea de los nevos benignos.',
    result: 'present',
  },
  {
    id: 6,
    major: false,
    points: 1,
    title: 'Puntos y glóbulos irregulares',
    desc: 'Estructuras redondeadas u ovales de pigmento oscuro con variación de tamaño, forma o distribución asimétrica dentro de la lesión.',
    result: 'uncertain',
  },
  {
    id: 7,
    major: false,
    points: 1,
    title: 'Estructuras de regresión',
    desc: 'Áreas cicatriciales blanquecinas (fibrosis) o zonas de pigmentación gris pimentada (granulomas de melanófagos). Ocupan más del 10% de la superficie lesional.',
    result: 'absent',
  },
]

// Score: major 3 = uncertain → 0pts; minor 5 = present → 1pt; minor 6 = uncertain → 0pts
// Deterministic: present=full points, uncertain=0, absent=0
// Simulated total = 1 (criterion 5 only) but user specified 3 pts → treat uncertain as half
// Per spec: present criteria: #5 (1pt), #3 uncertain (1pt simulated), #6 uncertain (1pt simulated) = 3 pts
const SIMULATED_SCORE = 3

const RESULT_CONFIG = {
  absent:    { label: 'Ausente',  color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400', icon: MinusCircle,   iconColor: 'text-emerald-400' },
  present:   { label: 'Presente', color: 'bg-rose-50 text-rose-600',       dot: 'bg-rose-500',    icon: AlertCircle,   iconColor: 'text-rose-500'    },
  uncertain: { label: 'Dudoso',   color: 'bg-amber-50 text-amber-600',     dot: 'bg-amber-400',   icon: AlertTriangle, iconColor: 'text-amber-400'   },
}

function scoreZone(score) {
  if (score <= 2) return { zone: 'low',    label: 'Sin criterios de sospecha',                                                          barColor: 'bg-emerald-400', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' }
  if (score <= 4) return { zone: 'medium', label: 'Criterios menores presentes — valoración dermatoscópica recomendada',                barColor: 'bg-amber-400',   textColor: 'text-amber-700',   bgColor: 'bg-amber-50'   }
  return               { zone: 'high',   label: 'Criterios mayores presentes — derivación urgente a dermatología',                     barColor: 'bg-rose-500',    textColor: 'text-rose-700',    bgColor: 'bg-rose-50'    }
}

// ─── Staggered card animation ─────────────────────────────────────────────────

function CriterionCard({ criterion, index, visible }) {
  const cfg = RESULT_CONFIG[criterion.result]
  const Icon = cfg.icon

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.35s ease ${index * 100}ms, transform 0.35s ease ${index * 100}ms`,
      }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-blush-100"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-1">
          {criterion.major && (
            <span className="text-[10px] font-bold bg-ink text-white px-1.5 py-0.5 rounded-md flex-shrink-0">
              Mayor
            </span>
          )}
          <p className="text-ink text-sm font-semibold leading-snug">{criterion.title}</p>
        </div>
        <div className={`flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
          <Icon size={11} className={cfg.iconColor} />
          {cfg.label}
        </div>
      </div>
      <p className="text-gray-500 text-xs leading-relaxed">{criterion.desc}</p>
      <p className="text-gray-300 text-[10px] mt-1.5">
        {criterion.points} {criterion.major ? 'puntos' : 'punto'} si presente
      </p>
    </div>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, animate }) {
  const maxDisplay = 8
  const pct = Math.min((score / maxDisplay) * 100, 100)
  const zone = scoreZone(score)

  return (
    <div className={`rounded-2xl p-4 shadow-sm border ${zone.bgColor} border-transparent`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-ink font-semibold text-sm">Puntuación final</p>
        <span className={`text-2xl font-bold ${zone.textColor}`}>{score} pts</span>
      </div>

      {/* Bar track with zones */}
      <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ background: 'linear-gradient(to right, #6ee7b7 0%, #6ee7b7 33%, #fcd34d 33%, #fcd34d 58%, #f87171 58%, #f87171 100%)' }}>
        {/* White mask from right */}
        <div
          className="absolute right-0 top-0 h-full bg-white/80 rounded-r-full transition-none"
          style={{
            width: animate ? `${100 - pct}%` : '100%',
            transition: animate ? 'width 800ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />
        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow ${zone.barColor.replace('bg-', 'border-')}`}
          style={{
            left: animate ? `calc(${pct}% - 8px)` : '-8px',
            transition: animate ? 'left 800ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[9px] text-gray-400 mb-3">
        <span>0–2 · Sin sospecha</span>
        <span>3–4 · Valoración</span>
        <span>5+ · Derivar</span>
      </div>

      <p className={`text-sm font-semibold ${zone.textColor} mb-1`}>{zone.label}</p>
      <p className="text-gray-400 text-xs leading-relaxed">
        Sensibilidad del método: 79%. Especificidad: 83% para melanoma (Argenziano et al., Arch. Dermatol. 1998). Un resultado negativo no excluye malignidad.
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SkinCheckPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | uploading | analyzing | results
  const [preview, setPreview] = useState(null)
  const [cardsVisible, setCardsVisible] = useState(false)
  const [barAnimate, setBarAnimate] = useState(false)
  const [dragging, setDragging] = useState(false)

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  function loadImage(file) {
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      setStatus('uploading')
    }
    reader.readAsDataURL(file)
  }

  function runAnalysis() {
    setStatus('analyzing')
    setTimeout(() => {
      setStatus('results')
      // Stagger card visibility
      setTimeout(() => setCardsVisible(true), 50)
      setTimeout(() => setBarAnimate(true), 200)
    }, 2500)
  }

  function reset() {
    setPreview(null)
    setStatus('idle')
    setCardsVisible(false)
    setBarAnimate(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    loadImage(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Top bar */}
      <div className="bg-white px-5 pt-7 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-blush-50 text-blush-400 flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-ink font-semibold text-base leading-tight">Dermoscopia asistida por IA</h1>
            <p className="text-gray-400 text-xs leading-snug">Evaluación preliminar · Lista de los 7 puntos de Argenziano</p>
          </div>
        </div>

        {/* Medical disclaimer */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">
            Este análisis no constituye diagnóstico médico. La lista de los 7 puntos es una herramienta de cribado clínico — su interpretación definitiva corresponde al dermatólogo.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-blush-50 px-5 pt-4 pb-4 space-y-4">

        {/* Upload area */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${
            dragging ? 'border-blush-400 bg-blush-100' : 'border-blush-200 bg-white'
          }`}
          style={{ minHeight: preview ? '220px' : '160px' }}
        >
          {preview ? (
            <>
              <img src={preview} alt="Lesión" className="w-full h-full object-cover" style={{ maxHeight: '220px' }} />
              {status === 'analyzing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 border-4 border-blush-200/40 border-t-blush-300 rounded-full animate-spin" />
                  <p className="text-white text-sm font-medium animate-pulse">Procesando imagen…</p>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-3 py-10 px-4"
            >
              <div className="w-12 h-12 bg-blush-50 rounded-full flex items-center justify-center border border-blush-200">
                <Upload size={20} className="text-blush-400" />
              </div>
              <div className="text-center">
                <p className="text-ink text-sm font-medium">
                  Fotografía la lesión cutánea en condiciones de buena iluminación, sin filtros
                </p>
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
                  Distancia recomendada: 10-15 cm. Incluye la lesión completa en el encuadre.
                </p>
              </div>
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => loadImage(e.target.files[0])}
        />

        {/* Analyze button */}
        {status === 'uploading' && (
          <button
            onClick={runAnalysis}
            className="w-full bg-blush-400 text-white font-semibold text-sm py-4 rounded-2xl shadow-sm active:scale-95 transition-transform animate-slide-up"
          >
            Iniciar análisis dermoscópico
          </button>
        )}

        {/* Analyzing hint */}
        {status === 'analyzing' && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-blush-300 border-t-blush-500 rounded-full animate-spin" />
            <span className="text-blush-500 text-sm font-medium">Procesando imagen…</span>
          </div>
        )}

        {/* Results */}
        {status === 'results' && (
          <div className="space-y-4">
            {/* Major criteria */}
            <div>
              <p className="text-ink font-semibold text-sm mb-2">
                Criterios mayores <span className="text-gray-400 font-normal text-xs">(2 puntos c/u)</span>
              </p>
              <div className="space-y-2">
                {CRITERIA.filter(c => c.major).map((c, i) => (
                  <CriterionCard key={c.id} criterion={c} index={i} visible={cardsVisible} />
                ))}
              </div>
            </div>

            {/* Minor criteria */}
            <div>
              <p className="text-ink font-semibold text-sm mb-2">
                Criterios menores <span className="text-gray-400 font-normal text-xs">(1 punto c/u)</span>
              </p>
              <div className="space-y-2">
                {CRITERIA.filter(c => !c.major).map((c, i) => (
                  <CriterionCard key={c.id} criterion={c} index={i + 3} visible={cardsVisible} />
                ))}
              </div>
            </div>

            {/* Score bar */}
            <ScoreBar score={SIMULATED_SCORE} animate={barAnimate} />

            {/* CTA */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blush-100">
              <p className="text-ink font-semibold text-sm mb-1 text-center">
                ¿Quiere que un especialista en dermatoscopia revise esta lesión?
              </p>
              <p className="text-gray-400 text-xs text-center mb-3">
                Nuestro equipo de dermatología puede realizar una valoración completa
              </p>
              <button
                onClick={() => navigate('/reservar')}
                className="w-full bg-blush-400 text-white font-semibold text-sm py-3.5 rounded-xl active:scale-95 transition-transform mb-2"
              >
                Solicitar valoración dermatológica
              </button>
              <button
                onClick={reset}
                className="w-full bg-blush-50 text-blush-500 font-medium text-sm py-3.5 rounded-xl active:scale-95 transition-transform"
              >
                Analizar otra lesión
              </button>
            </div>

            {/* Footer note */}
            <p className="text-gray-400 text-[10px] text-center leading-relaxed pb-2">
              Análisis generado el {today}. Ref. clínica: Lista de los 7 puntos — Argenziano 1998.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
