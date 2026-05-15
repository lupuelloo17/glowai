import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const TREATMENTS = [
  { id: 'vitamina_c', icon: '✨', name: 'Vitamina C + Ácido Hialurónico', duration: '50 min', price: '€75' },
  { id: 'peeling',    icon: '🧴', name: 'Peeling Enzimático',              duration: '60 min', price: '€85' },
  { id: 'rf',         icon: '🔬', name: 'Microagujas RF',                   duration: '75 min', price: '€120' },
  { id: 'hidra',      icon: '💧', name: 'Hidratación Profunda',            duration: '45 min', price: '€65' },
]

const TIMES = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00']

function buildWeek(offset = 0) {
  const today = new Date()
  today.setDate(today.getDate() + offset * 7)
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      dayShort: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      num: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      full: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      isPast: d < new Date(new Date().setHours(0,0,0,0)),
    }
  })
}

export default function ReservarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const defaultTreatmentId = location.state?.treatmentId ?? null

  const [step, setStep] = useState(1)
  const [treatment, setTreatment] = useState(
    defaultTreatmentId ? TREATMENTS.find(t => t.id === defaultTreatmentId) ?? null : null
  )
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)

  const week = buildWeek(weekOffset)
  const canProceed = treatment && selectedDay && selectedTime

  if (step === 2) {
    return (
      <div className="flex flex-col flex-1 animate-fade-in">
        <div className="flex-1 flex flex-col items-center justify-center px-6 bg-blush-50">
          {/* Success icon */}
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
            <CheckCircle2 size={40} className="text-blush-400" />
          </div>
          <h2 className="text-ink font-bold text-xl mb-1">Cita confirmada</h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            Tu reserva ha sido registrada en Clínica Lumière
          </p>

          {/* Summary card */}
          <div className="w-full bg-white rounded-2xl p-5 space-y-3 shadow-sm mb-6">
            {[
              { label: 'Tratamiento', value: treatment.name,  icon: treatment.icon },
              { label: 'Fecha',       value: selectedDay.full, icon: '📅' },
              { label: 'Hora',        value: selectedTime,     icon: '🕐' },
              { label: 'Duración',    value: treatment.duration, icon: '⏱️' },
              { label: 'Precio',      value: treatment.price,  icon: '💰' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-500 text-sm flex items-center gap-2">
                  <span>{icon}</span> {label}
                </span>
                <span className="text-ink text-sm font-semibold text-right max-w-[180px]">{value}</span>
              </div>
            ))}
          </div>

          <p className="text-gray-400 text-xs text-center mb-6">
            Recibirás un recordatorio por mensaje 24h antes
          </p>

          <button
            onClick={() => navigate('/home')}
            className="w-full bg-ink text-white font-semibold text-sm py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Volver al inicio
          </button>
          <button
            onClick={() => { setStep(1); setTreatment(null); setSelectedDay(null); setSelectedTime(null) }}
            className="w-full mt-2 text-blush-500 text-sm font-medium py-2"
          >
            Reservar otra cita
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white px-5 pt-7 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blush-50 text-blush-400"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-ink font-semibold text-base">Reservar cita</h1>
          <p className="text-gray-400 text-xs">Clínica Lumière</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-blush-50 px-5 pb-4 pt-3 space-y-5">
        {/* Treatment */}
        <section>
          <p className="text-ink font-semibold text-sm mb-2">Tratamiento</p>
          <div className="grid grid-cols-2 gap-2">
            {TREATMENTS.map((t) => {
              const active = treatment?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTreatment(t)}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    active
                      ? 'bg-ink border-ink text-white shadow-sm'
                      : 'bg-white border-blush-100 text-ink hover:border-blush-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{t.icon}</span>
                  <p className={`text-xs font-semibold leading-snug ${active ? 'text-white' : 'text-ink'}`}>
                    {t.name}
                  </p>
                  <p className={`text-[10px] mt-1 ${active ? 'text-blush-300' : 'text-gray-400'}`}>
                    {t.duration} · {t.price}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Calendar */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-ink font-semibold text-sm">Fecha</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                disabled={weekOffset === 0}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white disabled:opacity-30"
              >
                <ChevronLeft size={14} className="text-blush-400" />
              </button>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white"
              >
                <ChevronRight size={14} className="text-blush-400" />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5">
            {week.map((d) => {
              const active = selectedDay?.num === d.num && selectedDay?.month === d.month
              return (
                <button
                  key={`${d.num}-${d.month}`}
                  disabled={d.isPast}
                  onClick={() => setSelectedDay(d)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-2xl border text-center transition-all ${
                    active
                      ? 'bg-ink border-ink text-white shadow-sm'
                      : d.isPast
                      ? 'bg-white/50 border-transparent text-gray-300 cursor-not-allowed'
                      : 'bg-white border-blush-100 text-ink hover:border-blush-300'
                  }`}
                >
                  <span className={`text-[9px] uppercase font-medium ${active ? 'text-blush-300' : d.isPast ? 'text-gray-300' : 'text-gray-400'}`}>
                    {d.dayShort}
                  </span>
                  <span className="text-sm font-bold">{d.num}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Time */}
        <section>
          <p className="text-ink font-semibold text-sm mb-2">Hora</p>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedTime === t
                    ? 'bg-ink border-ink text-white shadow-sm'
                    : 'bg-white border-blush-100 text-ink hover:border-blush-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* CTA */}
        <button
          disabled={!canProceed}
          onClick={() => setStep(2)}
          className={`w-full font-semibold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ${
            canProceed
              ? 'bg-ink text-white active:scale-95 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 size={18} />
          Confirmar reserva
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
