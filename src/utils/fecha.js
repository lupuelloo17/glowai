/**
 * Formatea una fecha ISO o string de fecha a texto legible en español.
 * Ej: "2026-05-16T20:44:37.12066+00:00" → "16 de mayo de 2026"
 *     "2026-05-16" → "16 de mayo de 2026"
 *     null / undefined → "Sin fecha"
 */
export function formatFecha(fechaISO) {
  if (!fechaISO) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    }).format(new Date(fechaISO))
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea un número como precio en euros con 2 decimales.
 * Ej: 120 → "120,00 €"   |   null → "Sin precio"
 */
export function formatPrecio(amount) {
  if (amount == null || amount === '') return 'Sin precio'
  return new Intl.NumberFormat('es-ES', {
    style:                 'currency',
    currency:              'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
