import { useState, useEffect, useRef } from 'react'
import { Navigate, Link, useParams } from 'react-router-dom'
import {
  Building2, Users, Stethoscope, Bell, CreditCard,
  Save, Plus, Pencil, Trash2, X, Check, Upload,
  ExternalLink, AlertTriangle, Phone, ToggleLeft, ToggleRight,
  ShieldCheck,
} from 'lucide-react'
import ClinicLayout from './ClinicLayout'
import { useClinic } from '../../contexts/ClinicContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { PLANES, formatEUR } from '../../config/planes'
import { formatPrecio } from '../../utils/fecha'

// ── Helpers ──────────────────────────────────────────────────────
const DURACIONES = [15, 30, 45, 60, 90, 120]

const NOTIF_DEFAULTS = {
  recordatorio_24h:      true,
  recordatorio_2h:       true,
  bienvenida_paciente:   true,
  alerta_abandono_30d:   false,
  nuevo_registro_medico: true,
}

const MOCK_MEDICOS = [
  { id: 'm1', nombre: 'Dra. María García', especialidad: 'Medicina Estética', email: 'dra.garcia@lumiere.com', colegiado: '46-12345', telefono: '+34 611 222 333', activo: true,  foto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face' },
  { id: 'm2', nombre: 'Dr. Carlos Ruiz',   especialidad: 'Dermatología',       email: 'dr.ruiz@lumiere.com',    colegiado: '46-67890', telefono: '+34 622 333 444', activo: true,  foto: null },
]

const MOCK_TRATAMIENTOS = [
  { id: 't1', nombre: 'Mesoterapia facial',    descripcion: 'Revitalización con vitaminas',  duracion_minutos: 45, precio: 120, color: '#C8A882', activo: true },
  { id: 't2', nombre: 'Botox',                 descripcion: 'Tratamiento con toxina botulínica', duracion_minutos: 30, precio: 250, color: '#A89BC8', activo: true },
  { id: 't3', nombre: 'Peeling químico',       descripcion: 'Renovación celular profunda',   duracion_minutos: 60, precio: 180, color: '#C8B8A2', activo: false },
]

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
      {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
      {toast.msg}
    </div>
  )
}

function UnsavedBanner({ dirty }) {
  if (!dirty) return null
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs mb-4">
      <AlertTriangle size={13} /> Tienes cambios sin guardar
    </div>
  )
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} className="text-gray-400" />
      <h2 className="font-bold text-gray-900 text-base">{title}</h2>
    </div>
  )
}

// ── SECCIÓN 1: IDENTIDAD ─────────────────────────────────────────
function SecIdentidad({ clinica, brand, onSave }) {
  const [form, setForm] = useState({
    nombre:   clinica?.nombre   ?? '',
    slug:     clinica?.slug     ?? '',
    direccion: clinica?.direccion ?? '',
    ciudad:   clinica?.ciudad   ?? '',
    telefono: clinica?.telefono ?? '',
    email:    clinica?.email    ?? '',
    web:      clinica?.web      ?? '',
    horario:  clinica?.horario  ?? '',
  })
  const [color, setColor]       = useState(clinica?.color_primario ?? '#C8A882')
  const [logoPreview, setLogoPreview] = useState(clinica?.logo_url ?? null)
  const [logoFile, setLogoFile] = useState(null)
  const [dirty, setDirty]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const fileRef = useRef()

  // Sync form when clinica loads asynchronously (e.g. after Supabase fetch in ClinicProvider)
  useEffect(() => {
    if (!clinica) return
    setForm({
      nombre:    clinica.nombre    ?? '',
      slug:      clinica.slug      ?? '',
      direccion: clinica.direccion ?? '',
      ciudad:    clinica.ciudad    ?? '',
      telefono:  clinica.telefono  ?? '',
      email:     clinica.email     ?? '',
      web:       clinica.web       ?? '',
      horario:   clinica.horario   ?? '',
    })
    setColor(clinica.color_primario ?? '#C8A882')
    setLogoPreview(clinica.logo_url ?? null)
    setDirty(false)
  }, [clinica?.id])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setDirty(true)
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    let logo_url = clinica?.logo_url ?? null

    if (logoFile && supabase && !clinica._isMock) {
      const ext  = logoFile.name.split('.').pop()
      const path = `${clinica.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, logoFile, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('logos').getPublicUrl(path)
        logo_url = data.publicUrl
      }
    }

    await onSave({ ...form, color_primario: color, logo_url })
    setSaving(false)
    setDirty(false)
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setField(key, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-400 transition-colors"
      />
    </div>
  )

  return (
    <div>
      <SectionTitle icon={Building2} title="Identidad de la clínica" />
      <UnsavedBanner dirty={dirty} />

      <div className="space-y-3 mb-5">
        {field('Nombre de la clínica', 'nombre', 'text', 'Clínica Lumière')}
        {field('Slug (URL)', 'slug', 'text', 'clinica-lumiere')}
        {field('Dirección', 'direccion', 'text', 'Calle Colón 12, 46004')}
        {field('Ciudad', 'ciudad', 'text', 'Valencia')}
        {field('Teléfono de contacto', 'telefono', 'text', '+34 963 123 456')}
        {field('Email de contacto', 'email', 'email', 'info@clinica.es')}
        {field('Sitio web (opcional)', 'web', 'url', 'https://clinica.es')}
        {field('Horario de atención', 'horario', 'text', 'Lunes a Viernes 9:00-20:00')}
      </div>

      {/* Logo */}
      <div className="mb-5">
        <p className="text-xs font-medium text-gray-500 mb-2">Logo de la clínica</p>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
              : <Building2 size={22} className="text-gray-300" />
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Upload size={13} /> Cambiar logo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      {/* Color corporativo */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-500 mb-2">Color corporativo</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={e => { setColor(e.target.value); setDirty(true) }}
            className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
          />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: color }} />
            <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: color + '33' }} />
            <span className="text-xs text-gray-400 font-mono">{color}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ backgroundColor: brand }}
      >
        <Save size={15} /> {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── SECCIÓN 2: EQUIPO ────────────────────────────────────────────
const EMPTY_MEDICO = { nombre: '', especialidad: '', colegiado: '', email: '', telefono: '', foto: '' }

function SecEquipo({ clinica, brand, showToast }) {
  const [medicos, setMedicos] = useState([])
  const [modal, setModal]     = useState(null) // null | { mode:'add'|'edit', data }
  const [form, setForm]       = useState(EMPTY_MEDICO)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (supabase && clinica?.id && !clinica._isMock) {
      supabase.from('medicos').select('*').eq('clinica_id', clinica.id)
        .then(({ data }) => { if (data?.length) setMedicos(data) })
    } else {
      setMedicos(MOCK_MEDICOS)
    }
  }, [clinica?.id])

  function openAdd()       { setForm(EMPTY_MEDICO); setModal({ mode: 'add' }) }
  function openEdit(m)     { setForm({ nombre: m.nombre, especialidad: m.especialidad ?? '', colegiado: m.colegiado ?? '', email: m.email ?? '', telefono: m.telefono ?? '', foto: m.foto ?? '' }); setModal({ mode: 'edit', id: m.id }) }

  async function toggleActivo(m) {
    const updated = { ...m, activo: !m.activo }
    setMedicos(prev => prev.map(x => x.id === m.id ? updated : x))
    if (supabase && !clinica._isMock) await supabase.from('medicos').update({ activo: !m.activo }).eq('id', m.id)
  }

  async function handleSave() {
    setSaving(true)
    if (modal.mode === 'add') {
      if (supabase && clinica?.id && !clinica._isMock) {
        const { data, error } = await supabase.from('medicos').insert([{ ...form, clinica_id: clinica.id, activo: true }]).select().single()
        if (error) { showToast('Error al añadir médico: ' + error.message, 'error'); setSaving(false); return }
        if (data) setMedicos(prev => [...prev, data])
      } else {
        setMedicos(prev => [...prev, { ...form, id: 'm' + Date.now(), activo: true }])
      }
    } else {
      setMedicos(prev => prev.map(m => m.id === modal.id ? { ...m, ...form } : m))
      if (supabase && !clinica._isMock) {
        const { error } = await supabase.from('medicos').update(form).eq('id', modal.id)
        if (error) { showToast('Error al guardar: ' + error.message, 'error'); setSaving(false); return }
      }
    }
    setSaving(false)
    setModal(null)
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <SectionTitle icon={Users} title="Equipo médico" />

      <div className="space-y-2 mb-4">
        {medicos.map(m => (
          <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {m.foto
                ? <img src={m.foto} alt={m.nombre} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">{m.nombre?.[0]}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{m.nombre}</p>
              <p className="text-xs text-gray-400">{m.especialidad}</p>
            </div>
            <button onClick={() => toggleActivo(m)} className="flex-shrink-0">
              {m.activo
                ? <ToggleRight size={22} style={{ color: brand }} />
                : <ToggleLeft  size={22} className="text-gray-300" />
              }
            </button>
            <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <Pencil size={14} className="text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openAdd}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <Plus size={15} /> Añadir médico
      </button>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.mode === 'add' ? 'Añadir médico' : 'Editar médico'}</h3>
              <button onClick={() => setModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              {[['Nombre completo', 'nombre'], ['Especialidad', 'especialidad'], ['Nº de colegiado', 'colegiado'], ['Email', 'email'], ['Teléfono directo', 'telefono'], ['URL foto de perfil', 'foto']].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setF(key, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>
              ))}
            </div>
            {modal.mode === 'add' && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                <ShieldCheck size={12} /> Se enviará un email de invitación al crear la cuenta.
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !form.nombre}
              className="w-full mt-5 py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: brand }}
            >
              <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SECCIÓN 3: CATÁLOGO ──────────────────────────────────────────
const EMPTY_TRAT = { nombre: '', descripcion: '', duracion_minutos: 60, precio: '', color: '#C8A882', activo: true }

function SecCatalogo({ clinica, brand, showToast }) {
  const [lista, setLista]   = useState([])
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState(EMPTY_TRAT)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null) // id to delete

  async function cargarTratamientos() {
    if (supabase && clinica?.id && !clinica._isMock) {
      const { data, error } = await supabase.from('tratamientos').select('*').eq('clinica_id', clinica.id).order('nombre')
      console.log('[SecCatalogo] cargarTratamientos:', { data, error })
      if (!error && data) setLista(data)
    } else {
      setLista(MOCK_TRATAMIENTOS)
    }
  }

  useEffect(() => { cargarTratamientos() }, [clinica?.id])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function toggleActivo(t) {
    setLista(prev => prev.map(x => x.id === t.id ? { ...x, activo: !x.activo } : x))
    if (supabase && !clinica._isMock) await supabase.from('tratamientos').update({ activo: !t.activo }).eq('id', t.id)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, precio: parseFloat(form.precio) || null }
    console.log('[SecCatalogo] handleSave mode:', modal.mode, 'clinica.id:', clinica?.id, payload)
    if (modal.mode === 'add') {
      if (supabase && clinica?.id && !clinica._isMock) {
        const { data, error } = await supabase.from('tratamientos').insert([{ ...payload, clinica_id: clinica.id }]).select().single()
        console.log('[SecCatalogo] INSERT resultado:', { data, error })
        if (error) { showToast('Error al añadir tratamiento: ' + error.message, 'error'); setSaving(false); return }
        await cargarTratamientos()
      } else {
        setLista(prev => [...prev, { ...payload, id: 't' + Date.now() }])
      }
    } else {
      if (supabase && clinica?.id && !clinica._isMock) {
        const { error } = await supabase.from('tratamientos').update(payload).eq('id', modal.id)
        console.log('[SecCatalogo] UPDATE resultado:', { error })
        if (error) { showToast('Error al guardar: ' + error.message, 'error'); setSaving(false); return }
        await cargarTratamientos()
      } else {
        setLista(prev => prev.map(x => x.id === modal.id ? { ...x, ...payload } : x))
      }
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete(id) {
    setLista(prev => prev.filter(x => x.id !== id))
    if (supabase && !clinica._isMock) await supabase.from('tratamientos').delete().eq('id', id)
    setConfirm(null)
  }

  function openAdd()   { setForm(EMPTY_TRAT); setModal({ mode: 'add' }) }
  function openEdit(t) { setForm({ nombre: t.nombre, descripcion: t.descripcion ?? '', duracion_minutos: t.duracion_minutos, precio: t.precio ?? '', color: t.color ?? '#C8A882', activo: t.activo }); setModal({ mode: 'edit', id: t.id }) }

  return (
    <div>
      <SectionTitle icon={Stethoscope} title="Catálogo de tratamientos" />

      <div className="space-y-2 mb-4">
        {lista.map(t => (
          <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: t.color ?? brand }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{t.nombre}</p>
              <p className="text-xs text-gray-400">{t.duracion_minutos} min · {t.precio ? formatPrecio(t.precio) : 'Sin precio'}</p>
            </div>
            <button onClick={() => toggleActivo(t)} className="flex-shrink-0">
              {t.activo
                ? <ToggleRight size={22} style={{ color: brand }} />
                : <ToggleLeft  size={22} className="text-gray-300" />
              }
            </button>
            <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <Pencil size={14} className="text-gray-400" />
            </button>
            <button onClick={() => setConfirm(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openAdd}
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 transition-colors"
      >
        <Plus size={15} /> Añadir tratamiento
      </button>

      {/* Confirm delete */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center">
            <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">¿Eliminar tratamiento?</p>
            <p className="text-gray-400 text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Cancelar</button>
              <button onClick={() => handleDelete(confirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal add/edit */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.mode === 'add' ? 'Añadir tratamiento' : 'Editar tratamiento'}</h3>
              <button onClick={() => setModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setF('nombre', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Descripción corta</label>
                <textarea value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Duración</label>
                <select value={form.duracion_minutos} onChange={e => setF('duracion_minutos', +e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {DURACIONES.map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Precio (€)</label>
                <input type="number" value={form.precio} onChange={e => setF('precio', e.target.value)} min="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Color en agenda</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={e => setF('color', e.target.value)} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
                  <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: form.color }} />
                  <span className="text-xs text-gray-400 font-mono">{form.color}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.nombre}
              className="w-full mt-5 py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{ backgroundColor: brand }}
            >
              <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SECCIÓN 4: NOTIFICACIONES ────────────────────────────────────
const NOTIF_LABELS = {
  recordatorio_24h:      'Recordatorio 24h antes de cita',
  recordatorio_2h:       'Recordatorio 2h antes de cita',
  bienvenida_paciente:   'Mensaje de bienvenida a nuevos pacientes',
  alerta_abandono_30d:   'Alerta de paciente sin visita en 30 días',
  nuevo_registro_medico: 'Notificación al médico de nuevo registro',
}

function SecNotificaciones({ clinica, brand, onSave }) {
  const init = { ...NOTIF_DEFAULTS, ...(clinica?.notificaciones ?? {}) }
  const [toggles, setToggles] = useState(init)
  const [wapp, setWapp]       = useState(clinica?.whatsapp_numero ?? '')
  const [dirty, setDirty]     = useState(false)
  const [saving, setSaving]   = useState(false)

  // Sync when clinica loads asynchronously
  useEffect(() => {
    if (!clinica) return
    setToggles({ ...NOTIF_DEFAULTS, ...(clinica.notificaciones ?? {}) })
    setWapp(clinica.whatsapp_numero ?? '')
    setDirty(false)
  }, [clinica?.id])

  function setToggle(k) {
    setToggles(t => ({ ...t, [k]: !t[k] }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ notificaciones: toggles, whatsapp_numero: wapp })
    setSaving(false)
    setDirty(false)
  }

  return (
    <div>
      <SectionTitle icon={Bell} title="Notificaciones y automatizaciones" />
      <UnsavedBanner dirty={dirty} />

      <div className="space-y-2 mb-6">
        {Object.entries(NOTIF_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <p className="text-sm text-gray-700">{label}</p>
            <button onClick={() => setToggle(key)}>
              {toggles[key]
                ? <ToggleRight size={26} style={{ color: brand }} />
                : <ToggleLeft  size={26} className="text-gray-300" />
              }
            </button>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="text-xs font-medium text-gray-500 block mb-1">
          <Phone size={11} className="inline mr-1" />WhatsApp de la clínica
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={wapp}
            onChange={e => { setWapp(e.target.value); setDirty(true) }}
            placeholder="+34 600 000 000"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400"
          />
          <button
            className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors whitespace-nowrap"
            onClick={() => alert('Verificación de WhatsApp Business disponible próximamente.')}
          >
            Verificar
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
        style={{ backgroundColor: brand }}
      >
        <Save size={15} /> {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ── SECCIÓN 5: SUSCRIPCIÓN ───────────────────────────────────────
function SecSuscripcion({ clinica, plan, brand }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const isMock = clinica?._isMock

  async function handlePortal() {
    if (isMock || !clinica?.stripe_customer_id) {
      setError('Esta función requiere una suscripción activa en producción. Usa "Cambiar de plan" para activar uno.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: clinica.stripe_customer_id }),
      })
      if (!res.ok) {
        if (res.status === 404) throw new Error('API no disponible localmente. Ejecuta "vercel dev" para probar.')
        throw new Error(`Error ${res.status}`)
      }
      const { url, error: e } = await res.json()
      if (e) throw new Error(e)
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const status = clinica?.stripe_subscription_status ?? (isMock ? 'active' : 'inactive')
  const statusLabel = { active: 'Activa', trialing: 'Prueba', past_due: 'Pago fallido', canceled: 'Cancelada', inactive: 'Inactiva' }
  const statusColor = { active: '#16a34a', trialing: '#2563eb', past_due: '#dc2626', canceled: '#6b7280', inactive: '#9ca3af' }

  const renovacion = clinica?.fecha_renovacion
    ? new Date(clinica.fecha_renovacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div>
      <SectionTitle icon={CreditCard} title="Suscripción" />

      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Plan actual</p>
            <p className="font-bold text-gray-900 text-lg">{plan?.nombre ?? 'Sin plan'}</p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: (statusColor[status] ?? '#9ca3af') + '18', color: statusColor[status] ?? '#9ca3af' }}
          >
            {statusLabel[status] ?? status}
          </span>
        </div>
        {plan && (
          <>
            <p className="text-2xl font-extrabold text-gray-900 mb-0.5">{formatEUR(plan.precio)}<span className="text-sm font-normal text-gray-400">/mes + IVA</span></p>
            <p className="text-xs text-gray-400">Próxima renovación: {renovacion}</p>
          </>
        )}
      </div>

      {isMock && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-700 text-xs mb-4">
          <ShieldCheck size={13} /> Modo demo — los cambios de plan se procesan en producción con Stripe.
        </div>
      )}

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <div className="space-y-2">
        {!isMock && (
          <button
            onClick={handlePortal}
            disabled={loading}
            className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ backgroundColor: brand }}
          >
            <ExternalLink size={15} /> {loading ? 'Abriendo…' : 'Gestionar suscripción'}
          </button>
        )}
        <Link
          to="/precios"
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {isMock ? 'Ver planes y activar suscripción' : 'Cambiar de plan'}
        </Link>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────
const TABS = [
  { id: 'identidad',      label: 'Identidad',      icon: Building2   },
  { id: 'equipo',         label: 'Equipo',          icon: Users       },
  { id: 'catalogo',       label: 'Catálogo',        icon: Stethoscope },
  { id: 'notificaciones', label: 'Notificaciones',  icon: Bell        },
  { id: 'suscripcion',    label: 'Suscripción',     icon: CreditCard  },
]

export default function ConfiguracionPage() {
  const { slug }                        = useParams()
  const { clinica, setClinica, plan, refreshClinica } = useClinic()
  const { user }                        = useAuth()
  const [tab, setTab]                   = useState('identidad')
  const [toast, setToast]               = useState(null)

  // Role guard
  if (user && user.rol !== 'admin') {
    return <Navigate to={`/clinica/${slug}/dashboard`} replace />
  }

  const brand = clinica?.color_primario ?? '#C8A882'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSaveClinica(fields) {
    console.log('[handleSaveClinica] clinica.id:', clinica?.id, 'isMock:', clinica?._isMock)
    console.log('[handleSaveClinica] campos:', fields)
    if (supabase && clinica?.id && !clinica._isMock) {
      const { data, error } = await supabase
        .from('clinicas')
        .update(fields)
        .eq('id', clinica.id)
        .select()
        .single()
      console.log('[handleSaveClinica] resultado:', { data, error })
      if (error) { showToast('Error al guardar: ' + error.message, 'error'); return }
      setClinica(data)
      showToast('Cambios guardados correctamente ✓')
    } else {
      setClinica(prev => ({ ...prev, ...fields }))
      showToast('Cambios guardados correctamente ✓')
    }
  }

  return (
    <ClinicLayout>
      <div className="flex flex-col h-full">

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 bg-white px-2 gap-1 scrollbar-hide flex-shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] font-medium whitespace-nowrap flex-shrink-0 transition-colors border-b-2"
                style={active ? { color: brand, borderColor: brand } : { color: '#9ca3af', borderColor: 'transparent' }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === 'identidad'      && <SecIdentidad       clinica={clinica} brand={brand} onSave={handleSaveClinica} />}
          {tab === 'equipo'         && <SecEquipo           clinica={clinica} brand={brand} showToast={showToast} />}
          {tab === 'catalogo'       && <SecCatalogo         clinica={clinica} brand={brand} showToast={showToast} />}
          {tab === 'notificaciones' && <SecNotificaciones   clinica={clinica} brand={brand} onSave={handleSaveClinica} />}
          {tab === 'suscripcion'    && <SecSuscripcion      clinica={clinica} plan={plan}  brand={brand} />}
        </div>
      </div>

      <Toast toast={toast} />
    </ClinicLayout>
  )
}
