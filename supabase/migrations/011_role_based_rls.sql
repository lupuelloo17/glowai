-- ════════════════════════════════════════════════════════════════════
--  RLS basada en rol: pacientes ven solo lo suyo; staff ve la clínica
-- ════════════════════════════════════════════════════════════════════
--
--  Hasta aquí las policies filtraban únicamente por clinica_id, lo que
--  significaba que un paciente autenticado podía leer (y modificar) los
--  datos de cualquier otro paciente de su misma clínica. Cerramos ese
--  hueco con un CASE sobre el claim 'rol' del JWT:
--
--    - paciente  → ve/edita SOLO sus propias filas (id = auth.uid()
--                  para pacientes; paciente_id = auth.uid() en tablas
--                  hijas como sesiones, analisis, citas, protocolos)
--    - staff     → admin/medico/recepcion mantienen alcance por clínica
--    - cualquier otro → false (sin acceso)
--
--  Defensa en profundidad: combinado con los guards de ruta del cliente
--  (RequireRole), un paciente que manipule URLs o llame Supabase desde
--  la consola sigue sin poder leer datos ajenos.
-- ════════════════════════════════════════════════════════════════════


-- ── Helper inline: rol del usuario actual ─────────────────────────
-- Lo usamos en cada policy para no repetir el path completo del JWT.
-- Cuando el JWT no trae rol (caso edge), tratamos como sin acceso.

-- ── 1. pacientes ──────────────────────────────────────────────────
drop policy if exists "pacientes_de_clinica"     on public.pacientes;
drop policy if exists "pacientes_self_or_staff"  on public.pacientes;

create policy "pacientes_self_or_staff" on public.pacientes
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  );


-- ── 2. sesiones ───────────────────────────────────────────────────
drop policy if exists "sesiones_de_clinica"    on public.sesiones;
drop policy if exists "sesiones_self_or_staff" on public.sesiones;

create policy "sesiones_self_or_staff" on public.sesiones
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  );


-- ── 3. analisis_dermoscopicos ─────────────────────────────────────
drop policy if exists "analisis_de_clinica"    on public.analisis_dermoscopicos;
drop policy if exists "analisis_self_or_staff" on public.analisis_dermoscopicos;

create policy "analisis_self_or_staff" on public.analisis_dermoscopicos
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  );


-- ── 4. citas ──────────────────────────────────────────────────────
drop policy if exists "citas_de_clinica"    on public.citas;
drop policy if exists "citas_self_or_staff" on public.citas;

create policy "citas_self_or_staff" on public.citas
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  );


-- ── 5. protocolos ─────────────────────────────────────────────────
drop policy if exists "protocolos_de_clinica"    on public.protocolos;
drop policy if exists "protocolos_self_or_staff" on public.protocolos;

create policy "protocolos_self_or_staff" on public.protocolos
  for all to authenticated
  using (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  )
  with check (
    case (auth.jwt() -> 'app_metadata' ->> 'rol')
      when 'paciente'  then paciente_id = auth.uid()
      when 'admin'     then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'medico'    then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      when 'recepcion' then clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
      else false
    end
  );
