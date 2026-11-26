create or replace function public.pulse_create_channel(display_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  verified_wallet text;
begin
  select lower(split_part(i.provider_id, ':', 3)) into strict verified_wallet
  from auth.identities as i
  where i.user_id = auth.uid()
    and i.provider = 'web3'
    and i.provider_id ~ '^web3:ethereum:0x[0-9a-fA-F]{40}$';

  insert into public.pulse_creators (id, name, wallet)
  values (auth.uid(), trim(display_name), verified_wallet)
  on conflict (id) do nothing;
exception
  when no_data_found then
    raise exception 'Sign in with your Ethereum-compatible wallet before creating a channel.';
end;
$$;
