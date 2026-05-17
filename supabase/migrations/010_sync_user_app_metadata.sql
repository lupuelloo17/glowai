-- ════════════════════════════════════════════════════════════════════
--  Auto-sincronización de auth.users.raw_app_meta_data desde usuarios
-- ════════════════════════════════════════════════════════════════════
--
--  Problema:
--    Las policies RLS de pacientes/sesiones/citas leen clinica_id desde
--    auth.jwt() -> 'app_metadata'. Pero un usuario recién registrado no
--    tiene esos claims en la JWT — solo se setean si actualizamos
--    auth.users.raw_app_meta_data, y eso requiere service_role.
--
--  Solución:
--    Trigger en public.usuarios que, al INSERT o UPDATE, escribe
--    rol, clinica_id y clinica_slug en raw_app_meta_data del usuario
--    correspondiente. Usamos SECURITY DEFINER para que el trigger pueda
--    actualizar auth.users sin necesidad de privilegios del cliente.
--
--    Flujo de registro:
--      1. supabase.auth.signUp() — crea auth.user, JWT sin metadata
--      2. INSERT en usuarios (id = auth.uid()) — la policy "usuarios_propios"
--         permite que el propio usuario inserte su fila
--      3. Trigger dispara y actualiza raw_app_meta_data
--      4. Cliente llama supabase.auth.refreshSession() — JWT nueva con claims
--      5. INSERT en pacientes — RLS pasa porque la JWT ahora tiene clinica_id
-- ════════════════════════════════════════════════════════════════════

create or replace function public.sync_user_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_slug text;
begin
  -- Obtener el slug de la clínica del paciente
  select slug into v_slug
    from public.clinicas
   where id = new.clinica_id;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object(
            'rol',          new.rol,
            'clinica_id',   new.clinica_id::text,
            'clinica_slug', coalesce(v_slug, '')
          )
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists usuarios_sync_metadata on public.usuarios;
create trigger usuarios_sync_metadata
  after insert or update of rol, clinica_id
  on public.usuarios
  for each row execute function public.sync_user_app_metadata();


-- Permisos: la función debe pertenecer al rol postgres (security definer)
-- y los usuarios authenticated solo necesitan que el trigger se dispare,
-- no que ejecuten la función directamente.
revoke all on function public.sync_user_app_metadata() from public, anon, authenticated;
