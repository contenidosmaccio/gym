-- Planes comerciales (2x semana, 3x semana, pase libre, etc.) y la cuota
-- vigente de cada socio (qué plan tiene, cuándo pagó, cuándo vence).

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  name text not null,
  price numeric,
  sessions_per_week smallint, -- null = pase libre / ilimitado
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index membership_plans_gym_id_idx on membership_plans (gym_id);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  membership_plan_id uuid references membership_plans (id) on delete set null,
  start_date date,
  paid_at date,
  expires_at date,
  created_at timestamptz not null default now()
);

create index memberships_gym_id_idx on memberships (gym_id);
create index memberships_member_id_idx on memberships (member_id);

alter table membership_plans enable row level security;

create policy "membership_plans_public_read" on membership_plans
  for select using (true);

create policy "membership_plans_admin_insert" on membership_plans
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "membership_plans_admin_update" on membership_plans
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "membership_plans_admin_delete" on membership_plans
  for delete using (gym_id = public.current_gym_id() and public.current_role() = 'admin');

alter table memberships enable row level security;

create policy "memberships_select" on memberships
  for select using (
    gym_id = public.current_gym_id()
    and (public.current_role() = 'admin' or member_id = auth.uid())
  );

create policy "memberships_admin_insert" on memberships
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "memberships_admin_update" on memberships
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "memberships_admin_delete" on memberships
  for delete using (gym_id = public.current_gym_id() and public.current_role() = 'admin');
