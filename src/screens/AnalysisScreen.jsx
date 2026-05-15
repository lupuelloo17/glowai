import { useState, useRef } from 'react'
import { ArrowLeft, Upload, Camera, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react'

const ZONES = [
  { id: 'frente',    label: 'Frente',         color: 'bg-amber-400',  issue: 'Líneas de expresión',   severity: 'Media',  top: '18%', left: '50%' },
  { id: 'mejilla_i', label: 'Mejilla izq.',   color: 'bg-rose-400',   issue: 'Manchas solares',        severity: 'Alta',   top: '48%', left: '25%' },
  { id: 'mejilla_d', label: 'Mejilla der.',   color: 'bg-rose-400',   issue: 'Manchas solares',        severity: 'Alta',   top: '48%', left: '75%' },
  { id: 'nariz',     label: 'Nariz',          color: 'bg-orange-400', issue: 'Poros dilatados',        severity: 'Media',  top: '50%', left: '50%' },
  { id: 'menton',    label: 'Mentón',         color: 'bg-purple-400', issue: 'Acné hormonal',          severity: 'Baja',   top: '78%', left: '50%' },
]

const TREATMENTS = [
  {
    icon: '💧',
    name: 'Hidratación Profunda',
    desc: 'Sérum con ácido hialurónico + vitamina C',
    badge: 'Recomendado',
    badgeColor: 'bg-rose-100 text-rose-600',
  },
  {
    icon: '✨',
    name: 'Peeling Químico',
    desc: 'Ácido glicólico al 20% — manchas y textura',
    badge: 'Popular',
    badgeColor: 'bg-amber-100 text-amber-600',
  },
  {
    icon: '🔬',
    name: 'Microagujas (RF)',
    desc: 'Estimulación de colágeno para líneas finas',
    badge: 'Avanzado',
    badgeColor: 'bg-purple-100 text-purple-600',
  },
]

const SKIN_SCORE = 68

function SkinScoreRing({ score }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="rotate-[-90deg]" width="96" height="96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#ffe4e6" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke="url(#glowGrad)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

export default function AnalysisScreen({ uploadedImage, setUploadedImage, onBook, onBack }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [activeZone, setActiveZone] = useState(null)
  const fileRef = useRef(null)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setUploadedImage(url)
    setAnalyzed(false)
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setAnalyzed(true)
    }, 2500)
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-gray-800 font-semibold text-base leading-tight">Análisis Facial</h1>
          <p className="text-gray-400 text-xs">Sube tu foto para comenzar</p>
        </div>
      </div>

      <div className="flex-1 px-5 overflow-y-auto pb-6">
        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploadedImage && fileRef.current?.click()}
          className={`relative rounded-2xl overflow-hidden mb-4 ${
            uploadedImage ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{ height: '260px' }}
        >
          {uploadedImage ? (
            <>
              <img
                src={uploadedImage}
                alt="Foto analizada"
                className="w-full h-full object-cover"
              />
              {/* Overlay pins */}
              {analyzed && !analyzing && ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setActiveZone(activeZone?.id === zone.id ? null : zone)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ top: zone.top, left: zone.left }}
                >
                  <span className={`flex w-4 h-4 rounded-full ${zone.color} ring-2 ring-white shadow-md animate-pulse`} />
                </button>
              ))}
              {/* Scanning overlay */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white text-sm font-medium animate-pulse-soft">Analizando tu piel…</p>
                  <div className="w-40 bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-white rounded-full animate-[progress_2.5s_ease-in-out_forwards]" style={{ animation: 'progressBar 2.5s ease-in-out forwards' }} />
                  </div>
                </div>
              )}
              {/* Change photo button */}
              {!analyzing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-rose-500 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1"
                >
                  <Camera size={12} /> Cambiar foto
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full border-2 border-dashed border-rose-200 rounded-2xl bg-rose-50 flex flex-col items-center justify-center gap-3 hover:border-rose-300 hover:bg-rose-100 transition-colors">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Upload size={22} className="text-rose-400" />
              </div>
              <div className="text-center">
                <p className="text-gray-700 font-medium text-sm">Sube tu foto</p>
                <p className="text-gray-400 text-xs mt-1">JPG, PNG · Arrastra o toca</p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Active zone tooltip */}
        {activeZone && (
          <div className="mb-4 bg-white border border-rose-100 rounded-xl p-3 shadow-sm animate-slide-up flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${activeZone.color} flex-shrink-0`} />
            <div className="flex-1">
              <p className="text-gray-800 font-semibold text-sm">{activeZone.label}</p>
              <p className="text-gray-500 text-xs">{activeZone.issue}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              activeZone.severity === 'Alta' ? 'bg-rose-100 text-rose-600' :
              activeZone.severity === 'Media' ? 'bg-amber-100 text-amber-600' :
              'bg-green-100 text-green-600'
            }`}>
              {activeZone.severity}
            </span>
          </div>
        )}

        {/* Results */}
        {analyzed && (
          <div className="animate-slide-up">
            {/* Score */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <SkinScoreRing score={SKIN_SCORE} />
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Puntuación de piel</p>
                <p className="text-gray-800 font-bold text-lg">Buena</p>
                <p className="text-gray-500 text-xs leading-snug mt-1">
                  Con tratamiento puedes alcanzar <span className="text-rose-500 font-semibold">85+</span>
                </p>
              </div>
            </div>

            {/* Zone legend */}
            <div className="mb-4">
              <p className="text-gray-700 font-semibold text-sm mb-2">Zonas detectadas</p>
              <div className="grid grid-cols-2 gap-2">
                {ZONES.map((zone) => (
                  <div key={zone.id} className="flex items-center gap-2 bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${zone.color}`} />
                    <div className="min-w-0">
                      <p className="text-gray-700 text-xs font-medium truncate">{zone.label}</p>
                      <p className="text-gray-400 text-[10px] truncate">{zone.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatments */}
            <div className="mb-4">
              <p className="text-gray-700 font-semibold text-sm mb-2">Tratamientos sugeridos</p>
              <div className="space-y-2">
                {TREATMENTS.map((t) => (
                  <div key={t.name} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-gray-800 text-sm font-semibold">{t.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badgeColor}`}>
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 leading-snug">{t.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={onBook}
              className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:from-rose-500 hover:to-pink-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Reservar cita ahora
            </button>
          </div>
        )}

        {/* Demo hint when no image */}
        {!uploadedImage && (
          <div className="text-center mt-6">
            <p className="text-gray-400 text-xs">
              Puedes usar cualquier foto de rostro para probar el prototipo
            </p>
            <button
              onClick={() => {
                setUploadedImage('https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face')
                setAnalyzing(true)
                setAnalyzed(false)
                setTimeout(() => { setAnalyzing(false); setAnalyzed(true) }, 2500)
              }}
              className="mt-2 text-rose-400 text-xs underline underline-offset-2 font-medium"
            >
              Usar foto de demostración
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
