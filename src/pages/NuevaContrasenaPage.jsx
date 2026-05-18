import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BRAND = '#C8A882'
const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors'

export default function NuevaContrasenaPage() {
  const navigate = useNavigate()

  // Supabase auto-intercambia el código de la URL y emite PASSWORD_RECOVERY
  const [ready, setReady]     = useState(!supabase) // en mock ya está listo
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Si la sesión ya existe (usuario volvió a la pestaña)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const ok = password.length >= 8 && password === confirm

  async function handleSubmit(e) {
    e.preventDefault()
    if (!ok) return
    setLoading(true)
    setError(null)
    try {
      if (!supabase) {
        await new Promise(r => setTimeout(r, 800))
        setDone(true)
        return
      }
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col flex-1 min-h-[780px] items-center justify-center px-7 animate-fade-in">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: BRAND + '20' }}
        >
          <CheckCircle size={28} style={{ color: BRAND }} />
        </div>
        <h2 className="text-ink text-xl font-bold mb-2 text-center">Contraseña actualizada</h2>
        <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
          Tu contraseña se ha cambiado correctamente. Ya puedes iniciar sesión con la nueva contraseña.
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="w-full py-4 rounded-2xl text-white font-semibold transition-all"
          style={{ backgroundColor: BRAND }}
        >
          Ir al inicio de sesión
        </button>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-col flex-1 min-h-[780px] items-center justify-center">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-[#C8A882] rounded-full animate-spin" />
        <p className="text-gray-400 text-xs mt-3">Verificando enlace…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">
      <div className="flex-1 flex flex-col px-7 pt-14 pb-6">

        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: BRAND + '20' }}
        >
          <Lock size={22} style={{ color: BRAND }} />
        </div>

        <h1 className="text-ink text-2xl font-bold mb-2">Nueva contraseña</h1>
        <p className="text-gray-400 text-sm mb-8">
          Elige una contraseña segura de al menos 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-600 text-xs font-medium block mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && password.length < 8 && (
              <p className="text-amber-600 text-[10px] mt-1">Mínimo 8 caracteres</p>
            )}
          </div>

          <div>
            <label className="text-gray-600 text-xs font-medium block mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              className={inputCls}
            />
            {confirm && confirm !== password && (
              <p className="text-red-500 text-[10px] mt-1">No coincide</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !ok}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            style={{ backgroundColor: BRAND }}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Guardar contraseña'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
