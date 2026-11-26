begin;

alter table public.pulse_videos add column view_count bigint not null default 0
  check (view_count >= 0);

create table public.pulse_video_plays (
  playback_id uuid primary key,
  video_id uuid not null references public.pulse_videos on delete cascade
);
create index pulse_video_plays_video_id on public.pulse_video_plays(video_id);
alter table public.pulse_video_plays enable row level security;
revoke all on public.pulse_video_plays from public, anon, authenticated;

create function public.pulse_record_video_view(target_video uuid, playback uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
  total bigint;
begin
  select creator_id, view_count into owner_id, total
    from public.pulse_videos where id = target_video for update;
  if not found or owner_id = auth.uid() then return total; end if;

  insert into public.pulse_video_plays(playback_id, video_id) values (playback, target_video)
    on conflict (playback_id) do nothing;
  if found then
    update public.pulse_videos set view_count = view_count + 1
      where id = target_video returning view_count into total;
  end if;
  return total;
end $$;

revoke all on function public.pulse_record_video_view(uuid, uuid) from public;
grant execute on function public.pulse_record_video_view(uuid, uuid) to anon, authenticated;
commit;
