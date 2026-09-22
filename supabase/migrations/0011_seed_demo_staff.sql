-- 3 profes más (sumados a profe.demo = 4) y 1 admin más (sumado a
-- contenidosmaccio@gmail.com = 2). Misma clave de prueba, activos.

with gym as (select id from gyms where slug = 'forge')
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  p.email, crypt('prueba.123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('gym_id', gym.id, 'first_name', p.first_name, 'last_name', p.last_name),
  now(), now(), '', '', '', '', '', '', '', ''
from gym, (values
  ('profe002@forgefitness.test', 'Ana', 'Colombo'),
  ('profe003@forgefitness.test', 'Diego', 'Sosa'),
  ('profe004@forgefitness.test', 'Laura', 'Fernandez'),
  ('admin002@forgefitness.test', 'Roberto', 'Iglesias')
) as p(email, first_name, last_name);

update profiles set status = 'active', role = 'profe'
where email in ('profe002@forgefitness.test', 'profe003@forgefitness.test', 'profe004@forgefitness.test');

update profiles set status = 'active', role = 'admin'
where email = 'admin002@forgefitness.test';
