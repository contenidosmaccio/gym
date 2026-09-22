with forge as (select id as gym_id from gyms where slug = 'forge')
insert into membership_plans (gym_id, name, price, sessions_per_week, description)
select forge.gym_id, p.name, p.price, p.sessions_per_week, p.description
from forge, (values
  ('2 veces por semana', 25000, 2, 'Sala de musculación, 2 días por semana.'),
  ('3 veces por semana', 32000, 3, 'Sala de musculación, 3 días por semana.'),
  ('Pase libre', 42000, null, 'Musculación + todas las clases (Crossfit, Funcional, Zumba, Boxeo, GAP, Open Box).')
) as p(name, price, sessions_per_week, description);
