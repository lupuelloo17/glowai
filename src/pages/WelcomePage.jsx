import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">
      {/* Hero section */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-10 text-center bg-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blush-50 rounded-full opacity-80" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-blush-50 rounded-full opacity-60" />
        </div>

        {/* Logo mark */}
        <div className="relative z-10 mb-8">
          <div className="w-24 h-24 bg-blush-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-blush-100">
            {/* Logo placeholder — replace with <img src="/logo.svg" /> */}
            <span className="text-5xl">🌸</span>
          </div>
        </div>

        {/* Brand name */}
        <div className="relative z-10 mb-3">
          <p className="text-blush-400 text-xs tracking-[0.2em] uppercase font-semibold mb-1">
            Bienvenida a
          </p>
          <h1 className="text-ink text-3xl font-light tracking-tight">
            Clínica <span className="font-semibold">Lumière</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="relative z-10 text-gray-400 text-sm leading-relaxed max-w-xs mb-10">
          Belleza personalizada con tecnología de inteligencia artificial
        </p>

        {/* Divider dots */}
        <div className="relative z-10 flex gap-1.5 mb-10">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`h-1 rounded-full ${i === 1 ? 'w-4 bg-blush-400' : 'w-1 bg-blush-200'}`} />
          ))}
        </div>

        {/* Features */}
        <div className="relative z-10 w-full space-y-3 mb-10">
          {[
            { icon: '🔬', text: 'Análisis facial con IA en segundos' },
            { icon: '💆‍♀️', text: 'Tratamientos personalizados para tu piel' },
            { icon: '📅', text: 'Reserva tu cita desde la app' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-blush-50 rounded-2xl px-4 py-3">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <p className="text-ink text-sm text-left leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/home')}
          className="relative z-10 w-full bg-ink text-white font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all duration-200"
        >
          Acceder
          <ArrowRight size={16} />
        </button>

        <p className="relative z-10 text-gray-300 text-xs mt-4">
          Prototipo de demostración
        </p>
      </div>
    </div>
  )
}
