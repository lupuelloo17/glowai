import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BRAND = '#C8A882'
const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors'

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      if (!supabase) {
        // Mock mode: simular envío
        await new Promise(r => setTimeout(r, 800))
        setSent(true)
        return
      }
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/nueva-contrasena` }
      )
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col flex-1 min-h-[780px] items-center justify-center px-7 animate-fade-in">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: BRAND + '20' }}
        >
          <CheckCircle size={28} style={{ color: BRAND }} />
        </div>
        <h2 className="text-ink text-xl font-bold mb-2 text-center">Revisa tu email</h2>
        <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
          Hemos enviado un enlace a <strong>{email}</strong> para restablecer tu contraseña.
          El enlace caduca en 1 hora.
        </p>
        <Link
          to="/login"
          className="text-sm font-semibold"
          style={{ color: BRAND }}
        >
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">
      <div className="flex-1 flex flex-col px-7 pt-12 pb-6">

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-gray-400 text-sm mb-10 hover:text-gray-600 transition-colors self-start"
        >
          <ArrowLeft size={16} /> Volver
        </Link>

        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: BRAND + '20' }}
        >
          <Mail size={22} style={{ color: BRAND }} />
        </div>

        <h1 className="text-ink text-2xl font-bold mb-2">Restablecer contraseña</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-600 text-xs font-medium block mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@clinica.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            style={{ backgroundColor: BRAND }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Enviar enlace'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
