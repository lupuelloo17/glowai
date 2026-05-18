import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, Microscope, CalendarDays, Settings,
  Home, User as UserIcon, ImageIcon, MessageCircle,
} from 'lucide-react'
import { useClinic } from '../contexts/ClinicContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ClinicNav() {
  const navigate           = useNavigate()
  const { pathname, hash } = useLocation()
  const { slug }           = useParams()
  const { clinica }        = useClinic()
  const { user }           = useAuth()

  const isAdmin    = user?.rol === 'admin'
  const isMedico   = user?.rol === 'medico'
  const isPaciente = user?.rol === 'paciente'

  // Badge de mensajes no leídos
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!supabase || !user?.id) return
    let cancelled = false

    async function fetchUnread() {
      if (isPaciente) {
        // Paciente: mensajes del médico que no ha leído
        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('destinatario_id', user.id)
          .eq('leido', false)
          .neq('remitente_id', user.id)
        if (!cancelled) setUnread(count ?? 0)
      } else if (isMedico) {
        // Médico: solo mensajes dirigidos a él específicamente
        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('destinatario_usuario_id', user.id)
          .eq('leido', false)
        if (!cancelled) setUnread(count ?? 0)
      } else {
        // Admin/recepcion: todos los no leídos de la clínica
        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', user.clinica_id)
          .eq('leido', false)
        if (!cancelled) setUnread(count ?? 0)
      }
    }

    fetchUnread()
    // Escuchar cambios en mensajes para actualizar badge
    const ch = supabase
      .channel(`nav-unread-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, fetchUnread)
      .subscribe()
    return () => { cancelled = true; ch.unsubscribe() }
  }, [user?.id, isPaciente, user?.clinica_id])

  const TABS = isPaciente
    ? [
        { label: 'Inicio',    icon: Home,           path: `/clinica/${slug}/mi-perfil` },
        { label: 'Evolución', icon: ImageIcon,       path: `/clinica/${slug}/mi-perfil/evolucion` },
        { label: 'Chat',      icon: MessageCircle,   path: `/clinica/${slug}/mi-perfil/chat`, badge: unread },
        { label: 'Datos',     icon: UserIcon,        path: `/clinica/${slug}/mi-perfil`, hash: '#datos' },
      ]
    : isMedico
    ? [
        { label: 'Dashboard', icon: LayoutDashboard, path: `/clinica/${slug}/dashboard` },
        { label: 'Pacientes', icon: Users,           path: `/clinica/${slug}/pacientes` },
        { label: 'Análisis',  icon: Microscope,      path: `/clinica/${slug}/analisis`  },
        { label: 'Agenda',    icon: CalendarDays,    path: `/clinica/${slug}/agenda`    },
        { label: 'Chat',      icon: MessageCircle,   path: `/clinica/${slug}/conversaciones`, badge: unread },
      ]
    : isAdmin
    ? [
        { label: 'Dashboard', icon: LayoutDashboard, path: `/clinica/${slug}/dashboard` },
        { label: 'Pacientes', icon: Users,           path: `/clinica/${slug}/pacientes` },
        { label: 'Análisis',  icon: Microscope,      path: `/clinica/${slug}/analisis`  },
        { label: 'Chat',      icon: MessageCircle,   path: `/clinica/${slug}/conversaciones`, badge: unread },
        { label: 'Config',    icon: Settings,        path: `/clinica/${slug}/configuracion` },
      ]
    : [
        { label: 'Dashboard', icon: LayoutDashboard, path: `/clinica/${slug}/dashboard` },
        { label: 'Pacientes', icon: Users,           path: `/clinica/${slug}/pacientes` },
        { label: 'Análisis',  icon: Microscope,      path: `/clinica/${slug}/analisis`  },
        { label: 'Agenda',    icon: CalendarDays,    path: `/clinica/${slug}/agenda`    },
        { label: 'Chat',      icon: MessageCircle,   path: `/clinica/${slug}/conversaciones`, badge: unread },
      ]

  const brand = clinica?.color_primario ?? '#C8A882'

  return (
    <nav className="border-t border-gray-100 bg-white px-1 py-2 flex items-center justify-around flex-shrink-0">
      {TABS.map(({ label, icon: Icon, path, hash: tabHash, badge }) => {
        const active = tabHash
          ? (pathname === path && hash === tabHash)
          : pathname.startsWith(path) && (!tabHash)
        // Evitar que "Inicio" quede activo cuando está en sub-rutas de mi-perfil
        const isInicio = path === `/clinica/${slug}/mi-perfil` && !tabHash
        const activeFixed = isInicio
          ? (pathname === path && !hash)
          : active

        return (
          <button
            key={`${path}${tabHash ?? ''}`}
            onClick={() => navigate(path + (tabHash ?? ''))}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all relative"
          >
            <div className="relative">
              <Icon
                size={20}
                style={activeFixed ? { color: brand } : {}}
                className={activeFixed ? '' : 'text-gray-300'}
                strokeWidth={activeFixed ? 2.2 : 1.8}
              />
              {badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5"
                  style={{ backgroundColor: brand }}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-medium"
              style={activeFixed ? { color: brand } : { color: '#9ca3af' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
