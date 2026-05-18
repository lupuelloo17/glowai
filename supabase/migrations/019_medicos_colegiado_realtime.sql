-- ═══════════════════════════════════════════════════════════════════════════
--  019_medicos_colegiado_realtime.sql
--  1. Añade columna colegiado a medicos (necesaria para SecEquipo en ConfiguracionPage)
--  2. Activa REPLICA IDENTITY FULL en mensajes (fiabilidad de Realtime con filtros)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columna colegiado en medicos ─────────────────────────────────────────
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS colegiado text;

-- ── 2. Replica identity para mensajes ───────────────────────────────────────
--  Con DEFAULT sólo el PK está disponible en el evento de cambio.
--  FULL expone la fila completa, lo que permite que los filtros de
--  Supabase Realtime (destinatario_id=eq.X) funcionen de forma fiable.
ALTER TABLE public.mensajes REPLICA IDENTITY FULL;
