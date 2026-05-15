import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Star } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const VISITS = [
  {
    id: 1,
    date: '18 oct 2025',
    treatment: 'Peeling Enzimático',
    specialist: 'Dra. Carmen López',
    score: 5,
    note: 'Piel notablemente más uniforme. Se redujo la apariencia de poros en un 40%.',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
    tag: 'Completada',
    tagColor: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 2,
    date: '5 sep 2025',
    treatment: 'Vitamina C + Ácido Hialurónico',
    specialist: 'Dra. Carmen López',
    score: 5,
    note: 'Mejora visible en tono y luminosidad. Las ojeras disminuyeron considerablemente.',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    tag: 'Completada',
    tagColor: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 3,
    date: '12 ago 2025',
    treatment: 'Hidratación Profunda',
    specialist: 'Dra. Ana Ruiz',
    score: 4,
    note: 'Primera sesión. Piel más hidratada, leve mejoría en líneas de expresión.',
    photo: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=80&h=80&fit=crop&crop=face',
    tag: 'Completada',
    tagColor: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 4,
    date: '3 jul 2025',
    treatment: 'Consulta Inicial',
    specialist: 'Dra. Carmen López',
    score: 5,
    note: 'Diagnóstico de piel mixta. Plan de tratamiento personalizado elaborado.',
    photo: null,
    tag: 'Consulta',
    tagColor: 'bg-blush-50 text-blush-500',
  },
]

const SKIN_PROGRESS = [
  { label: 'oct 2025', score: 68 },
  { label: 'sep 2025', score: 60 },
  { label: 'ago 2025', score: 52 },
  { label: 'jul 2025', score: 44 },
]

export default function HistorialPage() {
  const navigate = useNavigate()

  const maxScore = 100
  const chartH = 60

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
          <h1 className="text-ink font-semibold text-base">Historial de visitas</h1>
          <p className="text-gray-400 text-xs">{VISITS.length} sesiones registradas</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-blush-50 px-5 pb-4 pt-3 space-y-4">
        {/* Progress chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-ink font-semibold text-sm mb-3">Evolución de tu piel</p>
          <div className="flex items-end gap-3 justify-between px-2">
            {SKIN_PROGRESS.map(({ label, score }) => {
              const barH = Math.round((score / maxScore) * chartH)
              return (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-ink text-xs font-bold">{score}</span>
                  <div
                    className="w-full bg-gradient-to-t from-blush-400 to-blush-200 rounded-t-lg transition-all"
                    style={{ height: `${barH}px` }}
                  />
                  <span className="text-gray-400 text-[9px] text-center leading-tight">{label}</span>
                </div>
              )
            })}
          </div>
          <p className="text-gray-400 text-xs text-center mt-3">
            Puntuación de piel (escala 0–100)
          </p>
        </div>

        {/* Visit cards */}
        <div>
          <p className="text-ink font-semibold text-sm mb-2">Sesiones</p>
          <div className="space-y-3">
            {VISITS.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start gap-3 mb-2">
                  {/* Photo placeholder */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-blush-50 flex-shrink-0">
                    {v.photo ? (
                      <img src={v.photo} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blush-300 text-xl">
                        🌸
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-ink text-sm font-semibold">{v.treatment}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.tagColor}`}>
                        {v.tag}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">{v.date} · {v.specialist}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i < v.score ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Note */}
                <p className="text-gray-500 text-xs leading-relaxed border-t border-blush-50 pt-2">
                  {v.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/reservar')}
          className="w-full bg-ink text-white font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <ChevronRight size={18} />
          Nueva cita
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
