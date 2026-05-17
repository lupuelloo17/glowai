-- ════════════════════════════════════════════════════════════════════
--  Fundamentos para la cuenta del paciente
-- ════════════════════════════════════════════════════════════════════
--   1. Rol 'paciente' en check constraint de usuarios
--   2. Columnas nuevas en analisis_dermoscopicos
--   3. Tabla protocolos (protocolos personalizados por paciente)
--   4. 3 Storage buckets (avatares, evoluciones, analisis) + RLS
-- ════════════════════════════════════════════════════════════════════


-- ── 1. Rol 'paciente' en usuarios ──────────────────────────────────
alter table public.usuarios
  drop constraint if exists usuarios_rol_check;

alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('admin', 'medico', 'recepcion', 'paciente'));


-- ── 2. Columnas nuevas en analisis_dermoscopicos ───────────────────
alter table public.analisis_dermoscopicos
  add column if not exists imagen_url           text,
  add column if not exists imagen_analizada_url text,
  add column if not exists compartido_medico    boolean not null default false,
  add column if not exists visto_por_medico     boolean not null default false,
  add column if not exists notas_medico         text,
  add column if not exists creado_por           uuid references auth.users(id);


-- ── 3. Tabla protocolos ────────────────────────────────────────────
create table if not exists public.protocolos (
  id              uuid primary key default gen_random_uuid(),
  paciente_id     uuid not null references public.pacientes(id) on delete cascade,
  clinica_id      uuid not null references public.clinicas(id),
  medico_id       uuid references auth.users(id),
  nombre          text not null,
  descripcion     text,
  pasos           jsonb not null default '[]'::jsonb,
  -- Forma esperada: [{ id, texto, completado, fecha_completado, frecuencia }]
  productos       jsonb not null default '[]'::jsonb,
  -- Forma esperada: [{ marca, nombre, descripcion, foto_url, motivo }]
  activo          boolean not null default true,
  fecha_inicio    date not null default current_date,
  fecha_fin       date,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists protocolos_paciente_idx on public.protocolos(paciente_id);
create index if not exists protocolos_clinica_idx  on public.protocolos(clinica_id);

alter table public.protocolos enable row level security;

drop policy if exists "protocolos_de_clinica" on public.protocolos;
create policy "protocolos_de_clinica" on public.protocolos
  for all to authenticated
  using      (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'))
  with check (clinica_id::text = (auth.jwt() -> 'app_metadata' ->> 'clinica_id'));


-- ── 4. Storage buckets ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatares',    'avatares',    true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('evoluciones', 'evoluciones', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('analisis',    'analisis',    false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ── 4.1. Storage policies ──────────────────────────────────────────
-- Convención de paths:
--   avatares/{user_id}/{filename}
--   evoluciones/{clinica_id}/{paciente_id}/{filename}
--   analisis/{clinica_id}/{paciente_id}/{filename}
-- Las políticas leen el primer segmento del path para scoping por clínica.

-- avatares: lectura pública (perfiles visibles), escritura solo del propio usuario
drop policy if exists "avatares_lectura_publica"  on storage.objects;
drop policy if exists "avatares_escritura_propia" on storage.objects;

create policy "avatares_lectura_publica" on storage.objects
  for select to public
  using (bucket_id = 'avatares');

create policy "avatares_escritura_propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatares_update_propia" on storage.objects
  for update to authenticated
  using      (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatares_delete_propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);


-- evoluciones: privado, scope por clinica_id en el path
drop policy if exists "evoluciones_clinica" on storage.objects;
create policy "evoluciones_clinica" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'evoluciones'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
  )
  with check (
    bucket_id = 'evoluciones'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
  );


-- analisis: privado, scope por clinica_id en el path
drop policy if exists "analisis_storage_clinica" on storage.objects;
create policy "analisis_storage_clinica" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'analisis'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
  )
  with check (
    bucket_id = 'analisis'
    and (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'clinica_id')
  );
