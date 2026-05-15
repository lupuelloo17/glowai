import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import AnalisisPage from './pages/AnalisisPage'
import ReservarPage from './pages/ReservarPage'
import HistorialPage from './pages/HistorialPage'
import SkinCheckPage from './pages/SkinCheckPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-blush-50 flex items-start justify-center py-6 px-4">
        {/* Mobile shell */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden min-h-[780px] flex flex-col">
          <Routes>
            <Route path="/"            element={<WelcomePage />} />
            <Route path="/home"        element={<HomePage />} />
            <Route path="/analisis"    element={<AnalisisPage />} />
            <Route path="/reservar"    element={<ReservarPage />} />
            <Route path="/historial"   element={<HistorialPage />} />
            <Route path="/skin-check"  element={<SkinCheckPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
