begin;

create table public.pulse_moments (
  id uuid primary key,
  actor uuid not null default auth.uid() references auth.users on delete cascade,
  clip text not null check (length(clip) between 1 and 64),
  name text not null check (length(trim(name)) between 1 and 60),
  description text not null check (length(trim(description)) between 1 and 220),
  frame_time numeric not null check (frame_time between 0 and 86400),
  frame text not null check (length(frame) <= 400000 and frame ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$'),
  created_at timestamptz not null default now()
);
create table public.pulse_comments (
  id uuid primary key, actor uuid not null default auth.uid() references auth.users on delete cascade,
  clip text not null check (length(clip) between 1 and 64),
  body text not null check (length(trim(body)) between 1 and 400),
  reply text check (length(reply)<=64), created_at timestamptz not null default now()
);
create table public.pulse_reactions (
  id uuid primary key default gen_random_uuid(), actor uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('follow','like')),
  target text not null check (length(target) between 1 and 64),
  unique(actor,kind,target)
);
create table public.pulse_messages (
  id uuid primary key, actor uuid not null default auth.uid() references public.pulse_creators on delete cascade,
  recipient uuid not null references public.pulse_creators on delete cascade check (recipient<>actor),
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index pulse_messages_incoming on public.pulse_messages(recipient,created_at);
create index pulse_messages_outgoing on public.pulse_messages(actor,created_at);
create table public.pulse_reports (
  id uuid primary key default gen_random_uuid(), actor uuid not null default auth.uid() references auth.users on delete cascade,
  clip text not null check (length(clip) between 1 and 64),
  reason text not null check(reason in ('Spam','Harassment','Other')),
  created_at timestamptz not null default now(), unique(actor,clip)
);

do $$
declare t text;
begin
  foreach t in array array['pulse_moments','pulse_comments','pulse_reactions','pulse_messages','pulse_reports'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select,insert on public.%I to authenticated',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (actor = (select auth.uid()))',t);
  end loop;
  foreach t in array array['pulse_moments','pulse_comments','pulse_reactions'] loop
    execute format('grant select on public.%I to anon',t);
    execute format('create policy public_read on public.%I for select using (true)',t);
  end loop;
end $$;
create policy participants_read on public.pulse_messages for select to authenticated
  using (actor=(select auth.uid()) or recipient=(select auth.uid()));
grant select on public.pulse_reports to service_role;
create policy reporter_read on public.pulse_reports for select to authenticated using (actor=(select auth.uid()));
grant delete on public.pulse_reactions to authenticated;
create policy own_remove on public.pulse_reactions for delete to authenticated using (actor=(select auth.uid()));
alter table public.pulse_videos add column captions text check (length(captions)<=65536 and captions like 'WEBVTT%');
create function public.pulse_publish_captioned_video(video_id uuid, video_title text, subtitles text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.pulse_publish_video(video_id,video_title);
  update public.pulse_videos set captions=subtitles where id=video_id and creator_id=auth.uid();
end $$;
revoke all on function public.pulse_publish_captioned_video(uuid,text,text) from public,anon;
grant execute on function public.pulse_publish_captioned_video(uuid,text,text) to authenticated;
commit;
