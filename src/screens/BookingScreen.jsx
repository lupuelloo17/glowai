import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Calendar, Clock, Sparkles } from 'lucide-react'

const TREATMENTS = [
  { id: 'hidra',   name: 'Hidratación Profunda',  duration: '45 min', price: '€65' },
  { id: 'peeling', name: 'Peeling Químico',        duration: '60 min', price: '€90' },
  { id: 'rf',      name: 'Microagujas RF',          duration: '75 min', price: '€120' },
]

const TIMES = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00']

const today = new Date()
const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today)
  d.setDate(today.getDate() + i + 1)
  return {
    day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
    num: d.getDate(),
    full: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }),
  }
})

export default function BookingScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: select, 2: confirm
  const [treatment, setTreatment] = useState(null)
  const [day, setDay] = useState(null)
  const [time, setTime] = useState(null)

  const canContinue = treatment && day && time

  if (step === 2) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 animate-fade-in">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 size={40} className="text-rose-400" />
        </div>
        <h2 className="text-gray-800 font-bold text-xl mb-1">Cita confirmada</h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Tu reserva ha sido registrada correctamente
        </p>

        <div className="w-full bg-rose-50 rounded-2xl p-5 space-y-3 mb-6">
          <Row icon="✨" label="Tratamiento" value={treatment.name} />
          <Row icon="📅" label="Fecha" value={day.full} />
          <Row icon="🕐" label="Hora" value={time} />
          <Row icon="💰" label="Precio" value={treatment.price} />
          <Row icon="⏱️" label="Duración" value={treatment.duration} />
        </div>

        <p className="text-gray-400 text-xs text-center mb-6">
          Recibirás un recordatorio 24h antes de tu cita
        </p>

        <button
          onClick={() => { setStep(1); setTreatment(null); setDay(null); setTime(null) }}
          className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all duration-200"
        >
          Reservar otra cita
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-gray-800 font-semibold text-base leading-tight">Reservar cita</h1>
          <p className="text-gray-400 text-xs">Elige tratamiento, día y hora</p>
        </div>
      </div>

      <div className="flex-1 px-5 overflow-y-auto pb-6 space-y-5">
        {/* Treatment selection */}
        <section>
          <p className="text-gray-700 font-semibold text-sm mb-2 flex items-center gap-1">
            <Sparkles size={14} className="text-rose-400" /> Tratamiento
          </p>
          <div className="space-y-2">
            {TREATMENTS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTreatment(t)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  treatment?.id === t.id
                    ? 'border-rose-300 bg-rose-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-rose-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  treatment?.id === t.id ? 'border-rose-400' : 'border-gray-300'
                }`}>
                  {treatment?.id === t.id && <div className="w-2 h-2 bg-rose-400 rounded-full" />}
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 text-sm font-medium">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.duration}</p>
                </div>
                <span className="text-rose-500 font-semibold text-sm">{t.price}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Day selection */}
        <section>
          <p className="text-gray-700 font-semibold text-sm mb-2 flex items-center gap-1">
            <Calendar size={14} className="text-rose-400" /> Fecha
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {DAYS.map((d) => (
              <button
                key={d.num}
                onClick={() => setDay(d)}
                className={`flex-shrink-0 flex flex-col items-center w-12 py-2 rounded-xl border text-center transition-all ${
                  day?.num === d.num
                    ? 'bg-gradient-to-b from-rose-400 to-pink-500 border-rose-400 text-white shadow-sm'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-rose-200'
                }`}
              >
                <span className={`text-[10px] uppercase font-medium ${day?.num === d.num ? 'text-rose-100' : 'text-gray-400'}`}>
                  {d.day}
                </span>
                <span className="text-base font-bold">{d.num}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Time selection */}
        <section>
          <p className="text-gray-700 font-semibold text-sm mb-2 flex items-center gap-1">
            <Clock size={14} className="text-rose-400" /> Hora
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                  time === t
                    ? 'bg-gradient-to-b from-rose-400 to-pink-500 border-rose-400 text-white shadow-sm'
                    : 'bg-white border-gray-100 text-gray-700 hover:border-rose-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* CTA */}
        <button
          onClick={() => canContinue && setStep(2)}
          disabled={!canContinue}
          className={`w-full font-semibold text-sm py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 ${
            canContinue
              ? 'bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 size={18} />
          Confirmar reserva
        </button>
      </div>
    </div>
  )
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-sm flex items-center gap-2">
        <span>{icon}</span> {label}
      </span>
      <span className="text-gray-800 text-sm font-semibold">{value}</span>
    </div>
  )
}
