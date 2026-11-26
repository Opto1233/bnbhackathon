begin;

alter table public.pulse_creators add column avatar_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pulse-avatars', 'pulse-avatars', true, 262144, array['image/jpeg']);

create policy "Creators read their own avatar metadata" on storage.objects
for select to authenticated using (
  bucket_id = 'pulse-avatars' and name = auth.uid()::text || '/avatar.jpg'
);
create policy "Creators upload their own avatar" on storage.objects
for insert to authenticated with check (
  bucket_id = 'pulse-avatars' and name = auth.uid()::text || '/avatar.jpg'
  and exists (select 1 from public.pulse_creators where id = auth.uid())
);
create policy "Creators replace their own avatar" on storage.objects
for update to authenticated using (
  bucket_id = 'pulse-avatars' and name = auth.uid()::text || '/avatar.jpg'
) with check (
  bucket_id = 'pulse-avatars' and name = auth.uid()::text || '/avatar.jpg'
);

create function public.pulse_set_profile_photo() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  updated_at timestamptz;
begin
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'pulse-avatars' and name = owner_id::text || '/avatar.jpg'
  ) then raise exception 'Profile photo missing'; end if;

  update public.pulse_creators set avatar_updated_at = clock_timestamp()
    where id = owner_id returning avatar_updated_at into updated_at;
  if not found then raise exception 'Create your channel first'; end if;
  return updated_at;
end $$;

revoke all on function public.pulse_set_profile_photo() from public, anon;
grant execute on function public.pulse_set_profile_photo() to authenticated;
commit;
