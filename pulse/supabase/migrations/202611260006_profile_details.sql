begin;

alter table public.pulse_creators
  add column bio text not null default '',
  add column social_links jsonb not null default '{}'::jsonb,
  add constraint pulse_creator_bio_length check (char_length(bio) <= 240),
  add constraint pulse_creator_social_links_object check (jsonb_typeof(social_links) = 'object');

create function public.pulse_set_profile_details(profile_owner uuid, profile_bio text, profile_links jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  platform text;
  link jsonb;
  domains text;
begin
  if owner_id is null or owner_id is distinct from profile_owner then
    raise exception 'Sign in to edit this profile.';
  end if;
  if profile_bio is null or char_length(profile_bio) > 240 then
    raise exception 'Bio must be 240 characters or fewer.';
  end if;
  if jsonb_typeof(profile_links) is distinct from 'object' then
    raise exception 'Social links must be an object.';
  end if;

  for platform, link in select key, value from jsonb_each(profile_links) loop
    domains := case platform
      when 'tiktok' then 'tiktok[.]com'
      when 'instagram' then 'instagram[.]com'
      when 'youtube' then 'youtube[.]com|youtu[.]be'
      when 'x' then 'x[.]com|twitter[.]com'
      when 'twitch' then 'twitch[.]tv'
      when 'facebook' then 'facebook[.]com|fb[.]com'
    end;
    if domains is null or jsonb_typeof(link) <> 'string'
      or char_length(link #>> '{}') > 500
      or (link #>> '{}') !~ ('^https://([a-zA-Z0-9-]+[.])*(' || domains || ')([/#?]|$)') then
      raise exception 'Invalid HTTPS social link for %.', platform;
    end if;
  end loop;

  update public.pulse_creators
  set bio = profile_bio, social_links = profile_links
  where id = owner_id;
  if not found then raise exception 'Create your channel first.'; end if;
end;
$$;

revoke all on function public.pulse_set_profile_details(uuid,text,jsonb) from public, anon;
grant execute on function public.pulse_set_profile_details(uuid,text,jsonb) to authenticated;

commit;
