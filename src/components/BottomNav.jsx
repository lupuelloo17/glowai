import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Scan, CalendarDays, Clock, Microscope } from 'lucide-react'

const TABS = [
  { path: '/home',       icon: Home,        label: 'Inicio' },
  { path: '/analisis',   icon: Scan,        label: 'Análisis' },
  { path: '/skin-check', icon: Microscope,  label: 'Dermos.' },
  { path: '/reservar',   icon: CalendarDays,label: 'Reservar' },
  { path: '/historial',  icon: Clock,       label: 'Historial' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="border-t border-blush-100 bg-white px-2 py-2 flex items-center justify-around">
      {TABS.map(({ path, icon: Icon, label }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
          >
            <Icon
              size={20}
              className={active ? 'text-blush-500' : 'text-gray-300'}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <span className={`text-[10px] font-medium ${active ? 'text-blush-500' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
