-- 99 socios de prueba (sumados al socio.demo existente = 100), con la
-- misma clave de prueba, activos y con número de socio asignado.

with names as (
  select
    array['Juan','Maria','Carlos','Ana','Luis','Laura','Diego','Sofia','Martin','Valentina',
          'Pablo','Camila','Javier','Lucia','Fernando','Julieta','Gabriel','Micaela','Rodrigo','Agustina',
          'Sebastian','Florencia','Nicolas','Victoria','Matias','Carolina','Tomas','Belen','Federico','Paula',
          'Ignacio','Daniela','Franco','Romina','Emiliano','Antonella','Ezequiel','Milagros','Ramiro','Josefina'
    ]::text[] as first_names,
    array['Gonzalez','Rodriguez','Fernandez','Lopez','Martinez','Garcia','Perez','Sanchez','Romero','Sosa',
          'Torres','Alvarez','Ruiz','Ramirez','Flores','Acosta','Benitez','Medina','Herrera','Aguirre',
          'Molina','Suarez','Ortiz','Silva','Castro','Rojas','Nunez','Gimenez','Ibanez','Cabrera'
    ]::text[] as last_names
),
gym as (select id from gyms where slug = 'forge')
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'socio' || lpad(i::text, 3, '0') || '@forgefitness.test',
  crypt('prueba.123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object(
    'gym_id', gym.id,
    'first_name', names.first_names[1 + (i % array_length(names.first_names, 1))],
    'last_name', names.last_names[1 + ((i * 7) % array_length(names.last_names, 1))]
  ),
  now(), now(), '', '', '', '', '', '', '', ''
from generate_series(1, 99) as i, names, gym;

with ranked as (
  select id, row_number() over (order by created_at) as rn
  from profiles
  where email like 'socio0%@forgefitness.test'
)
update profiles p
set status = 'active', member_number = (2001 + ranked.rn)::text
from ranked
where p.id = ranked.id;
