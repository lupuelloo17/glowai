import { createContext, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PLANES } from '../config/planes'

// ── Mock data (used when Supabase is not configured) ──────────
const MOCK_CLINICAS = {
  'clinica-lumiere': {
    id: 'mock-lumiere',
    nombre: 'Clínica Lumière Valencia',
    slug: 'clinica-lumiere',
    logo_url: null,
    color_primario: '#C8A882',
    plan: 'premium',
    plan_activo: true,
    max_pacientes: 300,
    max_medicos: 4,
    ciudad: 'Valencia',
    pais: 'España',
    direccion: 'Calle Colón 12, 46004 Valencia',
    email: 'info@clinicalumiere.es',
    telefono: '+34 963 123 456',
    fecha_renovacion: '2027-05-15T00:00:00Z',
  },
  'derma-madrid': {
    id: 'mock-derma',
    nombre: 'DermaCenter Madrid',
    slug: 'derma-madrid',
    logo_url: null,
    color_primario: '#1B3A6B',
    plan: 'elite',
    plan_activo: true,
    max_pacientes: Infinity,
    max_medicos: Infinity,
    ciudad: 'Madrid',
    pais: 'España',
    direccion: 'Calle Serrano 45, 28001 Madrid',
    email: 'info@dermacenter.es',
    telefono: '+34 913 456 789',
    fecha_renovacion: '2028-01-01T00:00:00Z',
  },
}

// ── Context ───────────────────────────────────────────────────
const ClinicContext = createContext(null)

export function ClinicProvider({ children }) {
  const { slug } = useParams()
  const [clinica, setClinica]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!slug) return
    loadClinica(slug)
  }, [slug])

  // Inject CSS variables whenever clinica changes
  useEffect(() => {
    if (!clinica) return
    const root = document.documentElement
    root.style.setProperty('--color-brand', clinica.color_primario)
    root.style.setProperty('--color-brand-light', clinica.color_primario + '22')
    if (clinica.logo_url) {
      root.style.setProperty('--logo-url', `url(${clinica.logo_url})`)
    }
    // Restore defaults on unmount
    return () => {
      root.style.setProperty('--color-brand', '#E8A0B0')
      root.style.removeProperty('--logo-url')
    }
  }, [clinica])

  async function loadClinica(slugParam) {
    setLoading(true)
    setError(null)
    console.log('[ClinicContext] loading slug:', slugParam)
    try {
      if (supabase) {
        const { data, error: err } = await supabase
          .from('clinicas')
          .select('*')
          .eq('slug', slugParam)
          .single()

        console.log('[ClinicContext] Supabase result:', { data, err })

        if (data) {
          setClinica(data)
          return
        }

        // Supabase failed (RLS / not found) — fall back to mock
        console.warn('[ClinicContext] Supabase error, falling back to mock:', err?.message)
      }

      // Mock fallback
      const mock = MOCK_CLINICAS[slugParam]
      if (!mock) throw new Error(`Clínica "${slugParam}" no encontrada`)
      setClinica(mock)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const plan = clinica ? (PLANES[clinica.plan] ?? PLANES.esencial) : null

  function hasFeature(key) {
    return plan?.features?.[key] === true
  }

  function refreshClinica() { if (slug) loadClinica(slug) }

  return (
    <ClinicContext.Provider value={{ clinica, setClinica, plan, loading, error, hasFeature, refreshClinica }}>
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic() {
  const ctx = useContext(ClinicContext)
  if (!ctx) throw new Error('useClinic must be used inside <ClinicProvider>')
  return ctx
}
