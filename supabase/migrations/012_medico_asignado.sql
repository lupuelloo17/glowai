-- ════════════════════════════════════════════════════════════════════
--  Médico asignado: análisis y datos solo visibles a su médico
-- ════════════════════════════════════════════════════════════════════
--
--  Cambia el modelo de acceso del staff:
--    Antes: admin/medico/recepcion → ven TODO de su clínica
--    Después:
--      - admin/recepcion → ven todo (gestión y triaje siguen funcionando)
--      - medico          → solo pacientes y datos donde es el médico asignado
--
--  Se aprovecha que sesiones, citas, protocolos ya tienen medico_id
--  como columna. Se añade medico_id a pacientes y a
--  analisis_dermoscopicos (que no lo tenían).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Nuevas columnas ─────────────────────────────────────────────
alter table public.pacientes
  add column if not exists medico_id uuid references auth.users(id);

alter table public.analisis_dermoscopicos
  add column if not exists medico_id uuid references auth.users(id);

create index if not exists pacientes_medico_idx on public.pacientes(medico_id);
create index if not exists analisis_medico_idx  on public.analisis_dermoscopicos(medico_id);


-- ── 2. RLS rehecho con triple rol ─────────────────────────────────
--   paciente   → propia fila / sus rows hijas
--   admin/rec  → toda la clínica
--   medico     → solo sus pacientes y datos
-- ────────────────────────────────────────────────────────────────────

-- ── pacientes ──
drop policy if exists "pacientes_self_or_staff" on public.pacientes;

create policy "pacientes_acceso" on public.pacientes
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  );


-- ── sesiones (usa medico_id propio de la fila) ──
drop policy if exists "sesiones_self_or_staff" on public.sesiones;

create policy "sesiones_acceso" on public.sesiones
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  );


-- ── analisis_dermoscopicos ──
drop policy if exists "analisis_self_or_staff" on public.analisis_dermoscopicos;

create policy "analisis_acceso" on public.analisis_dermoscopicos
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  );


-- ── citas ──
drop policy if exists "citas_self_or_staff" on public.citas;

create policy "citas_acceso" on public.citas
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  );


-- ── protocolos ──
drop policy if exists "protocolos_self_or_staff" on public.protocolos;

create policy "protocolos_acceso" on public.protocolos
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then medico_id = auth.uid()
      else false
    end
  );
