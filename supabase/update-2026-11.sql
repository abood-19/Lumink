-- LUMINK update (Nov 2026). Safe to run more than once.
-- 1) Pro / Pro Gold: unlimited AI generations (with a daily fair-use cap so one account can't drain the budget).
-- 2) Refunds can only be issued by the server (users could previously call refund_tokens themselves).

alter table public.profiles add column if not exists gen_day date not null default current_date;
alter table public.profiles add column if not exists gen_count integer not null default 0;

-- Daily fair-use cap for paid plans. Change the numbers here if you need to.
create or replace function public.daily_cap(p public.plan_id) returns integer
language sql immutable as $$
  select case p when 'pro' then 150 when 'gold' then 400 else 0 end;
$$;

-- Spend for one generation.
--   admin / lifetime → free, unlimited
--   pro / gold       → unlimited (no tokens), counted against the daily fair-use cap
--   free             → tokens (monthly allowance)
-- Returns remaining tokens, or -1 for unlimited plans.
create or replace function public.spend_tokens(amount integer) returns integer
language plpgsql security definer set search_path = public as $$
declare p public.profiles; remaining integer;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p is null then raise exception 'no profile'; end if;
  if p.lifetime or p.role = 'admin' then return -1; end if;
  if p.plan in ('pro', 'gold') then
    if p.gen_day <> current_date then
      update public.profiles set gen_day = current_date, gen_count = 1 where id = p.id;
      return -1;
    end if;
    if p.gen_count >= public.daily_cap(p.plan) then raise exception 'daily cap'; end if;
    update public.profiles set gen_count = gen_count + 1 where id = p.id;
    return -1;
  end if;
  if p.tokens_reset_at < now() - interval '1 month' then
    p.tokens := public.plan_tokens(p.plan);
    update public.profiles set tokens = p.tokens, tokens_reset_at = now() where id = p.id;
  end if;
  if p.tokens < amount then raise exception 'not enough tokens'; end if;
  update public.profiles set tokens = tokens - amount where id = p.id returning tokens into remaining;
  return remaining;
end;
$$;

-- Server-only refund after a failed generation.
drop function if exists public.refund_tokens(integer);
create or replace function public.refund_tokens_for(uid uuid, amount integer) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = uid for update;
  if p is null or p.lifetime or p.role = 'admin' then return; end if;
  if p.plan in ('pro', 'gold') then
    update public.profiles set gen_count = greatest(0, gen_count - 1) where id = uid;
  else
    update public.profiles set tokens = tokens + least(amount, 10) where id = uid;
  end if;
end;
$$;
revoke all on function public.refund_tokens_for(uuid, integer) from public, anon, authenticated;
grant execute on function public.refund_tokens_for(uuid, integer) to service_role;
