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

// Clinic (multi-tenant)
import { ClinicProvider }       from './contexts/ClinicContext'
import { CitasProvider }        from './contexts/CitasContext'
import DashboardPage            from './pages/clinica/DashboardPage'
import PacientesPage            from './pages/clinica/PacientesPage'
import PacienteDetallePage      from './pages/clinica/PacienteDetallePage'
import AnalisisClinicaPage      from './pages/clinica/AnalisisClinicaPage'
import AgendaPage               from './pages/clinica/AgendaPage'
import MisCitasPacientePage     from './pages/clinica/MisCitasPacientePage'
import ConfiguracionPage        from './pages/clinica/ConfiguracionPage'

// ── Protected route: redirects to /login if unauthenticated ──
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ── Clinic routes wrapped in ClinicProvider ───────────────────
function ClinicRoutes() {
  return (
    <ClinicProvider>
      <CitasProvider>
        <Routes>
          <Route path="dashboard"          element={<DashboardPage />} />
          <Route path="pacientes"          element={<PacientesPage />} />
          <Route path="paciente/:id"       element={<PacienteDetallePage />} />
          <Route path="analisis"           element={<AnalisisClinicaPage />} />
          <Route path="agenda"             element={<AgendaPage />} />
          <Route path="mi-perfil/citas"    element={<MisCitasPacientePage />} />
          <Route path="configuracion"      element={<ConfiguracionPage />} />
          <Route path="*"                  element={<Navigate to="dashboard" replace />} />
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

          {/* ── Patient-facing ── */}
          <Route path="/bienvenida"  element={<PatientShell><WelcomePage /></PatientShell>} />
          <Route path="/home"        element={<PatientShell><HomePage /></PatientShell>} />
          <Route path="/analisis"    element={<PatientShell><AnalisisPage /></PatientShell>} />
          <Route path="/reservar"    element={<PatientShell><ReservarPage /></PatientShell>} />
          <Route path="/historial"   element={<PatientShell><HistorialPage /></PatientShell>} />
          <Route path="/skin-check"  element={<PatientShell><SkinCheckPage /></PatientShell>} />
          <Route path="/dermoscopia" element={<PatientShell><DermoscopiaPage /></PatientShell>} />

          {/* ── Login / Demo ── */}
          <Route path="/login" element={<PatientShell><LoginPage /></PatientShell>} />
          <Route path="/demo"  element={<PatientShell><DemoPage /></PatientShell>} />

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
