import { Sparkles, Star } from 'lucide-react'

const TESTIMONIALS = [
  { name: 'María R.', text: 'Increíble precisión en el análisis.' },
  { name: 'Sofía L.', text: 'Los tratamientos recomendados cambiaron mi piel.' },
]

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Header gradient */}
      <div className="relative bg-gradient-to-br from-rose-400 via-pink-400 to-rose-300 px-6 pt-12 pb-16 text-center overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-8 w-32 h-32 bg-white/10 rounded-full" />

        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4 relative z-10">
          <span className="text-4xl">✨</span>
        </div>

        {/* Clinic branding */}
        <div className="relative z-10">
          <p className="text-rose-100 text-sm font-medium tracking-widest uppercase mb-1">
            Clínica Lumina
          </p>
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Glow<span className="text-rose-100">AI</span>
          </h1>
          <p className="text-white/80 text-sm mt-2 font-light">
            Tu piel analizada con inteligencia artificial
          </p>
        </div>
      </div>

      {/* Wave separator */}
      <div className="relative -mt-4 z-10">
        <svg viewBox="0 0 390 40" className="w-full" preserveAspectRatio="none">
          <path d="M0,20 C100,40 290,0 390,20 L390,40 L0,40 Z" fill="white" />
        </svg>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 -mt-2 flex flex-col">
        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {['Análisis IA', 'Personalizado', 'En segundos'].map((tag) => (
            <span
              key={tag}
              className="bg-rose-50 text-rose-500 text-xs font-semibold px-3 py-1 rounded-full border border-rose-100"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-rose-50 rounded-2xl p-5 mb-6">
          <h2 className="text-gray-800 font-semibold text-sm mb-3">
            ¿Cómo funciona?
          </h2>
          <div className="space-y-3">
            {[
              { step: '01', icon: '📸', text: 'Sube una foto de tu rostro' },
              { step: '02', icon: '🔍', text: 'La IA analiza tu piel en detalle' },
              { step: '03', icon: '💆‍♀️', text: 'Recibe tratamientos personalizados' },
            ].map(({ step, icon, text }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-base flex-shrink-0">
                  {icon}
                </span>
                <div>
                  <span className="text-rose-300 text-xs font-bold">{step}</span>
                  <p className="text-gray-700 text-sm leading-snug">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-6 space-y-2">
          {TESTIMONIALS.map(({ name, text }) => (
            <div key={name} className="flex items-start gap-2 bg-white border border-rose-100 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                {name[0]}
              </div>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-xs">{text}</p>
                <p className="text-rose-400 text-xs font-medium mt-0.5">{name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div className="mt-auto pb-8">
          <button
            onClick={onStart}
            className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold text-base py-4 rounded-2xl shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:from-rose-500 hover:to-pink-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Analizar mi piel
          </button>
          <p className="text-center text-gray-400 text-xs mt-3">
            Gratis · Sin registro · 100% privado
          </p>
        </div>
      </div>
    </div>
  )
}
