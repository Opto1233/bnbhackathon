begin;
create table public.pulse_creators (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 48),
  wallet text not null unique check (wallet ~ '^0x[0-9a-f]{40}$'),
  ticker text unique check (ticker ~ '^[A-Z]{2,8}$' and ticker not in ('NEON','WAVE','BEAT','PASTA'))
);
create table public.pulse_videos (
  id uuid primary key,
  creator_id uuid not null references public.pulse_creators on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 90),
  created_at timestamptz not null default now()
);
alter table public.pulse_creators enable row level security;
alter table public.pulse_videos enable row level security;
revoke all on public.pulse_creators, public.pulse_videos from public, anon, authenticated;
grant select on public.pulse_creators, public.pulse_videos to anon, authenticated;
create policy "Public profiles" on public.pulse_creators for select using (true);
create policy "Published videos" on public.pulse_videos for select using (true);

-- Bind creator identity to the wallet address verified by Supabase Auth.
create function public.pulse_create_channel(display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare verified_wallet text;
begin
  select lower(identity_data->>'address') into strict verified_wallet
    from auth.identities where user_id = auth.uid() and provider = 'web3'
    and identity_data->>'chain' = 'ethereum';
  insert into public.pulse_creators(id,name,wallet) values (auth.uid(),trim(display_name),verified_wallet)
    on conflict (id) do nothing;
end $$;

create function public.pulse_claim_ticker(symbol text) returns void
language plpgsql security definer set search_path = '' as $$
declare wanted text := upper(trim(symbol));
begin
  if wanted is null then raise exception 'Enter a ticker'; end if;
  update public.pulse_creators set ticker = wanted
    where id = auth.uid() and (ticker is null or ticker = wanted);
  if not found then raise exception 'Create your channel first or use its existing ticker'; end if;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('pulse-videos','pulse-videos',true,52428800,array['video/mp4','video/webm','video/quicktime']);
create policy "Creators upload their own videos" on storage.objects for insert to authenticated
with check (bucket_id = 'pulse-videos' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.pulse_creators where id = auth.uid()));

-- Only publish files already stored under this creator's identity.
create function public.pulse_publish_video(video_id uuid, video_title text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from storage.objects where bucket_id = 'pulse-videos'
    and name = auth.uid()::text || '/' || video_id::text) then raise exception 'Video file missing'; end if;
  insert into public.pulse_videos(id, creator_id, title) values(video_id,auth.uid(),trim(video_title))
    on conflict (id) do nothing;
  if not exists (select 1 from public.pulse_videos where id = video_id and creator_id = auth.uid())
    then raise exception 'Video ID already in use'; end if;
end $$;
revoke all on function public.pulse_create_channel(text),public.pulse_claim_ticker(text),public.pulse_publish_video(uuid,text) from public, anon;
grant execute on function public.pulse_create_channel(text),public.pulse_claim_ticker(text),public.pulse_publish_video(uuid,text) to authenticated;
commit;
