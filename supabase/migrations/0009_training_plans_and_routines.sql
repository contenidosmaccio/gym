-- Planes de entrenamiento, rutinas, ejercicios de rutina, e historial de
-- entrenamientos ejecutados. Aislado por gym_id + RLS.

create table training_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  professor_id uuid references profiles (id) on delete set null,
  name text not null,
  start_date date,
  end_date date,
  frequency smallint,
  created_at timestamptz not null default now()
);

create index training_plans_gym_id_idx on training_plans (gym_id);
create index training_plans_member_id_idx on training_plans (member_id);

create table routines (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  plan_id uuid not null references training_plans (id) on delete cascade,
  name text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index routines_plan_id_idx on routines (plan_id);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  routine_id uuid not null references routines (id) on delete cascade,
  exercise_id uuid not null references exercises (id) on delete cascade,
  sort_order smallint not null default 0,
  series smallint,
  reps smallint,
  weight_suggested numeric,
  time_seconds integer,
  distance numeric,
  rest_seconds integer,
  notes text
);

create index routine_exercises_routine_id_idx on routine_exercises (routine_id);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  routine_id uuid references routines (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_minutes integer
);

create index workout_logs_gym_id_idx on workout_logs (gym_id);
create index workout_logs_member_id_idx on workout_logs (member_id);

create table workout_log_exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms (id) on delete cascade,
  workout_log_id uuid not null references workout_logs (id) on delete cascade,
  routine_exercise_id uuid not null references routine_exercises (id) on delete cascade,
  sets_completed smallint,
  weight_used numeric,
  reps_actual smallint,
  notes text
);

create index workout_log_exercises_workout_log_id_idx on workout_log_exercises (workout_log_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table training_plans enable row level security;

create policy "training_plans_select" on training_plans
  for select using (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  );

create policy "training_plans_staff_write" on training_plans
  for insert with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "training_plans_staff_update" on training_plans
  for update using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'))
  with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "training_plans_staff_delete" on training_plans
  for delete using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

alter table routines enable row level security;

create policy "routines_select" on routines
  for select using (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from training_plans tp where tp.id = routines.plan_id and tp.member_id = auth.uid())
    )
  );

create policy "routines_staff_write" on routines
  for insert with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "routines_staff_update" on routines
  for update using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'))
  with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "routines_staff_delete" on routines
  for delete using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

alter table routine_exercises enable row level security;

create policy "routine_exercises_select" on routine_exercises
  for select using (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (
        select 1 from routines r
        join training_plans tp on tp.id = r.plan_id
        where r.id = routine_exercises.routine_id and tp.member_id = auth.uid()
      )
    )
  );

create policy "routine_exercises_staff_write" on routine_exercises
  for insert with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "routine_exercises_staff_update" on routine_exercises
  for update using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'))
  with check (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

create policy "routine_exercises_staff_delete" on routine_exercises
  for delete using (gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe'));

alter table workout_logs enable row level security;

create policy "workout_logs_select" on workout_logs
  for select using (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  );

create policy "workout_logs_insert" on workout_logs
  for insert with check (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  );

create policy "workout_logs_update" on workout_logs
  for update using (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  )
  with check (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  );

create policy "workout_logs_delete" on workout_logs
  for delete using (
    gym_id = public.current_gym_id()
    and (public.current_role() in ('admin', 'profe') or member_id = auth.uid())
  );

alter table workout_log_exercises enable row level security;

create policy "workout_log_exercises_select" on workout_log_exercises
  for select using (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from workout_logs wl where wl.id = workout_log_exercises.workout_log_id and wl.member_id = auth.uid())
    )
  );

create policy "workout_log_exercises_write" on workout_log_exercises
  for insert with check (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from workout_logs wl where wl.id = workout_log_exercises.workout_log_id and wl.member_id = auth.uid())
    )
  );

create policy "workout_log_exercises_update" on workout_log_exercises
  for update using (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from workout_logs wl where wl.id = workout_log_exercises.workout_log_id and wl.member_id = auth.uid())
    )
  )
  with check (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from workout_logs wl where wl.id = workout_log_exercises.workout_log_id and wl.member_id = auth.uid())
    )
  );

create policy "workout_log_exercises_delete" on workout_log_exercises
  for delete using (
    gym_id = public.current_gym_id()
    and (
      public.current_role() in ('admin', 'profe')
      or exists (select 1 from workout_logs wl where wl.id = workout_log_exercises.workout_log_id and wl.member_id = auth.uid())
    )
  );
