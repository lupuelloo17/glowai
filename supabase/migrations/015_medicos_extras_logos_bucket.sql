-- ════════════════════════════════════════════════════════════════════
--  Médicos: añadir columnas telefono y foto
--  Storage: crear bucket logos para logos de clínica
-- ════════════════════════════════════════════════════════════════════
--
--  ConfiguracionPage → SecEquipo usa los campos telefono y foto en el
--  formulario de médico. Sin estas columnas el INSERT falla con error
--  "column does not exist". Se añaden como nullable para no romper
--  los registros existentes.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Columnas nuevas en medicos ──────────────────────────────────
alter table public.medicos
  add column if not exists telefono text,
  add column if not exists foto      text;


-- ── 2. Bucket logos (logos de clínica en SecIdentidad) ─────────────
-- Público para que el logo sea visible sin autenticación.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 2097152,
  array['image/jpeg','image/png','image/webp','image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ── 3. Storage policies para logos ────────────────────────────────
-- Lectura pública (logos visibles en landing y portal).
-- Escritura solo para admin de la clínica dueña del archivo.
-- Convención de path: {clinica_id}.{ext}

drop policy if exists "logos_lectura_publica" on storage.objects;
create policy "logos_lectura_publica" on storage.objects
  for select to public
  using (bucket_id = 'logos');

drop policy if exists "logos_escritura_admin" on storage.objects;
create policy "logos_escritura_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  );

drop policy if exists "logos_update_admin" on storage.objects;
create policy "logos_update_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  );
