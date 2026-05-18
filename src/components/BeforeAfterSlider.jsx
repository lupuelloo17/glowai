import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * BeforeAfterSlider — comparador deslizable antes/después.
 * Funciona con mouse y touch mediante Pointer Events API.
 *
 * Props:
 *   beforeUrl  string  — URL de la imagen "antes" (base)
 *   afterUrl   string  — URL de la imagen "después" (overlay)
 *   className  string  — clases extra para el contenedor
 */
export default function BeforeAfterSlider({ beforeUrl, afterUrl, className = '' }) {
  const containerRef = useRef(null)
  const handleRef    = useRef(null)
  const [pos, setPos] = useState(50)   // porcentaje 0–100

  const calcPct = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 50
    return Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
  }, [])

  // Usar pointer events en el handle para captura correcta en touch
  function onPointerDown(e) {
    e.preventDefault()
    handleRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!handleRef.current?.hasPointerCapture(e.pointerId)) return
    setPos(calcPct(e.clientX))
  }

  function onPointerUp(e) {
    handleRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ touchAction: 'none', cursor: 'ew-resize' }}
    >
      {/* ANTES — imagen base (siempre visible) */}
      <img
        src={beforeUrl}
        alt="Antes"
        className="w-full h-full object-cover block pointer-events-none"
        draggable={false}
      />
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-lg tracking-widest uppercase pointer-events-none">
        Antes
      </span>

      {/* DESPUÉS — recortado según posición del slider */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={afterUrl}
          alt="Después"
          className="absolute inset-0 w-full h-full object-cover block"
          draggable={false}
        />
        <span className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-lg tracking-widest uppercase">
          Después
        </span>
      </div>

      {/* Línea divisoria */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      />

      {/* Handle deslizable */}
      <div
        ref={handleRef}
        className="absolute top-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center cursor-ew-resize"
        style={{
          left:      `${pos}%`,
          transform: 'translate(-50%, -50%)',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <ChevronLeft  size={10} className="text-gray-500 -mr-px" />
        <ChevronRight size={10} className="text-gray-500 -ml-px" />
      </div>
    </div>
  )
}
