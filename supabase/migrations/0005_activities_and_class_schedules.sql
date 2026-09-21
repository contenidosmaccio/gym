-- Actividades (Crossfit, Funcional, etc.) y horarios de clase semanales.
-- Público de lectura (info institucional visible sin login), escritura
-- solo admin del mismo gimnasio.

create table activities (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  name text not null,
  color text not null default '#888888',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index activities_gym_id_idx on activities (gym_id);

create table class_schedules (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  activity_id uuid not null references activities (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  professor_id uuid references profiles (id) on delete set null,
  room text,
  capacity integer,
  created_at timestamptz not null default now(),
  constraint class_schedules_time_check check (end_time > start_time)
);

comment on column class_schedules.day_of_week is '0 = domingo ... 6 = sábado (igual que JS Date#getDay).';

create index class_schedules_gym_id_idx on class_schedules (gym_id);
create index class_schedules_day_idx on class_schedules (gym_id, day_of_week);

alter table activities enable row level security;

create policy "activities_public_read" on activities
  for select using (true);

create policy "activities_admin_insert" on activities
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "activities_admin_update" on activities
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "activities_admin_delete" on activities
  for delete using (gym_id = public.current_gym_id() and public.current_role() = 'admin');

alter table class_schedules enable row level security;

create policy "class_schedules_public_read" on class_schedules
  for select using (true);

create policy "class_schedules_admin_insert" on class_schedules
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "class_schedules_admin_update" on class_schedules
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "class_schedules_admin_delete" on class_schedules
  for delete using (gym_id = public.current_gym_id() and public.current_role() = 'admin');
