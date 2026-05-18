import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, Share, ArrowUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function useInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (isMobile && !isStandalone) {
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) setShow(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-banner-dismissed', '1')
    setShow(false)
  }

  return { show, dismiss }
}

const DEMO_ACCOUNTS = [
  {
    email: 'admin@lumiere.com',
    label: 'Administrador',
    desc: 'Panel completo · gestión de clínica',
    color: '#2D2D2D',
  },
  {
    email: 'dra.garcia@lumiere.com',
    label: 'Dra. García',
    desc: 'Medicina Estética · vista de médico',
    color: '#C8A882',
  },
  {
    email: 'paciente@lumiere.com',
    label: 'Sofía Restrepo',
    desc: 'Paciente · su perfil, citas, análisis',
    color: '#D4A5B4',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { show: showBanner, dismiss: dismissBanner } = useInstallBanner()

  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  function fillDemo(acc) {
    setEmail(acc.email)
    setPassword('demo1234')
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      const user = await login(email.trim(), password)
      // Redirige según rol: paciente → su perfil; staff → dashboard
      const slug = user.clinica_slug || 'clinica-lumiere'
      const dest = user.rol === 'paciente' ? 'mi-perfil' : 'dashboard'
      navigate(`/clinica/${slug}/${dest}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 pt-14 pb-6">
        <p className="text-gray-400 text-xs tracking-widest uppercase font-semibold mb-1">
          Clínica Lumière
        </p>
        <h1 className="text-ink text-2xl font-semibold mb-1">Bienvenida</h1>
        <p className="text-gray-400 text-sm mb-8">Accede a tu panel clínico</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          {/* Email */}
          <div>
            <label className="text-gray-600 text-xs font-medium block mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@lumiere.com"
              autoComplete="email"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-ink placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-gray-600 text-xs font-medium block mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-ink placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="text-right -mt-1">
            <Link
              to="/reset-password"
              className="text-xs font-medium"
              style={{ color: '#C8A882' }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 animate-slide-up">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full font-semibold text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 mt-1"
            style={{
              backgroundColor: email && password ? '#2D2D2D' : '#e5e7eb',
              color: email && password ? '#fff' : '#9ca3af',
              cursor: email && password ? 'pointer' : 'not-allowed',
            }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><LogIn size={16} /> Acceder</>
            }
          </button>
        </form>
      </div>

      {/* PWA install banner */}
      {showBanner && (
        <div
          className="mx-5 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: '#FDF0F4', border: '1px solid #F5C6D5' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#D4537E' }}
          >
            <ArrowUp size={16} className="text-white" />
          </div>
          <p className="text-xs text-gray-600 flex-1 leading-snug">
            Instala Veloura en tu movil — toca{' '}
            <Share size={11} className="inline-block mx-0.5 text-gray-500" />{' '}
            compartir y luego <strong className="text-gray-800">Anadir a inicio</strong>
          </p>
          <button
            onClick={dismissBanner}
            className="text-gray-300 hover:text-gray-400 text-lg leading-none flex-shrink-0 px-1"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>
      )}

      {/* Demo accounts section */}
      <div className="px-7 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gray-100" />
          <p className="text-gray-400 text-xs font-medium">Cuentas de demo</p>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              onClick={() => fillDemo(acc)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:border-gray-200 active:scale-95 transition-all"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: acc.color }}
              >
                {acc.label[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm font-semibold">{acc.label}</p>
                <p className="text-gray-400 text-xs">{acc.desc}</p>
              </div>
              <span className="text-gray-300 text-xs font-mono">demo1234</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
