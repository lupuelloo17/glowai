-- ════════════════════════════════════════════════════════════════════
--  Seed: paciente demo para LoginPage
--  Email: paciente@lumiere.com  ·  Password: demo1234
-- ════════════════════════════════════════════════════════════════════
--
--  Crea (o recrea) un paciente demo completo con:
--   - Usuario en auth.users + identity para login email/password
--   - Fila en public.usuarios (rol=paciente) — el trigger sync_user_app_metadata
--     escribirá rol/clinica_id/clinica_slug en raw_app_meta_data automáticamente
--   - Fila en public.pacientes con foto, datos clínicos, motivo, RGPD
--   - 1 cita próxima (mañana 10:00)
--   - 1 sesión pasada con fotos antes/después
--   - 1 análisis dermoscópico (moderado, compartido con médico)
--   - 1 protocolo activo con 4 pasos y 2 productos cosmecéuticos
--
--  Idempotente: borra todo lo previo del demo y lo recrea.
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  v_user_id    uuid := 'a0a00001-0000-4000-8000-000000000001';
  v_proto_id   uuid := 'a0a00001-0000-4000-8000-000000000002';
  v_clinica_id uuid;
begin
  select id into v_clinica_id from public.clinicas where slug = 'clinica-lumiere';
  if v_clinica_id is null then raise exception 'clinica-lumiere no existe'; end if;

  -- Limpiar previo en orden inverso de dependencias
  delete from public.protocolos              where paciente_id = v_user_id;
  delete from public.analisis_dermoscopicos  where paciente_id = v_user_id;
  delete from public.sesiones                where paciente_id = v_user_id;
  delete from public.citas                   where paciente_id = v_user_id;
  delete from public.pacientes               where id          = v_user_id;
  delete from public.usuarios                where id          = v_user_id;
  delete from auth.identities                where user_id     = v_user_id;
  delete from auth.users                     where id          = v_user_id;

  -- 1. auth.users — usuario con password hasheado
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    'paciente@lumiere.com',
    crypt('demo1234', gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('nombre', 'Sofía Restrepo'),
    now(), now(), '', '', '', ''
  );

  -- 2. auth.identities (necesario para login email/password)
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'paciente@lumiere.com', 'email_verified', true),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  -- 3. usuarios (rol=paciente — dispara trigger sync_user_app_metadata)
  insert into public.usuarios (id, clinica_id, nombre, rol, activo)
  values (v_user_id, v_clinica_id, 'Sofía Restrepo', 'paciente', true);

  -- 4. pacientes
  insert into public.pacientes (
    id, clinica_id, nombre, apellido, email, telefono,
    fecha_nacimiento, tipo_piel, alergias, medicamentos,
    tratamientos_previos, motivo_consulta,
    rgpd_aceptado, marketing_aceptado, riesgo, total_visitas,
    foto_perfil
  ) values (
    v_user_id, v_clinica_id, 'Sofía', 'Restrepo',
    'paciente@lumiere.com', '+34 666 777 888',
    '1992-08-20', 'Mixta',
    'Ninguna conocida', 'Ninguno',
    array['Ácido hialurónico'],
    'Manchas solares en mejillas y líneas finas en frente. Quiero un programa de prevención y mantenimiento.',
    true, true, 'bajo', 4,
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face'
  );

  -- 5. Cita próxima (mañana 10:00 — para que aparezca en "Mi próxima cita")
  insert into public.citas (
    paciente_id, clinica_id, paciente_nombre, paciente_foto,
    medico_nombre, tratamiento, precio,
    fecha, duracion_minutos, estado, notas_previas
  ) values (
    v_user_id, v_clinica_id, 'Sofía Restrepo',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    'Dra. María García',
    'Mesoterapia facial', 150,
    (current_date + interval '1 day' + interval '10 hours'),
    45, 'confirmada',
    'Sesión 2 de 4. Cóctel vitamínico C + ácido hialurónico zona malar.'
  );

  -- 6. Sesión pasada con fotos antes/después (para "Mi evolución")
  insert into public.sesiones (
    paciente_id, clinica_id,
    tipo_tratamiento, fecha, notas_clinicas,
    fotos_antes, fotos_despues
  ) values (
    v_user_id, v_clinica_id,
    'Mesoterapia facial', current_date - interval '14 days',
    'Primera sesión. Buena tolerancia. Plan: 4 sesiones quincenales.',
    array['https://images.unsplash.com/photo-1604881991720-f91add269bed?w=400&h=400&fit=crop'],
    array['https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop']
  );

  -- 7. Análisis dermoscópico reciente (moderado, ya compartido con su médico)
  insert into public.analisis_dermoscopicos (
    paciente_id, clinica_id, fecha,
    criterios, puntuacion_total, nivel_riesgo,
    imagen_url, compartido_medico
  ) values (
    v_user_id, v_clinica_id, current_date - interval '7 days',
    jsonb_build_object(
      'asimetria',          true,
      'borde_irregular',    false,
      'color_heterogeneo',  true,
      'diametro_mayor_6mm', false,
      'red_pigmentaria',    true,
      'puntos_globulos',    false,
      'velo_azul_blanco',   false
    ),
    3, 'moderado',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop',
    true
  );

  -- 8. Protocolo activo con pasos y 2 productos cosmecéuticos
  insert into public.protocolos (
    id, paciente_id, clinica_id,
    nombre, descripcion, pasos, productos, activo, fecha_inicio
  ) values (
    v_proto_id, v_user_id, v_clinica_id,
    'Rutina antimanchas',
    'Tratamiento integral para reducir manchas solares y prevenir su aparición.',
    jsonb_build_array(
      jsonb_build_object('id','p1','texto','Limpiador suave de mañana y noche',                 'completado', true,  'frecuencia','2x al día'),
      jsonb_build_object('id','p2','texto','Vitamina C 15% por la mañana',                      'completado', true,  'frecuencia','Cada mañana'),
      jsonb_build_object('id','p3','texto','Retinol 0.3% por la noche (lun, mié, vie)',         'completado', false, 'frecuencia','3x semana'),
      jsonb_build_object('id','p4','texto','Protector solar SPF 50+ — reaplicar cada 2h',        'completado', false, 'frecuencia','Cada mañana')
    ),
    jsonb_build_array(
      jsonb_build_object(
        'marca',       'SkinCeuticals',
        'nombre',      'C E Ferulic',
        'descripcion', 'Sérum antioxidante con vitamina C 15%, vitamina E y ácido ferúlico',
        'foto_url',    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop',
        'motivo',      'Combate las manchas existentes y previene nuevas'
      ),
      jsonb_build_object(
        'marca',       'ZO Skin Health',
        'nombre',      'Retinol Skin Brightener 0.5%',
        'descripcion', 'Tratamiento aclarante con retinol estabilizado para hiperpigmentación',
        'foto_url',    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop',
        'motivo',      'Acelera la renovación celular y unifica el tono'
      )
    ),
    true,
    current_date - interval '21 days'
  );
end $$;
