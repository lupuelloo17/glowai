import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Camera, ChevronRight, CheckCircle2 } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const ZONES = [
  {
    id: 'ojeras',
    label: 'Ojeras',
    icon: '👁️',
    desc: 'Pigmentación periorbital moderada',
    severity: 'Media',
    top: '38%', left: '50%',
    dotColor: 'bg-violet-400',
    badgeColor: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'lineas',
    label: 'Líneas de expresión',
    icon: '〰️',
    desc: 'Arrugas dinámicas en frente y entrecejo',
    severity: 'Leve',
    top: '20%', left: '50%',
    dotColor: 'bg-amber-400',
    badgeColor: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'poros',
    label: 'Poros dilatados',
    icon: '🔍',
    desc: 'Zona T con poros visibles',
    severity: 'Alta',
    top: '52%', left: '50%',
    dotColor: 'bg-rose-500',
    badgeColor: 'bg-rose-50 text-rose-600',
  },
]

const TREATMENTS = [
  {
    id: 'vitamina_c',
    icon: '✨',
    name: 'Vitamina C + Ácido Hialurónico',
    target: 'Ojeras y luminosidad',
    sessions: '4 sesiones',
    price: '€75 / sesión',
    highlight: true,
  },
  {
    id: 'peeling',
    icon: '🧴',
    name: 'Peeling Enzimático',
    target: 'Poros y textura',
    sessions: '3 sesiones',
    price: '€85 / sesión',
    highlight: false,
  },
]

const DEMO_PHOTO = 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=450&fit=crop&crop=faces'

export default function AnalisisPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [photo, setPhoto] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [done, setDone] = useState(false)
  const [activeZone, setActiveZone] = useState(null)
  const [progress, setProgress] = useState(0)

  function runAnalysis(url) {
    setPhoto(url)
    setDone(false)
    setAnalyzing(true)
    setProgress(0)
    let p = 0
    const iv = setInterval(() => {
      p += 2
      setProgress(p)
      if (p >= 100) { clearInterval(iv); setAnalyzing(false); setDone(true) }
    }, 48)
  }

  function handleFile(file) {
    if (!file?.type.startsWith('image/')) return
    runAnalysis(URL.createObjectURL(file))
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white px-5 pt-7 pb-4">
        <button
          onClick={() => navigate('/home')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blush-50 text-blush-400"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-ink font-semibold text-base">Análisis Facial</h1>
          <p className="text-gray-400 text-xs">IA · Resultados en segundos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-blush-50 px-5 pb-4 pt-3 space-y-4">
        {/* Photo zone */}
        <div
          className="relative rounded-2xl overflow-hidden bg-white shadow-sm"
          style={{ height: '240px' }}
        >
          {photo ? (
            <>
              <img src={photo} alt="Foto" className="w-full h-full object-cover" />

              {/* Scanning overlay */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 border-4 border-blush-200/40 border-t-blush-300 rounded-full animate-spin" />
                  <p className="text-white text-sm font-medium">Escaneando zonas…</p>
                  <div className="w-44 bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blush-300 rounded-full transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-white/70 text-xs">{progress}%</p>
                </div>
              )}

              {/* Pins */}
              {done && ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setActiveZone(activeZone?.id === z.id ? null : z)}
                  style={{ top: z.top, left: z.left }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                >
                  <span className={`flex w-4 h-4 rounded-full ${z.dotColor} ring-2 ring-white shadow-md animate-pulse`} />
                </button>
              ))}

              {/* Change photo btn */}
              {!analyzing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 bg-white/90 text-ink text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-1"
                >
                  <Camera size={11} /> Cambiar
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blush-200 rounded-2xl hover:border-blush-300 hover:bg-blush-50 transition-colors"
            >
              <div className="w-12 h-12 bg-blush-50 rounded-full flex items-center justify-center">
                <Upload size={20} className="text-blush-400" />
              </div>
              <p className="text-ink text-sm font-medium">Sube tu foto</p>
              <p className="text-gray-400 text-xs">JPG, PNG · Arrastra o toca</p>
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Demo button */}
        {!photo && (
          <button
            onClick={() => runAnalysis(DEMO_PHOTO)}
            className="w-full bg-white border border-blush-200 text-blush-500 text-sm font-medium py-3 rounded-2xl active:scale-95 transition-transform"
          >
            Usar foto de demostración
          </button>
        )}

        {/* Active zone tooltip */}
        {activeZone && (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-blush-100 flex items-center gap-3 animate-slide-up">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${activeZone.dotColor}`} />
            <div className="flex-1">
              <p className="text-ink font-semibold text-sm">{activeZone.label}</p>
              <p className="text-gray-500 text-xs">{activeZone.desc}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeZone.badgeColor}`}>
              {activeZone.severity}
            </span>
          </div>
        )}

        {/* Results */}
        {done && (
          <div className="space-y-4 animate-slide-up">
            {/* Score banner */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-16 h-16 relative flex-shrink-0">
                <svg className="rotate-[-90deg]" width="64" height="64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#FDF2F4" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none" stroke="#E8A0B0" strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - 0.68)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-ink text-lg font-bold">68</span>
                  <span className="text-gray-400 text-[9px]">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Puntuación de piel</p>
                <p className="text-ink font-bold text-lg">Buena</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Con tratamiento puedes llegar a <span className="text-blush-500 font-semibold">85+</span>
                </p>
              </div>
            </div>

            {/* Zones */}
            <div>
              <p className="text-ink font-semibold text-sm mb-2">Zonas detectadas</p>
              <div className="space-y-2">
                {ZONES.map((z) => (
                  <div key={z.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-xl">{z.icon}</span>
                    <div className="flex-1">
                      <p className="text-ink text-sm font-medium">{z.label}</p>
                      <p className="text-gray-400 text-xs">{z.desc}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${z.badgeColor}`}>
                      {z.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatments */}
            <div>
              <p className="text-ink font-semibold text-sm mb-2">Tratamientos sugeridos</p>
              <div className="space-y-2">
                {TREATMENTS.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-2xl p-4 shadow-sm ${t.highlight ? 'bg-ink' : 'bg-white border border-blush-100'}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{t.icon}</span>
                        <p className={`text-sm font-semibold ${t.highlight ? 'text-white' : 'text-ink'}`}>
                          {t.name}
                        </p>
                      </div>
                      {t.highlight && (
                        <span className="text-[10px] bg-blush-400 text-white font-bold px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mb-2 ml-8 ${t.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t.target}
                    </p>
                    <div className="flex items-center justify-between ml-8">
                      <div className="flex gap-3">
                        <span className={`text-xs ${t.highlight ? 'text-blush-300' : 'text-gray-400'}`}>{t.sessions}</span>
                        <span className={`text-xs font-semibold ${t.highlight ? 'text-blush-300' : 'text-blush-500'}`}>{t.price}</span>
                      </div>
                      <button
                        onClick={() => navigate('/reservar', { state: { treatmentId: t.id } })}
                        className={`text-xs font-semibold flex items-center gap-0.5 ${t.highlight ? 'text-blush-300' : 'text-blush-500'}`}
                      >
                        Reservar <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/reservar')}
              className="w-full bg-ink text-white font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 size={18} />
              Reservar cita
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
