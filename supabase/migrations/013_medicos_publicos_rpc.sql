-- ════════════════════════════════════════════════════════════════════
--  RPC público: lista de médicos por clínica para el registro
-- ════════════════════════════════════════════════════════════════════
--
--  Problema: la página /registro/:slug es pública (anon). Necesita
--  ofrecer al paciente la lista de médicos disponibles para asignarse,
--  pero la tabla public.usuarios tiene RLS que solo deja a cada usuario
--  ver su propia fila.
--
--  Solución: una función SECURITY DEFINER que bypasea RLS y devuelve
--  solo info no sensible (id, nombre) de los médicos activos de una
--  clínica identificada por su slug. Concedemos EXECUTE a anon y
--  authenticated.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.get_medicos_clinica(p_clinica_slug text)
returns table(id uuid, nombre text)
language sql
security definer
stable
set search_path = public, auth
as $$
  select u.id, u.nombre
  from public.usuarios u
  join public.clinicas c on c.id = u.clinica_id
  where c.slug = p_clinica_slug
    and u.rol    = 'medico'
    and u.activo = true
  order by u.nombre;
$$;

grant execute on function public.get_medicos_clinica(text) to anon, authenticated;
