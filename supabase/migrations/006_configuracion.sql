-- ═══════════════════════════════════════════════════════════════════
--  GlowAI — Tabla tratamientos + campos config en clinicas
--  Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- Nuevos campos en clinicas
alter table clinicas add column if not exists web               text;
alter table clinicas add column if not exists horario           text;
alter table clinicas add column if not exists whatsapp_numero   text;
alter table clinicas add column if not exists notificaciones    jsonb default '{}';

-- Tratamientos
create table if not exists tratamientos (
  id               uuid        primary key default gen_random_uuid(),
  clinica_id       uuid        references clinicas(id) on delete cascade not null,
  nombre           text        not null,
  descripcion      text,
  duracion_minutos int         default 60,
  precio           decimal(10,2),
  color            text        default '#C8A882',
  activo           boolean     default true,
  creado_en        timestamptz default now()
);

alter table tratamientos enable row level security;

create policy "tratamientos_clinica" on tratamientos for all
  using      ((select clinica_id from usuarios where id = auth.uid()) = clinica_id)
  with check ((select clinica_id from usuarios where id = auth.uid()) = clinica_id);

create index if not exists tratamientos_clinica_idx on tratamientos(clinica_id);
