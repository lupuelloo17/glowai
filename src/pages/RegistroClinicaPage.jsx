import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Building2, User, Shield,
  Check, Eye, EyeOff, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const BRAND = '#C8A882'
const PASOS = ['Tu clínica', 'Cuenta admin', 'Privacidad']

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors'

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

export default function RegistroClinicaPage() {
  const navigate = useNavigate()
  const [paso, setPaso]       = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError]     = useState(null)

  // ── Paso 1: Clínica ──────────────────────────────────────────
  const [nombre, setNombre]         = useState('')
  const [slug, setSlug]             = useState('')
  const [ciudad, setCiudad]         = useState('')
  const [slugManual, setSlugManual] = useState(false)

  function handleNombreChange(v) {
    setNombre(v)
    if (!slugManual) setSlug(toSlug(v))
  }

  // ── Paso 2: Admin ────────────────────────────────────────────
  const [adminNombre, setAdminNombre] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPass, setShowPass]       = useState(false)

  // ── Paso 3: RGPD ─────────────────────────────────────────────
  const [rgpd1, setRgpd1] = useState(false)
  const [rgpd2, setRgpd2] = useState(false)

  // ── Validaciones ─────────────────────────────────────────────
  const slugOk  = /^[a-z0-9-]{3,40}$/.test(slug)
  const paso1Ok = nombre.trim().length >= 2 && slugOk
  const paso2Ok = (
    adminNombre.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 8 &&
    password === confirm
  )
  const paso3Ok = rgpd1 && rgpd2

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    if (!paso3Ok) return
    setEnviando(true)
    setError(null)
    try {
      // ── Mock (sin Supabase) ───────────────────────────────────
      if (!supabase) {
        await new Promise(r => setTimeout(r, 1000))
        const mockUser = {
          id: 'mock-new-admin',
          email,
          nombre: adminNombre,
          rol: 'admin',
          clinica_slug: slug,
          clinica_id:   'mock-' + slug,
        }
        localStorage.setItem('glowai_session', JSON.stringify(mockUser))
        navigate(`/clinica/${slug}/dashboard`, { replace: true })
        return
      }

      // 1. Verificar slug disponible
      const { data: existing } = await supabase
        .from('clinicas')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (existing) throw new Error('El identificador ya está en uso. Elige otro.')

      // 2. Crear cuenta en Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { nombre: adminNombre.trim() },
          emailRedirectTo: `${window.location.origin}/clinica/${slug}/dashboard`,
        },
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('No se pudo crear la cuenta')

      // 3. Crear la clínica
      const { data: clinicaData, error: clinErr } = await supabase
        .from('clinicas')
        .insert({
          slug,
          nombre:          nombre.trim(),
          ciudad:          ciudad.trim() || null,
          plan:            'trial',
          color_primario:  BRAND,
          activo:          true,
        })
        .select('id')
        .single()
      if (clinErr) throw new Error('Error creando la clínica: ' + clinErr.message)

      // 4. Crear usuario admin
      const { error: uErr } = await supabase
        .from('usuarios')
        .insert({
          id:         userId,
          clinica_id: clinicaData.id,
          nombre:     adminNombre.trim(),
          email:      email.trim().toLowerCase(),
          rol:        'admin',
          activo:     true,
        })
      if (uErr) throw new Error('Error creando perfil de administrador: ' + uErr.message)

      // 5. Refrescar sesión para que la JWT incluya los nuevos claims
      await supabase.auth.refreshSession()

      navigate(`/clinica/${slug}/dashboard`, { replace: true })
    } catch (err) {
      setError(err.message || 'Error inesperado. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">

      {/* Header stepper */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate('/login')}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-gray-900 font-bold text-base">Registra tu clínica</h1>
            <p className="text-gray-400 text-xs">Paso {paso} de 3 — {PASOS[paso - 1]}</p>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(paso / 3) * 100}%`, backgroundColor: BRAND }}
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* Paso 1 — Clínica */}
        {paso === 1 && (
          <div className="space-y-4">
            <SectionTitle icon={Building2} label="Datos de tu clínica" />

            <Field label="Nombre de la clínica *">
              <input
                value={nombre}
                onChange={e => handleNombreChange(e.target.value)}
                placeholder="Clínica Lumière"
                className={inputCls}
              />
            </Field>

            <Field label="Identificador único (URL) *">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none select-none">
                  veloura.app/
                </span>
                <input
                  value={slug}
                  onChange={e => {
                    setSlug(toSlug(e.target.value))
                    setSlugManual(true)
                  }}
                  placeholder="clinica-lumiere"
                  className={`${inputCls} pl-[98px]`}
                />
              </div>
              {slug && !slugOk && (
                <p className="text-red-500 text-[10px] mt-1">
                  Solo letras minúsculas, números y guiones (mín. 3 caracteres)
                </p>
              )}
              {slug && slugOk && (
                <p className="text-gray-400 text-[10px] mt-1">
                  Tus pacientes se registrarán en veloura.app/registro/{slug}
                </p>
              )}
            </Field>

            <Field label="Ciudad">
              <input
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                placeholder="Madrid, Barcelona…"
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Paso 2 — Admin */}
        {paso === 2 && (
          <div className="space-y-4">
            <SectionTitle
              icon={User}
              label="Cuenta de administrador"
              subtitle="Serás el administrador principal de la clínica"
            />

            <Field label="Tu nombre completo *">
              <input
                value={adminNombre}
                onChange={e => setAdminNombre(e.target.value)}
                placeholder="Ana García"
                autoComplete="name"
                className={inputCls}
              />
            </Field>

            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@tuclinica.com"
                autoComplete="email"
                className={inputCls}
              />
            </Field>

            <Field label="Contraseña *">
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
            </Field>

            <Field label="Confirmar contraseña *">
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
            </Field>
          </div>
        )}

        {/* Paso 3 — RGPD */}
        {paso === 3 && (
          <div className="space-y-4">
            <SectionTitle icon={Shield} label="Privacidad y condiciones" />

            <p className="text-gray-500 text-sm leading-relaxed">
              Al registrar tu clínica en Veloura aceptas nuestros términos y el tratamiento
              de los datos conforme al RGPD.
            </p>

            <div className="space-y-3 pt-1">
              <CheckItem
                checked={rgpd1}
                onChange={setRgpd1}
                required
                label={
                  <>
                    He leído y acepto la{' '}
                    <Link
                      to="/politica-privacidad"
                      className="underline font-semibold"
                      style={{ color: BRAND }}
                      target="_blank"
                    >
                      Política de Privacidad
                    </Link>{' '}
                    y los Términos de servicio de Veloura
                  </>
                }
              />
              <CheckItem
                checked={rgpd2}
                onChange={setRgpd2}
                required
                label="Acepto el tratamiento de datos clínicos de mis pacientes bajo mi responsabilidad como responsable del tratamiento (RGPD UE 2016/679)"
              />
            </div>

            <div
              className="mt-2 p-4 rounded-2xl"
              style={{ backgroundColor: BRAND + '15', border: `1px solid ${BRAND}30` }}
            >
              <p className="text-gray-600 text-xs leading-relaxed">
                Empezarás con un <strong>periodo de prueba gratuito</strong>. Podrás gestionar
                tu plan desde la configuración de la clínica en cualquier momento.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 space-y-2">
        {paso < 3 ? (
          <button
            onClick={() => { setError(null); setPaso(p => p + 1) }}
            disabled={(paso === 1 && !paso1Ok) || (paso === 2 && !paso2Ok)}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ backgroundColor: BRAND }}
          >
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!paso3Ok || enviando}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ backgroundColor: BRAND }}
          >
            {enviando
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={18} /> Crear mi clínica</>
            }
          </button>
        )}
        {paso === 1 && (
          <p className="text-center text-gray-400 text-xs">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold" style={{ color: BRAND }}>
              Inicia sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Helpers UI ──────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label, subtitle }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} style={{ color: BRAND }} />
        <p className="text-gray-800 font-semibold text-sm">{label}</p>
      </div>
      {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-gray-600 text-xs font-medium block mb-1">{label}</label>
      {children}
    </div>
  )
}

function CheckItem({ checked, onChange, label, required }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 cursor-pointer select-none"
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) }
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
          style={{
            borderColor:     checked ? BRAND : '#d1d5db',
            backgroundColor: checked ? BRAND : '#fff',
          }}
        >
          {checked && <Check size={12} className="text-white" />}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-gray-700 text-xs leading-relaxed">{label}</p>
        <span
          className="text-[10px] font-semibold mt-0.5 inline-block"
          style={{ color: required ? BRAND : '#9ca3af' }}
        >
          {required ? 'Obligatorio' : 'Opcional'}
        </span>
      </div>
    </div>
  )
}
