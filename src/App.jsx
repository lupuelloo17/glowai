import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Patient-facing pages
import LandingPage          from './pages/LandingPage'
import WelcomePage          from './pages/WelcomePage'
import HomePage             from './pages/HomePage'
import AnalisisPage         from './pages/AnalisisPage'
import ReservarPage         from './pages/ReservarPage'
import HistorialPage        from './pages/HistorialPage'
import SkinCheckPage        from './pages/SkinCheckPage'
import DermoscopiaPage      from './pages/DermoscopiaPage'
import LoginPage            from './pages/LoginPage'
import DemoPage             from './pages/DemoPage'
import DemoBanner           from './components/DemoBanner'
import RegistroPacientePage  from './pages/RegistroPacientePage'
import PoliticaPrivacidadPage from './pages/PoliticaPrivacidadPage'
import PreciosPage            from './pages/PreciosPage'
import PagoExitosoPage        from './pages/PagoExitosoPage'
import ResetPasswordPage      from './pages/ResetPasswordPage'
import NuevaContrasenaPage    from './pages/NuevaContrasenaPage'
import RegistroClinicaPage    from './pages/RegistroClinicaPage'

// Clinic (multi-tenant)
import { ClinicProvider }       from './contexts/ClinicContext'
import { CitasProvider }        from './contexts/CitasContext'
import DashboardPage            from './pages/clinica/DashboardPage'
import AdminDashboardPage       from './pages/clinica/AdminDashboardPage'
import MedicoDashboardPage      from './pages/clinica/MedicoDashboardPage'
import PacientesPage            from './pages/clinica/PacientesPage'
import PacienteDetallePage      from './pages/clinica/PacienteDetallePage'
import AnalisisClinicaPage      from './pages/clinica/AnalisisClinicaPage'
import AgendaPage               from './pages/clinica/AgendaPage'
import MisCitasPacientePage     from './pages/clinica/MisCitasPacientePage'
import ConfiguracionPage        from './pages/clinica/ConfiguracionPage'
import MiPerfilPage             from './pages/clinica/MiPerfilPage'
import MisAnalisisPage          from './pages/clinica/MisAnalisisPage'
import ClinicLayout             from './pages/clinica/ClinicLayout'
import { EvolucionPageStandalone } from './pages/clinica/EvolucionPage'
import ChatPacientePage         from './pages/clinica/ChatPacientePage'
import ConversacionesPage       from './pages/clinica/ConversacionesPage'

// Wrapper que renderiza DermoscopiaPage dentro del ClinicLayout del paciente.
// Así el paciente ve el bottom nav del portal (Inicio/Análisis/Citas/Datos)
// y no la BottomNav legacy de la app antigua.
function DermoscopiaWrapper() {
  return (
    <ClinicLayout>
      <DermoscopiaPage embedded />
    </ClinicLayout>
  )
}

// /dermoscopia (URL legacy): si el usuario es paciente, lo enviamos a la
// versión integrada del portal; si no, a /login.
function DermoscopiaRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.rol === 'paciente') {
    const slug = user.clinica_slug || 'clinica-lumiere'
    return <Navigate to={`/clinica/${slug}/dermoscopia`} replace />
  }
  return <Navigate to="/login" replace />
}

// ── Protected route: redirects to /login if unauthenticated ──
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ── RequireRole: bloquea acceso si el rol no coincide y redirige
// al portal apropiado para el rol del usuario. Defensa en profundidad
// junto con las policies RLS de Supabase.
const STAFF_ROLES = ['admin', 'medico', 'recepcion']
function RequireRole({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.rol)) {
    const slug = user.clinica_slug || 'clinica-lumiere'
    const fallback = user.rol === 'paciente'
      ? `/clinica/${slug}/mi-perfil`
      : `/clinica/${slug}/dashboard`
    return <Navigate to={fallback} replace />
  }
  return children
}

// ── Catch-all: cualquier subruta /clinica/:slug/* no reconocida
// envía al usuario a su portal según rol.
function RoleHomeRedirect() {
  const { user } = useAuth()
  const slug = user?.clinica_slug || 'clinica-lumiere'
  const dest = user?.rol === 'paciente' ? 'mi-perfil' : 'dashboard'
  return <Navigate to={`/clinica/${slug}/${dest}`} replace />
}

// ── /analisis renderiza distinto componente según rol:
// staff ve la lista clínica completa; paciente ve solo sus análisis.
function AnalisisPorRol() {
  const { user } = useAuth()
  if (user?.rol === 'paciente') return <MisAnalisisPage />
  return <AnalisisClinicaPage />
}

// ── /dashboard renderiza distinto componente según rol:
// admin ve métricas de clínica + Stripe; medico ve su agenda propia;
// recepcion ve el dashboard general.
function DashboardPorRol() {
  const { user } = useAuth()
  if (user?.rol === 'admin')   return <AdminDashboardPage />
  if (user?.rol === 'medico')  return <MedicoDashboardPage />
  return <DashboardPage />
}

// ── Clinic routes wrapped in ClinicProvider ───────────────────
function ClinicRoutes() {
  return (
    <ClinicProvider>
      <CitasProvider>
        <Routes>
          {/* ── Staff (admin/medico/recepcion) ── */}
          <Route path="dashboard"     element={<RequireRole roles={STAFF_ROLES}><DashboardPorRol /></RequireRole>} />
          <Route path="pacientes"     element={<RequireRole roles={STAFF_ROLES}><PacientesPage /></RequireRole>} />
          <Route path="paciente/:id"  element={<RequireRole roles={STAFF_ROLES}><PacienteDetallePage /></RequireRole>} />
          <Route path="agenda"        element={<RequireRole roles={STAFF_ROLES}><AgendaPage /></RequireRole>} />
          <Route path="configuracion" element={<RequireRole roles={['admin']}><ConfiguracionPage /></RequireRole>} />

          {/* ── Paciente ── */}
          <Route path="mi-perfil"              element={<RequireRole roles={['paciente']}><MiPerfilPage /></RequireRole>} />
          <Route path="mi-perfil/citas"        element={<RequireRole roles={['paciente']}><MisCitasPacientePage /></RequireRole>} />
          <Route path="mi-perfil/evolucion"    element={<RequireRole roles={['paciente']}><EvolucionPageStandalone /></RequireRole>} />
          <Route path="mi-perfil/chat"         element={<RequireRole roles={['paciente']}><ChatPacientePage /></RequireRole>} />
          <Route path="dermoscopia"            element={<RequireRole roles={['paciente']}><DermoscopiaWrapper /></RequireRole>} />

          {/* ── Conversaciones staff ── */}
          <Route path="conversaciones"         element={<RequireRole roles={['admin','medico','recepcion']}><ConversacionesPage /></RequireRole>} />

          {/* ── /analisis: distinto componente por rol ── */}
          <Route path="analisis"      element={<AnalisisPorRol />} />

          {/* ── Catch-all: redirige al home del rol ── */}
          <Route path="*"             element={<RoleHomeRedirect />} />
        </Routes>
      </CitasProvider>
    </ClinicProvider>
  )
}

// ── Shell wrappers ────────────────────────────────────────────
function PatientShell({ children }) {
  return (
    <div className="min-h-screen bg-blush-50 flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden min-h-[780px] flex flex-col">
        <DemoBanner />
        {children}
      </div>
    </div>
  )
}

function ClinicShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden min-h-[780px] flex flex-col">
        <DemoBanner />
        {children}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"                    element={<LandingPage />} />
          <Route path="/precios"             element={<PreciosPage />} />
          <Route path="/pago-exitoso"        element={<PagoExitosoPage />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidadPage />} />
          <Route path="/registro/:slug"      element={<PatientShell><RegistroPacientePage /></PatientShell>} />

          {/* ── App de paciente legacy (Valentina + datos hardcoded) ──
              Retirada para evitar confusión con el portal real autenticado.
              Cualquier acceso a estas URLs antiguas envía a /login, que con el
              redirect por rol llevará al usuario al portal correcto:
                - paciente  → /clinica/:slug/mi-perfil
                - staff     → /clinica/:slug/dashboard
              La página /bienvenida se conserva como entrada amistosa. */}
          <Route path="/bienvenida"  element={<PatientShell><WelcomePage /></PatientShell>} />
          <Route path="/home"        element={<Navigate to="/login" replace />} />
          <Route path="/analisis"    element={<Navigate to="/login" replace />} />
          <Route path="/reservar"    element={<Navigate to="/login" replace />} />
          <Route path="/historial"   element={<Navigate to="/login" replace />} />
          <Route path="/skin-check"  element={<Navigate to="/login" replace />} />
          <Route path="/dermoscopia" element={<DermoscopiaRedirect />} />

          {/* ── Login / Demo ── */}
          <Route path="/login"             element={<PatientShell><LoginPage /></PatientShell>} />
          <Route path="/demo"              element={<PatientShell><DemoPage /></PatientShell>} />
          <Route path="/reset-password"    element={<PatientShell><ResetPasswordPage /></PatientShell>} />
          <Route path="/nueva-contrasena"  element={<PatientShell><NuevaContrasenaPage /></PatientShell>} />
          <Route path="/registro-clinica"  element={<PatientShell><RegistroClinicaPage /></PatientShell>} />

          {/* ── Clinic dashboard (protected) ── */}
          <Route
            path="/clinica/:slug/*"
            element={
              <RequireAuth>
                <ClinicShell>
                  <ClinicRoutes />
                </ClinicShell>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
