import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, ArrowLeft } from 'lucide-react'
import { PLANES, FEATURE_LABELS, formatEUR } from '../config/planes'

const BRAND = '#C8A882'

const PLAN_ORDER = ['esencial', 'premium', 'elite']

// Map plan key → Stripe price ID from env
const PRICE_IDS = {
  esencial: import.meta.env.VITE_STRIPE_PRICE_ESENCIAL,
  premium:  import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
  elite:    import.meta.env.VITE_STRIPE_PRICE_ELITE,
}

const FEATURE_LIST = [
  { key: 'citas',              label: 'Gestión de citas' },
  { key: 'historial_fotos',    label: 'Historial fotográfico' },
  { key: 'protocolos',         label: 'Protocolos de tratamiento' },
  { key: 'dashboard_basico',   label: 'Dashboard clínico' },
  { key: 'dermoscopia_ia',     label: 'Dermoscopia con IA' },
  { key: 'cosmeceuticos',      label: 'Recomendaciones cosmecéuticas' },
  { key: 'supervision_remota', label: 'Supervisión remota' },
  { key: 'alertas_abandono',   label: 'Alertas de abandono' },
  { key: 'multisede',          label: 'Gestión multi-sede' },
]

export default function PreciosPage() {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError]            = useState(null)

  async function handleEmpezar(planKey) {
    const priceId = PRICE_IDS[planKey]
    if (!priceId || priceId.startsWith('price_PENDING')) {
      setError('Los planes aún no están configurados en Stripe. Crea los productos en el dashboard de Stripe y actualiza los Price IDs en .env')
      return
    }
    setError(null)
    setLoadingPlan(planKey)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceId, clinicaNombre: 'Mi Clínica' }),
      })
      const text = await res.text()
      if (!text) throw new Error('Las funciones API solo funcionan en producción (Vercel). Ejecuta "vercel dev" para probar en local.')
      const { url, error: apiErr } = JSON.parse(text)
      if (apiErr) throw new Error(apiErr)
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 z-30">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-500 text-sm hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Volver
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: BRAND }}
            >
              G
            </div>
            <span className="font-bold text-gray-900 text-base">GlowAI</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
            Acceder
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: BRAND + '18', color: BRAND }}
          >
            <Zap size={11} fill="currentColor" /> Sin permanencia · Cancela cuando quieras
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Planes sin sorpresas
          </h1>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Todos los precios incluyen IVA. Pago mensual con tarjeta. Sin comisiones ocultas.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {PLAN_ORDER.map(key => {
            const plan     = PLANES[key]
            const isPopular = key === 'premium'
            const isLoading = loadingPlan === key

            return (
              <div
                key={key}
                className="rounded-2xl border p-6 flex flex-col relative"
                style={isPopular
                  ? { borderColor: BRAND, boxShadow: `0 0 0 2px ${BRAND}` }
                  : { borderColor: '#e5e7eb' }
                }
              >
                {isPopular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                    style={{ backgroundColor: BRAND }}
                  >
                    Más popular
                  </div>
                )}

                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  {plan.nombre}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {formatEUR(plan.precio)}
                  </span>
                  <span className="text-gray-400 text-sm">/mes + IVA</span>
                </div>
                <p className="text-gray-500 text-xs mb-1">{plan.descripcion}</p>
                <p className="text-gray-400 text-[11px] mb-5">
                  Hasta {plan.max_pacientes === Infinity ? '∞' : plan.max_pacientes} pacientes
                  · {plan.max_medicos === Infinity ? '∞' : plan.max_medicos} médico{plan.max_medicos !== 1 ? 's' : ''}
                </p>

                <ul className="space-y-2 flex-1 mb-6">
                  {FEATURE_LIST.map(({ key: fk, label }) => {
                    const incluido = plan.features[fk]
                    return (
                      <li key={fk} className="flex items-center gap-2">
                        <Check
                          size={14}
                          className="flex-shrink-0"
                          style={{ color: incluido ? BRAND : '#d1d5db' }}
                        />
                        <span className="text-xs" style={{ color: incluido ? '#374151' : '#9ca3af' }}>
                          {label}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <button
                  onClick={() => handleEmpezar(key)}
                  disabled={!!loadingPlan}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={isPopular
                    ? { backgroundColor: loadingPlan ? '#d1d5db' : BRAND, color: '#fff' }
                    : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {isLoading ? 'Redirigiendo…' : 'Empezar ahora'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Test card note */}
        <div className="bg-gray-50 rounded-2xl px-5 py-4 text-center text-xs text-gray-400 max-w-md mx-auto">
          <p className="font-semibold text-gray-600 mb-1">Modo de prueba activo</p>
          <p>Usa la tarjeta <strong className="text-gray-700 font-mono">4242 4242 4242 4242</strong>, cualquier fecha futura y CVC de 3 dígitos.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>GlowAI · Valencia, España · contacto@glowai.app</p>
          <div className="flex items-center gap-4">
            <Link to="/politica-privacidad" className="hover:text-gray-600 transition-colors">Política de Privacidad</Link>
            <Link to="/" className="hover:text-gray-600 transition-colors">Inicio</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
