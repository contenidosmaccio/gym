-- Bucket público para branding de cada gimnasio (logos, favicons, portadas).
-- Convención de carpetas: gym-assets/<gym_id>/archivo.ext — así las
-- políticas pueden restringir la escritura al admin de ese gimnasio.

insert into storage.buckets (id, name, public)
values ('gym-assets', 'gym-assets', true)
on conflict (id) do nothing;

create policy "gym_assets_public_read" on storage.objects
  for select using (bucket_id = 'gym-assets');

create policy "gym_assets_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
    and public.current_role() = 'admin'
  );

create policy "gym_assets_admin_update" on storage.objects
  for update using (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
    and public.current_role() = 'admin'
  );

create policy "gym_assets_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
    and public.current_role() = 'admin'
  );
