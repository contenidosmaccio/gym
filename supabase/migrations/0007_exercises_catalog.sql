-- Catálogo de ejercicios por gimnasio. Lectura pública (lo usan profes y
-- socios desde rutinas más adelante), escritura solo admin.

create table exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  name text not null,
  muscle_group text,
  description text,
  image_url text,
  video_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index exercises_gym_id_idx on exercises (gym_id);
create index exercises_muscle_group_idx on exercises (gym_id, muscle_group);

alter table exercises enable row level security;

create policy "exercises_public_read" on exercises
  for select using (true);

create policy "exercises_admin_insert" on exercises
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "exercises_admin_update" on exercises
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "exercises_admin_delete" on exercises
  for delete using (gym_id = public.current_gym_id() and public.current_role() = 'admin');
