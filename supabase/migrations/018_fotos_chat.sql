-- ═══════════════════════════════════════════════════════════════════════════
--  018_fotos_chat.sql
--  Fotos de evolución (antes/después) + Chat médico ↔ paciente
--  Ejecutar en Supabase SQL Editor (una sola vez)
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
--  ENUM: tipo_evolucion
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_evolucion AS ENUM ('antes', 'despues', 'progreso');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
--  TABLA: evoluciones
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evoluciones (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   uuid          NOT NULL REFERENCES pacientes(id)  ON DELETE CASCADE,
  clinica_id    uuid          NOT NULL REFERENCES clinicas(id)   ON DELETE CASCADE,
  medico_id     uuid          REFERENCES usuarios(id),
  tipo          tipo_evolucion NOT NULL,
  foto_url      text          NOT NULL,
  tratamiento   text,
  fecha         timestamptz   NOT NULL DEFAULT now(),
  notas         text,
  sesion_numero int           NOT NULL DEFAULT 1,
  creado_en     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evoluciones_paciente
  ON evoluciones(paciente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_evoluciones_clinica
  ON evoluciones(clinica_id,  fecha DESC);

ALTER TABLE evoluciones ENABLE ROW LEVEL SECURITY;

-- Paciente: ve y sube sus propias fotos
CREATE POLICY "evol_paciente_own"
  ON evoluciones FOR ALL
  USING     (paciente_id = auth.uid())
  WITH CHECK (paciente_id = auth.uid());

-- Staff (médico, admin, recepcion): ve y gestiona fotos de su clínica
CREATE POLICY "evol_staff_clinica"
  ON evoluciones FOR ALL
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios
      WHERE id = auth.uid() AND rol IN ('medico','admin','recepcion')
    )
  )
  WITH CHECK (
    clinica_id IN (
      SELECT clinica_id FROM usuarios
      WHERE id = auth.uid() AND rol IN ('medico','admin','recepcion')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
--  ENUM: tipo_mensaje
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tipo_mensaje AS ENUM (
    'texto', 'foto', 'protocolo', 'recordatorio', 'resultado_analisis'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
--  TABLA: mensajes
--  Convención: destinatario_id = pacientes.id identifica la conversación.
--  El remitente puede ser el staff (rol médico/admin) o el propio paciente.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      uuid          NOT NULL REFERENCES clinicas(id)  ON DELETE CASCADE,
  remitente_id    uuid          REFERENCES usuarios(id),
  destinatario_id uuid          REFERENCES pacientes(id),
  contenido       text,
  tipo            tipo_mensaje  NOT NULL DEFAULT 'texto',
  leido           boolean       NOT NULL DEFAULT false,
  fecha_lectura   timestamptz,
  archivo_url     text,
  metadata        jsonb,        -- datos extra: cita_id, analisis_id, protocolo, etc.
  creado_en       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario
  ON mensajes(destinatario_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_clinica
  ON mensajes(clinica_id,      creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_mensajes_no_leidos
  ON mensajes(destinatario_id, leido)
  WHERE NOT leido;

ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

-- Paciente: ve sus propios mensajes (como remitente o destinatario)
CREATE POLICY "msg_paciente_own"
  ON mensajes FOR ALL
  USING (
    destinatario_id = auth.uid()
    OR remitente_id = auth.uid()
  );

-- Staff: ve y gestiona mensajes de su clínica
CREATE POLICY "msg_staff_clinica"
  ON mensajes FOR ALL
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios
      WHERE id = auth.uid() AND rol IN ('medico','admin','recepcion')
    )
  )
  WITH CHECK (
    clinica_id IN (
      SELECT clinica_id FROM usuarios
      WHERE id = auth.uid() AND rol IN ('medico','admin','recepcion')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
--  BUCKET: evoluciones
--  Path esperado: {clinica_id}/{paciente_id}/{timestamp}.{ext}
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evoluciones',
  'evoluciones',
  false,
  10485760,   -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Paciente sube fotos a su propia carpeta
CREATE POLICY "evol_storage_paciente_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evoluciones'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Paciente y staff (misma clínica) pueden leer
CREATE POLICY "evol_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'evoluciones'
    AND (
      -- El propio paciente
      (string_to_array(name, '/'))[2] = auth.uid()::text
      -- O staff de la misma clínica
      OR auth.uid() IN (
        SELECT id FROM usuarios
        WHERE clinica_id::text = (string_to_array(name, '/'))[1]
      )
    )
  );

-- Staff puede eliminar fotos de su clínica
CREATE POLICY "evol_storage_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'evoluciones'
    AND auth.uid() IN (
      SELECT id FROM usuarios
      WHERE clinica_id::text = (string_to_array(name, '/'))[1]
        AND rol IN ('medico','admin')
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
--  REALTIME: activar publicación para mensajes
--  (Requerido para que Supabase Realtime reciba los INSERTs en tiempo real)
-- ────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
