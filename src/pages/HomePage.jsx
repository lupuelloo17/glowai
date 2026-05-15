import { useNavigate } from 'react-router-dom'
import { Scan, CalendarDays, Clock, ChevronRight, Bell, Microscope } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const PATIENT = {
  name: 'Valentina',
  lastName: 'Morales',
  skinType: 'Mixta',
  lastVisit: '18 oct 2025',
}

const NEXT_APPT = {
  treatment: 'Peeling Químico',
  date: 'Jueves, 22 mayo',
  time: '11:00',
  specialist: 'Dra. Carmen López',
}

const QUICK_ACTIONS = [
  { icon: Scan,         label: 'Analizar\nmi piel',  path: '/analisis',  color: 'bg-blush-400 text-white' },
  { icon: CalendarDays, label: 'Nueva\ncita',         path: '/reservar',  color: 'bg-ink text-white' },
  { icon: Clock,        label: 'Ver\nhistorial',      path: '/historial', color: 'bg-blush-50 text-ink' },
]

const FEATURED_TOOLS = [
  {
    icon: Microscope,
    path: '/skin-check',
    title: 'Dermoscopia asistida',
    desc: 'Evaluación de lesiones pigmentadas mediante lista de los 7 puntos',
    badge: 'Nuevo',
    bgColor: 'bg-white',
    badgeColor: 'bg-blush-50 text-blush-500',
  },
]

const TIPS = [
  { emoji: '💧', title: 'Hidratación', tip: 'Aplica sérum de vitamina C cada mañana para potenciar tu brillo natural.' },
  { emoji: '🌿', title: 'Protección', tip: 'Usa SPF 50+ a diario, incluso en días nublados.' },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blush-400 text-xs font-semibold tracking-wider uppercase mb-0.5">
              Clínica Lumière
            </p>
            <h1 className="text-ink text-2xl font-semibold">
              Hola, {PATIENT.name} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Piel {PATIENT.skinType} · Última visita: {PATIENT.lastVisit}
            </p>
          </div>
          <button className="w-10 h-10 rounded-full bg-blush-50 flex items-center justify-center relative">
            <Bell size={18} className="text-blush-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blush-500 rounded-full border border-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-blush-50 px-5 py-4 space-y-4">
        {/* Next appointment card */}
        <div className="bg-ink rounded-2xl p-4 text-white">
          <p className="text-blush-300 text-xs font-semibold tracking-wider uppercase mb-2">
            Proxima cita
          </p>
          <p className="text-white font-semibold text-base mb-1">{NEXT_APPT.treatment}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-blush-300" />
              <span className="text-gray-300 text-sm">{NEXT_APPT.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-blush-300" />
              <span className="text-gray-300 text-sm">{NEXT_APPT.time}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-gray-400 text-xs">{NEXT_APPT.specialist}</p>
            <button
              onClick={() => navigate('/reservar')}
              className="text-blush-300 text-xs font-semibold flex items-center gap-0.5"
            >
              Gestionar <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-ink font-semibold text-sm mb-2">Acciones rápidas</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(({ icon: Icon, label, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`${color} rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform`}
              >
                <Icon size={22} strokeWidth={1.8} />
                <span className="text-xs font-medium text-center leading-tight whitespace-pre-line">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured tools */}
        <div>
          <p className="text-ink font-semibold text-sm mb-2">Herramientas clínicas</p>
          <div className="space-y-2">
            {FEATURED_TOOLS.map(({ icon: Icon, path, title, desc, badge, bgColor, badgeColor }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full ${bgColor} rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-blush-100 active:scale-95 transition-transform text-left`}
              >
                <div className="w-11 h-11 bg-blush-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-blush-400" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-ink text-sm font-semibold">{title}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-snug mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Skin score */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ink font-semibold text-sm">Estado de tu piel</p>
            <button
              onClick={() => navigate('/analisis')}
              className="text-blush-400 text-xs font-semibold flex items-center gap-0.5"
            >
              Actualizar <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Hidratación',   pct: 72, color: 'bg-blue-300' },
              { label: 'Uniformidad',   pct: 58, color: 'bg-blush-400' },
              { label: 'Textura',       pct: 80, color: 'bg-emerald-300' },
              { label: 'Luminosidad',   pct: 65, color: 'bg-amber-300' },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 text-xs">{label}</span>
                  <span className="text-ink text-xs font-semibold">{pct}%</span>
                </div>
                <div className="h-1.5 bg-blush-50 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div>
          <p className="text-ink font-semibold text-sm mb-2">Consejos para ti</p>
          <div className="space-y-2">
            {TIPS.map(({ emoji, title, tip }) => (
              <div key={title} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm">
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <div>
                  <p className="text-ink text-sm font-semibold">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
