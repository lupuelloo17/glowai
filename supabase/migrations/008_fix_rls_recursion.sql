-- ════════════════════════════════════════════════════════════════════
--  Fix RLS recursion en policies de usuarios y rediseño con JWT
-- ════════════════════════════════════════════════════════════════════
--
--  Contexto del bug:
--    La policy "usuario_ve_su_clinica" en public.usuarios estaba definida
--    como `clinica_id in (select clinica_id from usuarios where id = auth.uid())`.
--    Eso es una recursión: la policy sobre usuarios consulta usuarios →
--    dispara su propia policy → loop infinito.
--    Postgres devolvía: ERROR: infinite recursion detected in policy for
--    relation "usuarios" (SQLSTATE 42P17).
--
--  Además, todas las demás policies (sesiones, pacientes, citas, etc.)
--  consultaban `usuarios` en su `USING`, así que ninguna escritura/lectura
--  funcionaba: cualquier query disparaba la recursión.
--
--  Solución:
--    1. Drop de todas las policies anteriores en las tablas afectadas.
--    2. Policy de usuarios reescrita como auth.uid() = id (sin subquery).
--    3. Resto de tablas leen clinica_id directamente del JWT, vía
--       (auth.jwt() -> 'app_metadata' ->> 'clinica_id').
--       Eso requiere que raw_app_meta_data de auth.users tenga clinica_id
--       (ver migración 007 / setup manual de usuarios demo).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Drop policies viejas ────────────────────────────────────────
drop policy if exists "usuario_ve_su_clinica"      on public.usuarios;
drop policy if exists "usuarios_propios"           on public.usuarios;
drop policy if exists "clinica_propia"             on public.clinicas;
drop policy if exists "clinicas_propias"           on public.clinicas;
drop policy if exists "clinicas_edicion_propia"    on public.clinicas;
drop policy if exists "clinicas_publicas"          on public.clinicas;
drop policy if exists "clinicas_select_publico"    on public.clinicas;
drop policy if exists "clinicas_propia_edicion"    on public.clinicas;
drop policy if exists "medicos_de_clinica"         on public.medicos;
drop policy if exists "pacientes_de_clinica"       on public.pacientes;
drop policy if exists "citas_de_clinica"           on public.citas;
drop policy if exists "sesiones_de_clinica"        on public.sesiones;
drop policy if exists "analisis_de_clinica"        on public.analisis_dermoscopicos;
drop policy if exists "tratamientos_clinica"       on public.tratamientos;

-- ── 2. usuarios: cada quien solo se ve a sí mismo, sin subquery ────
create policy "usuarios_propios" on public.usuarios
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 3. clinicas: lectura pública (landings por slug); edición JWT ──
create policy "clinicas_select_publico" on public.clinicas
  for select to anon, authenticated
  using (true);

create policy "clinicas_propia_edicion" on public.clinicas
  for update to authenticated
  using (id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

-- ── 4. Resto de tablas: clinica_id del JWT directo, sin subqueries ─
create policy "medicos_de_clinica" on public.medicos
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

create policy "pacientes_de_clinica" on public.pacientes
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

create policy "citas_de_clinica" on public.citas
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

create policy "sesiones_de_clinica" on public.sesiones
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

create policy "analisis_de_clinica" on public.analisis_dermoscopicos
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));

create policy "tratamientos_clinica" on public.tratamientos
  for all to authenticated
  using (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));
