-- Esquema base multi-tenant: gimnasios, perfiles con rol, y aislamiento
-- por gym_id vía RLS. Pensado para crecer con más tablas (ejercicios,
-- horarios, planes, etc.) en migraciones siguientes, todas con gym_id.

create extension if not exists "pgcrypto";

create type gym_role as enum ('admin', 'profe', 'socio');
create type member_status as enum ('pending', 'active', 'inactive');

-- ── Gimnasios ────────────────────────────────────────────────────────────

create table gyms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  domain text unique,
  name text not null,
  logo_url text,
  logo_small_url text,
  favicon_url text,
  primary_color text not null default '#ff6a00',
  secondary_color text not null default '#e53935',
  background_color text not null default '#0a0a0a',
  contrast_color text not null default '#ffffff',
  cover_image_url text,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  facebook text,
  website text,
  email text,
  google_maps_url text,
  description text,
  general_hours text,
  created_at timestamptz not null default now()
);

comment on table gyms is 'Un registro por gimnasio (tenant). Branding e info institucional.';
comment on column gyms.domain is 'Dominio propio del gimnasio, ej. forgefitness.com.ar (nullable).';

-- ── Perfiles (extienden auth.users) ─────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  gym_id uuid not null references gyms (id) on delete cascade,
  role gym_role not null default 'socio',
  status member_status not null default 'pending',
  first_name text,
  last_name text,
  email text not null,
  member_number text,
  phone text,
  created_at timestamptz not null default now()
);

create index profiles_gym_id_idx on profiles (gym_id);
create unique index profiles_gym_member_number_idx
  on profiles (gym_id, member_number) where member_number is not null;

comment on table profiles is 'Un registro por usuario autenticado; role + gym_id determinan sus permisos.';
comment on column profiles.status is
  'pending: se autoregistró y falta validación del gimnasio. active: habilitado. inactive: baja.';

-- ── Helpers de RLS (security definer para evitar recursión) ────────────

create function public.current_gym_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gym_id from public.profiles where id = auth.uid()
$$;

create function public.current_role()
returns gym_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── Trigger: crear profile automáticamente al registrarse ──────────────
-- El signup desde el cliente manda gym_id, first_name, last_name en
-- options.data. El profile arranca en status 'pending' (modalidad de
-- "registro libre"); el admin lo pasa a 'active' luego.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, gym_id, role, status, first_name, last_name, email)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'gym_id')::uuid,
    'socio',
    'pending',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS: gyms ────────────────────────────────────────────────────────────
-- Lectura pública (landing institucional sin login); escritura solo el
-- admin de ese mismo gimnasio.

alter table gyms enable row level security;

create policy "gyms_public_read" on gyms
  for select using (true);

create policy "gyms_admin_update" on gyms
  for update using (id = public.current_gym_id() and public.current_role() = 'admin')
  with check (id = public.current_gym_id() and public.current_role() = 'admin');

-- ── RLS: profiles ────────────────────────────────────────────────────────
-- Cada quien ve/edita su propio perfil. Admin y profe ven los perfiles de
-- su mismo gimnasio. Solo admin edita/crea perfiles de terceros (altas de
-- socios/profes por "registro controlado").

alter table profiles enable row level security;

create policy "profiles_self_select" on profiles
  for select using (id = auth.uid());

create policy "profiles_staff_select_same_gym" on profiles
  for select using (
    gym_id = public.current_gym_id() and public.current_role() in ('admin', 'profe')
  );

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and gym_id = public.current_gym_id());

create policy "profiles_admin_update_same_gym" on profiles
  for update using (gym_id = public.current_gym_id() and public.current_role() = 'admin')
  with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');

create policy "profiles_admin_insert_same_gym" on profiles
  for insert with check (gym_id = public.current_gym_id() and public.current_role() = 'admin');
