import { useState } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useClinic } from '../contexts/ClinicContext'

// Drawer simple para que el paciente escriba un mensaje a la clínica.
// Construye un mailto: con asunto + cuerpo prepoblados y abre el cliente
// de correo del usuario. Sin backend, sin servicios externos.
//
// Email destino se toma de clinica.email_contacto o clinica.email
// (campo definido en ConfiguracionPage). Fallback a 'info@<slug>.com'.
export default function EscribirClinicaDrawer({ onClose }) {
  const { user } = useAuth()
  const { clinica } = useClinic()
  const brand = clinica?.color_primario ?? '#C8A882'

  const [asunto,  setAsunto]  = useState('')
  const [mensaje, setMensaje] = useState('')

  const destino = clinica?.email_contacto || clinica?.email || `info@${clinica?.slug ?? 'clinica'}.com`

  function handleEnviar() {
    if (!asunto.trim() || !mensaje.trim()) return

    // Firma: incluye nombre del paciente para que la clínica sepa de quién es
    const firma = user?.nombre ? `\n\n— ${user.nombre}\n${user.email}` : ''
    const subject = encodeURIComponent(asunto.trim())
    const body    = encodeURIComponent(mensaje.trim() + firma)
    const href    = `mailto:${destino}?subject=${subject}&body=${body}`

    window.location.href = href
    // Cerramos al instante; el cliente de email del usuario tomará el control
    setTimeout(onClose, 200)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 animate-slide-up shadow-2xl"
           style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} style={{ color: brand }} />
              <h2 className="text-gray-900 font-bold text-base">Escribir a tu clínica</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={15} className="text-gray-500" />
            </button>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Tu mensaje se enviará por email a <strong className="text-gray-700">{destino}</strong>. Se abrirá tu app de correo para que lo revises antes de enviar.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-gray-600 text-xs font-semibold mb-1 block">Asunto</label>
              <input
                value={asunto} onChange={e => setAsunto(e.target.value)}
                placeholder="Duda sobre mi tratamiento…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400"
              />
            </div>

            <div>
              <label className="text-gray-600 text-xs font-semibold mb-1 block">Mensaje</label>
              <textarea
                value={mensaje} onChange={e => setMensaje(e.target.value)}
                rows={6}
                placeholder="Hola, quería preguntar…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnviar}
              disabled={!asunto.trim() || !mensaje.trim()}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: brand }}
            >
              <Send size={14} /> Enviar
            </button>
          </div>

          <p className="text-gray-400 text-[10px] mt-3 leading-relaxed">
            Si tu mensaje es urgente o necesitas atención inmediata, llama directamente a tu clínica.
          </p>
        </div>
      </div>
    </>
  )
}
