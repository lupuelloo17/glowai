import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Check, User, Lock, Phone, Camera,
  Calendar, MapPin, Droplets, Pill, Sparkles, MessageCircle, Shield, Stethoscope,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const PHONE_RE = /^\+34\s?[6-9]\d{2}\s?\d{3}\s?\d{3}$/

const TIPOS_PIEL  = ['Seca', 'Grasa', 'Mixta', 'Normal', 'Sensible']
const GENEROS     = ['Mujer', 'Hombre', 'No binario', 'Prefiero no decirlo']
const TRATAMIENTOS_PREVIOS = [
  'Toxina botulínica', 'Ácido hialurónico', 'Peeling químico',
  'Radiofrecuencia', 'Mesoterapia', 'Láser', 'Hilos tensores', 'Ninguno',
]

const PASOS = ['Cuenta', 'Perfil', 'Ficha de piel']

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#C8A882] focus:ring-1 focus:ring-[#C8A882] transition-colors'

export default function RegistroPacientePage() {
  const { slug }   = useParams()
  const navigate   = useNavigate()

  const [paso,     setPaso]     = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error,    setError]    = useState(null)

  // La clínica se resuelve por slug al cargar; el color se aplica al instante
  // que llegan los datos. También cargamos la lista de médicos para que el
  // paciente pueda elegir (o dejar auto-asignar) en el paso 2.
  const [clinicaCtx, setClinicaCtx] = useState(null)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) return
      const [clinRes, medRes] = await Promise.all([
        supabase.from('clinicas').select('id, slug, nombre, color_primario, plan').eq('slug', slug).maybeSingle(),
        supabase.rpc('get_medicos_clinica', { p_clinica_slug: slug }),
      ])
      if (cancelled) return
      if (clinRes.data) setClinicaCtx(clinRes.data)
      if (medRes.data)  setMedicos(medRes.data)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const brand = clinicaCtx?.color_primario ?? '#C8A882'

  // Paso 1 — Cuenta
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [whatsapp, setWhatsapp] = useState('+34 ')

  // Paso 2 — Perfil
  const fileRef = useRef(null)
  const [foto,     setFoto]     = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fechaNac, setFechaNac] = useState('')
  const [genero,   setGenero]   = useState('')
  const [ciudad,   setCiudad]   = useState('')

  // Médicos disponibles en la clínica + selección del paciente
  const [medicos,    setMedicos]    = useState([])
  const [medicoSel,  setMedicoSel]  = useState('auto') // 'auto' o uuid del médico

  // Paso 3 — Ficha de piel
  const [tipoPiel, setTipoPiel] = useState('')
  const [alergias, setAlergias] = useState('')
  const [medicamentos, setMedicamentos] = useState('')
  const [tratamientosPrevios, setTratamientosPrevios] = useState([])
  const [motivoConsulta, setMotivoConsulta] = useState('')
  const [rgpd1, setRgpd1] = useState(false)   // Política + RGPD
  const [rgpd2, setRgpd2] = useState(false)   // Datos de salud
  const [marketing, setMarketing] = useState(false)

  // Validaciones por paso
  const paso1Ok =
    nombreCompleto.trim().length >= 3 &&
    email.includes('@') &&
    password.length >= 8 &&
    password === confirm &&
    PHONE_RE.test(whatsapp.trim())

  const paso2Ok = !!fechaNac && !!genero  // foto y ciudad opcionales
  const paso3Ok = !!tipoPiel && !!motivoConsulta.trim() && rgpd1 && rgpd2

  function toggleTratamiento(t) {
    setTratamientosPrevios(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  function handleFotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no puede superar 5 MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo JPG, PNG o WebP')
      return
    }
    setFoto(file)
    const reader = new FileReader()
    reader.onload = ev => setFotoPreview(ev.target.result)
    reader.readAsDataURL(file)
    setError(null)
  }

  async function handleSubmit() {
    if (!paso3Ok) return
    setEnviando(true)
    setError(null)
    try {
      // 1. Resolver clinica_id por slug (usa el cache ya cargado o consulta)
      let clinicaId = clinicaCtx?.id
      let clinicaSlug = slug
      if (!clinicaId && supabase) {
        const { data: c, error: cErr } = await supabase
          .from('clinicas')
          .select('id, slug')
          .eq('slug', slug)
          .single()
        if (cErr) throw new Error('Clínica no encontrada')
        clinicaId = c.id
        clinicaSlug = c.slug
      }

      // ── Modo mock (sin Supabase): solo simular ────────────────
      if (!supabase) {
        await new Promise(r => setTimeout(r, 800))
        // Guardamos un mock en localStorage para que /mi-perfil pueda leerlo
        localStorage.setItem('glowai_paciente_mock', JSON.stringify({
          nombre: nombreCompleto, email, whatsapp, fechaNac, genero, ciudad,
          tipoPiel, alergias, medicamentos, tratamientosPrevios, motivoConsulta,
          foto: fotoPreview, marketing,
          creado_en: new Date().toISOString(),
        }))
        navigate(`/clinica/${clinicaSlug}/mi-perfil`, { replace: true })
        return
      }

      // 2. signUp en Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { nombre: nombreCompleto.trim() },
          // Tras confirmación de email (si está activa), vuelve a /mi-perfil
          emailRedirectTo: `${window.location.origin}/clinica/${clinicaSlug}/mi-perfil`,
        },
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('No se pudo crear la cuenta')

      // 3. Insert usuarios (id = auth.uid). El trigger sync_user_app_metadata
      //    actualizará raw_app_meta_data en auth.users automáticamente.
      const { error: uErr } = await supabase
        .from('usuarios')
        .insert({
          id:         userId,
          clinica_id: clinicaId,
          nombre:     nombreCompleto.trim(),
          rol:        'paciente',
          activo:     true,
        })
      if (uErr) throw new Error('Error creando perfil de usuario: ' + uErr.message)

      // 4. Refrescar la sesión para que la JWT incluya los nuevos claims
      //    (clinica_id, rol, clinica_slug). Sin esto, las RLS de pacientes
      //    bloquearán el insert siguiente.
      const { error: refErr } = await supabase.auth.refreshSession()
      if (refErr) console.warn('refreshSession fallo:', refErr.message)

      // 5. Subir foto de perfil a bucket "avatares" (path: {userId}/avatar.ext)
      let fotoUrl = null
      if (foto) {
        const ext  = foto.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${userId}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatares')
          .upload(path, foto, { upsert: true, contentType: foto.type })
        if (upErr) {
          console.warn('Upload avatar fallo:', upErr.message)
        } else {
          const { data: pub } = supabase.storage.from('avatares').getPublicUrl(path)
          fotoUrl = pub.publicUrl
        }
      }

      // 6. Insert pacientes con id = auth.uid() (atadura paciente <-> auth.user)
      const partes = nombreCompleto.trim().split(/\s+/)
      const primerNombre = partes[0]
      const apellido     = partes.slice(1).join(' ') || '—'

      // Resolver médico: si "auto" o no hay selección, asignar el primer
      // médico disponible (puede ser null si la clínica no tiene médicos)
      const medicoId = medicoSel === 'auto'
        ? (medicos[0]?.id ?? null)
        : medicoSel

      const { error: pErr } = await supabase
        .from('pacientes')
        .insert({
          id:                userId,
          clinica_id:        clinicaId,
          medico_id:         medicoId,
          nombre:            primerNombre,
          apellido,
          email:             email.trim().toLowerCase(),
          telefono:          whatsapp.trim(),
          fecha_nacimiento:  fechaNac,
          tipo_piel:         tipoPiel,
          alergias:          alergias.trim() || null,
          medicamentos:      medicamentos.trim() || null,
          tratamientos_previos: tratamientosPrevios,
          motivo_consulta:   motivoConsulta.trim(),
          foto_perfil:       fotoUrl,
          rgpd_aceptado:     true,
          marketing_aceptado: marketing,
          riesgo:            'bajo',
          total_visitas:     0,
        })
      if (pErr) throw new Error('Error creando ficha de paciente: ' + pErr.message)

      // 7. WhatsApp de bienvenida: TODO (necesita integración con Twilio o similar)

      navigate(`/clinica/${clinicaSlug}/mi-perfil`, { replace: true })
    } catch (err) {
      setError(err.message || 'Error inesperado al crear la cuenta')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-[780px] animate-fade-in">

      {/* ── Header con stepper ── */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate(-1)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-gray-900 font-bold text-base">Crea tu cuenta</h1>
            <p className="text-gray-400 text-xs">Paso {paso} de 3 — {PASOS[paso - 1]}</p>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(paso / 3) * 100}%`, backgroundColor: brand }}
          />
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* ── Paso 1: Cuenta ── */}
        {paso === 1 && (
          <div className="space-y-4">
            <SectionTitle icon={User} brand={brand} label="Tu cuenta" />

            <Field label="Nombre completo *">
              <input
                value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)}
                placeholder="Ana Martínez" autoComplete="name"
                className={inputCls}
              />
            </Field>

            <Field label="Email *">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ana@email.es" autoComplete="email"
                className={inputCls}
              />
            </Field>

            <Field label="Contraseña *">
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                className={inputCls}
              />
              {password && password.length < 8 && (
                <p className="text-amber-600 text-[10px] mt-1">Mínimo 8 caracteres</p>
              )}
            </Field>

            <Field label="Confirmar contraseña *">
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repite tu contraseña" autoComplete="new-password"
                className={inputCls}
              />
              {confirm && confirm !== password && (
                <p className="text-red-500 text-[10px] mt-1">No coincide</p>
              )}
            </Field>

            <Field label="WhatsApp *">
              <input
                type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="+34 612 345 678" autoComplete="tel"
                className={inputCls}
              />
              <p className="text-gray-400 text-[10px] mt-1">
                Usaremos este número para recordatorios de cita.
              </p>
            </Field>
          </div>
        )}

        {/* ── Paso 2: Perfil ── */}
        {paso === 2 && (
          <div className="space-y-4">
            <SectionTitle icon={Camera} brand={brand} label="Tu perfil" subtitle="Cuéntanos un poco más sobre ti" />

            {/* Foto de perfil */}
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-dashed flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ borderColor: brand }}
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={28} style={{ color: brand }} />
                )}
              </button>
              <p className="text-gray-500 text-xs">
                {fotoPreview ? 'Toca para cambiar la foto' : 'Toca para añadir foto (opcional)'}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                className="hidden"
                onChange={handleFotoSelect}
              />
            </div>

            <Field label="Fecha de nacimiento *">
              <input
                type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Género *">
              <select
                value={genero} onChange={e => setGenero(e.target.value)}
                className={inputCls}
              >
                <option value="">— Selecciona —</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>

            <Field label="Ciudad">
              <input
                value={ciudad} onChange={e => setCiudad(e.target.value)}
                placeholder="Madrid, Valencia, Barcelona…"
                className={inputCls}
              />
            </Field>

            {/* Selector de médico — solo si la clínica tiene médicos */}
            {medicos.length > 0 && (
              <Field label="¿Con qué médico quieres tu primera consulta?">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setMedicoSel('auto')}
                    className="w-full text-left rounded-xl p-3 border-2 flex items-center gap-2.5 transition-all"
                    style={{
                      borderColor:     medicoSel === 'auto' ? brand : '#e5e7eb',
                      backgroundColor: medicoSel === 'auto' ? brand + '15' : '#fff',
                    }}
                  >
                    <Sparkles size={14} style={{ color: brand }} />
                    <div className="flex-1">
                      <p className="text-gray-900 text-xs font-semibold">Auto-asignar</p>
                      <p className="text-gray-500 text-[10px]">La clínica te asigna el más disponible</p>
                    </div>
                    {medicoSel === 'auto' && <Check size={14} style={{ color: brand }} />}
                  </button>
                  {medicos.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMedicoSel(m.id)}
                      className="w-full text-left rounded-xl p-3 border-2 flex items-center gap-2.5 transition-all"
                      style={{
                        borderColor:     medicoSel === m.id ? brand : '#e5e7eb',
                        backgroundColor: medicoSel === m.id ? brand + '15' : '#fff',
                      }}
                    >
                      <Stethoscope size={14} style={{ color: brand }} />
                      <p className="flex-1 text-gray-900 text-xs font-semibold">{m.nombre}</p>
                      {medicoSel === m.id && <Check size={14} style={{ color: brand }} />}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
        )}

        {/* ── Paso 3: Ficha de piel ── */}
        {paso === 3 && (
          <div className="space-y-4">
            <SectionTitle icon={Droplets} brand={brand} label="Tu piel" subtitle="Datos clínicos que ayudan a tu médico" />

            <Field label="Tipo de piel *">
              <div className="grid grid-cols-3 gap-2">
                {TIPOS_PIEL.map(tp => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setTipoPiel(tp)}
                    className="py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95"
                    style={tipoPiel === tp
                      ? { backgroundColor: brand, borderColor: brand, color: '#fff' }
                      : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }}
                  >
                    {tp}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Alergias conocidas">
              <textarea
                value={alergias} onChange={e => setAlergias(e.target.value)}
                rows={2} placeholder="Ej: alérgica al ibuprofeno…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="Medicamentos actuales">
              <textarea
                value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
                rows={2} placeholder="Ej: anticonceptivos, antihistamínicos…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="Tratamientos previos">
              <div className="grid grid-cols-2 gap-2">
                {TRATAMIENTOS_PREVIOS.map(t => {
                  const on = tratamientosPrevios.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTratamiento(t)}
                      className="py-2.5 px-3 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-95"
                      style={on
                        ? { backgroundColor: brand + '20', borderColor: brand, color: brand }
                        : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }}
                    >
                      {on && <Check size={12} />}
                      {t}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Motivo de consulta principal *">
              <textarea
                value={motivoConsulta} onChange={e => setMotivoConsulta(e.target.value)}
                rows={3}
                placeholder="¿Qué te trae a la consulta? Ej: manchas solares, líneas de expresión, flacidez…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <SectionTitle icon={Shield} brand={brand} label="Privacidad y RGPD" />

              <CheckItem brand={brand} checked={rgpd1} onChange={setRgpd1} required label={
                <>He leído y acepto la <Link to="/politica-privacidad" className="underline font-semibold" style={{ color: brand }} target="_blank">Política de Privacidad</Link> y el tratamiento de mis datos personales (<strong>RGPD UE 2016/679</strong>)</>
              } />

              <CheckItem brand={brand} checked={rgpd2} onChange={setRgpd2} required
                label="Consiento el tratamiento de mis datos de salud para gestión de mi historial clínico estético (Art. 9.2.a RGPD)" />

              <CheckItem brand={brand} checked={marketing} onChange={setMarketing} required={false}
                label="Acepto recibir recordatorios y comunicaciones por WhatsApp (opcional)" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-red-700 text-xs leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-6 pt-3 flex-shrink-0 border-t border-gray-100 space-y-2">
        {paso < 3 ? (
          <button
            onClick={() => setPaso(p => p + 1)}
            disabled={(paso === 1 && !paso1Ok) || (paso === 2 && !paso2Ok)}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ backgroundColor: brand }}
          >
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!paso3Ok || enviando}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{ backgroundColor: brand }}
          >
            {enviando ? 'Creando cuenta…' : <>
              <Check size={18} /> Completar registro
            </>}
          </button>
        )}
        {paso === 1 && (
          <p className="text-center text-gray-400 text-xs">
            ¿Ya tienes cuenta? <Link to="/login" className="font-semibold" style={{ color: brand }}>Inicia sesión</Link>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Helpers UI ─────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label, subtitle, brand }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} style={{ color: brand }} />
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

function CheckItem({ checked, onChange, label, required, brand }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 cursor-pointer select-none"
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked) } }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
          style={{ borderColor: checked ? brand : '#d1d5db', backgroundColor: checked ? brand : '#fff' }}
        >
          {checked && <Check size={12} className="text-white" />}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-gray-700 text-xs leading-relaxed">{label}</p>
        <span className="text-[10px] font-semibold mt-0.5 inline-block"
              style={{ color: required ? brand : '#9ca3af' }}>
          {required ? 'Obligatorio' : 'Opcional'}
        </span>
      </div>
    </div>
  )
}
