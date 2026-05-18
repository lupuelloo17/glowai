-- ═══════════════════════════════════════════════════════════════════════════
--  020_mensajes_destinatario_usuario.sql
--
--  Problema: destinatario_id referencia pacientes(id).
--  Eso imposibilita enviar mensajes a un médico (que no está en pacientes).
--
--  Solución: añadir destinatario_usuario_id → usuarios(id).
--
--  Convención final:
--    Médico → Paciente:  destinatario_id = paciente.id  (FK a pacientes)
--                        destinatario_usuario_id = NULL
--    Paciente → Médico:  destinatario_id = paciente.id  (thread identifier)
--                        destinatario_usuario_id = medico.id (FK a usuarios)
--
--  Esto permite filtrar conversaciones por médico:
--    .or('remitente_id.eq.X,destinatario_usuario_id.eq.X')
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS destinatario_usuario_id uuid
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mensajes_dest_usuario
  ON public.mensajes(destinatario_usuario_id, creado_en DESC);

-- Actualizar la policy del paciente para incluir mensajes
-- donde él es el destinatario_usuario (no aplica en realidad, pero dejamos
-- la policy existente intacta — sigue siendo correcta ya que:
--   - médico→paciente: destinatario_id = auth.uid()  → pasa USING
--   - paciente→médico: remitente_id    = auth.uid()  → pasa USING
-- No se requieren cambios en las policies existentes.
