-- Actividades y horario semanal de ejemplo para Forge Fitness Club,
-- basado en la grilla de referencia de la especificación.

with forge as (select id from gyms where slug = 'forge')
insert into activities (gym_id, name, color)
select forge.id, a.name, a.color
from forge, (values
  ('Crossfit', '#ff6a00'),
  ('Funcional', '#3b82f6'),
  ('Zumba', '#8b5cf6'),
  ('Boxeo', '#ef4444'),
  ('GAP', '#22c55e'),
  ('Open Box', '#9ca3af')
) as a(name, color);

-- day_of_week: 0 domingo, 1 lunes, 2 martes, 3 miércoles, 4 jueves, 5 viernes, 6 sábado
with forge as (select id as gym_id from gyms where slug = 'forge'),
act as (select id, name from activities where gym_id = (select gym_id from forge)),
days as (select unnest(array[1,2,3,4,5]) as day_of_week),
rows as (
  -- Crossfit 06:00 y 07:00, todos los días de semana
  select a.id as activity_id, d.day_of_week, '06:00'::time as start_time, '07:00'::time as end_time
  from act a, days d where a.name = 'Crossfit'
  union all
  select a.id, d.day_of_week, '07:00', '08:00'
  from act a, days d where a.name = 'Crossfit'
  union all
  -- Funcional 08:00, todos los días
  select a.id, d.day_of_week, '08:00', '09:00'
  from act a, days d where a.name = 'Funcional'
  union all
  -- Open Box 09:00-16:00, todos los días
  select a.id, d.day_of_week, '09:00', '16:00'
  from act a, days d where a.name = 'Open Box'
  union all
  -- 17:00: GAP lun/mié/vie, Open Box mar/jue
  select a.id, d.day_of_week, '17:00', '18:00'
  from act a, (select unnest(array[1,3,5]) as day_of_week) d where a.name = 'GAP'
  union all
  select a.id, d.day_of_week, '17:00', '18:00'
  from act a, (select unnest(array[2,4]) as day_of_week) d where a.name = 'Open Box'
  union all
  -- 18:00: Zumba lun/mié/vie, Funcional mar/jue
  select a.id, d.day_of_week, '18:00', '19:00'
  from act a, (select unnest(array[1,3,5]) as day_of_week) d where a.name = 'Zumba'
  union all
  select a.id, d.day_of_week, '18:00', '19:00'
  from act a, (select unnest(array[2,4]) as day_of_week) d where a.name = 'Funcional'
  union all
  -- Crossfit 19:00 y 20:00, todos los días
  select a.id, d.day_of_week, '19:00', '20:00'
  from act a, days d where a.name = 'Crossfit'
  union all
  select a.id, d.day_of_week, '20:00', '21:00'
  from act a, days d where a.name = 'Crossfit'
  union all
  -- Boxeo 21:00, mar/jue
  select a.id, d.day_of_week, '21:00', '22:00'
  from act a, (select unnest(array[2,4]) as day_of_week) d where a.name = 'Boxeo'
)
insert into class_schedules (gym_id, activity_id, day_of_week, start_time, end_time, room, capacity)
select (select gym_id from forge), activity_id, day_of_week, start_time, end_time, 'Principal', 20
from rows;
