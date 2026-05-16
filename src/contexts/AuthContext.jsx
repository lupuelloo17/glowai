import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Mock users (used when Supabase is not configured) ─────────
const MOCK_USERS = {
  'admin@lumiere.com': {
    id: 'mock-admin',
    email: 'admin@lumiere.com',
    password: 'demo1234',
    nombre: 'Administrador',
    rol: 'admin',
    clinica_slug: 'clinica-lumiere',
    clinica_id: 'mock-lumiere',
    foto: null,
  },
  'dra.garcia@lumiere.com': {
    id: 'mock-garcia',
    email: 'dra.garcia@lumiere.com',
    password: 'demo1234',
    nombre: 'Dra. María García',
    especialidad: 'Medicina Estética',
    colegiado: '46-12345',
    rol: 'medico',
    clinica_slug: 'clinica-lumiere',
    clinica_id: 'mock-lumiere',
    foto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face',
  },
}

const SESSION_KEY = 'glowai_session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Restore session on mount
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(sessionToBase(session))
          enrichFromDB(session.user.id, setUser)
        }
        setLoading(false)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) { setUser(null); return }
        setUser(sessionToBase(session))
        enrichFromDB(session.user.id, setUser)
      })
      return () => subscription.unsubscribe()
    } else {
      // Mock: restore from localStorage
      try {
        const saved = localStorage.getItem(SESSION_KEY)
        if (saved) setUser(JSON.parse(saved))
      } catch { /* ignore */ }
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    setError(null)
    try {
      if (supabase) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        const base = sessionToBase(data.session)
        enrichFromDB(data.session.user.id, setUser)
        return base
      } else {
        // Mock auth
        const mock = MOCK_USERS[email.toLowerCase()]
        if (!mock || mock.password !== password) throw new Error('Credenciales incorrectas')
        const { password: _, ...safeUser } = mock
        localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser))
        setUser(safeUser)
        return safeUser
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  function loginAsDemo(rol) {
    const email = rol === 'admin' ? 'admin@lumiere.com' : 'dra.garcia@lumiere.com'
    const mock  = MOCK_USERS[email]
    const { password: _, ...safeUser } = mock
    const demoUser = { ...safeUser, isDemoMode: true }
    localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser))
    setUser(demoUser)
    return demoUser
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
    setUser(null)
  }

  const isDemoMode = user?.isDemoMode === true

  return (
    <AuthContext.Provider value={{ user, loading, error, login, loginAsDemo, logout, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Returns user object from session synchronously (no DB call)
function sessionToBase(session) {
  const meta = session.user.app_metadata ?? {}
  return {
    id:           session.user.id,
    email:        session.user.email,
    rol:          meta.rol ?? 'medico',
    clinica_id:   meta.clinica_id ?? null,
    clinica_slug: meta.clinica_slug ?? 'clinica-lumiere',
    nombre:       session.user.user_metadata?.nombre ?? session.user.email,
    foto:         session.user.user_metadata?.foto ?? null,
  }
}

// Enriches user with rol + clinica_id from usuarios table (fire-and-forget)
function enrichFromDB(userId, setUser) {
  supabase
    .from('usuarios')
    .select('rol, clinica_id, nombre')
    .eq('id', userId)
    .single()
    .then(({ data }) => {
      if (!data) return
      setUser(prev => prev ? {
        ...prev,
        rol:        data.rol        ?? prev.rol,
        clinica_id: data.clinica_id ?? prev.clinica_id,
        nombre:     data.nombre     ?? prev.nombre,
      } : prev)
    })
    .catch(() => { /* silent */ })
}
