-- LUMINK database schema for Supabase (PostgreSQL).
-- Run this once in Supabase → SQL Editor → New query → Run.

-- ───────────────────────── Profiles, plans, tokens ─────────────────────────
create type public.user_role as enum ('admin', 'artist', 'member');
create type public.plan_id as enum ('free', 'pro', 'gold');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  username text unique check (username ~ '^[a-z0-9._]{3,30}$'),
  city text,
  phone text,
  role public.user_role not null default 'artist',
  plan public.plan_id not null default 'free',
  lifetime boolean not null default false,       -- Leo: free forever, unlimited
  tokens integer not null default 50 check (tokens >= 0),
  tokens_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin reads all" on public.profiles for select using (public.is_admin());
-- Users may change only their name, username, city and phone; plan, role, tokens are changed by the server.
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);
revoke update on public.profiles from authenticated;
grant update (display_name, username, city, phone) on public.profiles to authenticated;



-- New user → profile with the Free plan (50 tokens).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, new.phone, ''), '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Monthly allowance per plan.
create or replace function public.plan_tokens(p public.plan_id) returns integer
language sql immutable as $$
  select case p when 'free' then 50 when 'pro' then 600 when 'gold' then 2000 end;
$$;

-- Spend tokens for one generation. Refills the monthly allowance first if a month has passed.
-- Admins and lifetime members are never charged.
create or replace function public.spend_tokens(amount integer) returns integer
language plpgsql security definer set search_path = public as $$
declare p public.profiles; remaining integer;
begin
  select * into p from public.profiles where id = auth.uid() for update;
  if p is null then raise exception 'no profile'; end if;
  if p.lifetime or p.role = 'admin' then return p.tokens; end if;
  if p.tokens_reset_at < now() - interval '1 month' then
    p.tokens := public.plan_tokens(p.plan);
    update public.profiles set tokens = p.tokens, tokens_reset_at = now() where id = p.id;
  end if;
  if p.tokens < amount then raise exception 'not enough tokens'; end if;
  update public.profiles set tokens = tokens - amount where id = p.id returning tokens into remaining;
  return remaining;
end;
$$;

create or replace function public.refund_tokens(amount integer) returns void
language sql security definer set search_path = public as $$
  update public.profiles set tokens = tokens + least(amount, 10)
  where id = auth.uid() and not lifetime and role <> 'admin';
$$;

-- ───────────────────────── Private studio records ─────────────────────────
-- Only the owner can see or change these rows. Not even admins can read them.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null,
  phone text default '',
  notes text default '',
  sessions jsonb not null default '[]',
  photos jsonb not null default '[]',
  consent_signature text,
  publish_ok boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "clients: owner only" on public.clients for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null,
  category text not null default 'other',
  qty integer not null default 0,
  min_qty integer not null default 0,
  expiry date,
  created_at timestamptz not null default now()
);
alter table public.inventory_items enable row level security;
create policy "inventory: owner only" on public.inventory_items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ───────────────────────── Community ─────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  author_name text default '',
  image_url text not null,
  image_path text not null,
  caption text default '',
  style text default '',
  city text default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts: anyone reads visible" on public.posts for select using (not hidden or author_id = auth.uid() or public.is_admin());
create policy "posts: author creates" on public.posts for insert with check (author_id = auth.uid());
-- Authors delete their own posts; the owner (admin) can delete or hide anything.
create policy "posts: author or admin deletes" on public.posts for delete using (author_id = auth.uid() or public.is_admin());
create policy "posts: admin hides" on public.posts for update using (public.is_admin());

-- Anyone signed in can report; only admins read reports.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  reason text default '',
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
alter table public.reports enable row level security;
create policy "reports: create own" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports: admin reads" on public.reports for select using (public.is_admin());
create policy "reports: admin deletes" on public.reports for delete using (public.is_admin());

-- Contact form: anyone may write, only admins read.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact: anyone writes" on public.contact_messages for insert with check (true);
create policy "contact: admin reads" on public.contact_messages for select using (public.is_admin());

-- ───────────────────────── Storage ─────────────────────────
-- Public bucket for community posts; each user writes only inside their own folder.
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict do nothing;
create policy "posts bucket: own folder upload" on storage.objects for insert
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "posts bucket: own or admin delete" on storage.objects for delete
  using (bucket_id = 'posts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ───────────────────────── After your first sign-in ─────────────────────────
-- Make yourself the owner (admin), and give Leo his free lifetime access:
--   update public.profiles set role = 'admin', lifetime = true
--     where id = (select id from auth.users where email = 'YOUR_EMAIL');
--   update public.profiles set plan = 'gold', lifetime = true
--     where id = (select id from auth.users where email = 'LEO_EMAIL');


-- ───────────────────────── Subscriptions & paid features ─────────────────────────
-- Written only by the payment webhook (service role). Users can read their own rows.
create table if not exists public.subscriptions (
  provider_id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  provider text not null default 'lemonsqueezy',
  variant_id text,
  plan public.plan_id not null default 'free',
  status text not null,
  renews_at timestamptz,
  ends_at timestamptz,
  portal_url text,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions: read own" on public.subscriptions for select using (user_id = auth.uid());

-- Pro / Pro Gold / lifetime / admin. Used by the policies below so paid tools are enforced in the database too.
create or replace function public.has_paid_plan() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (plan in ('pro', 'gold') or lifetime or role = 'admin'));
$$;

drop policy if exists "clients: owner only" on public.clients;
create policy "clients: owner reads" on public.clients for select using (owner_id = auth.uid());
create policy "clients: paid owner writes" on public.clients for insert with check (owner_id = auth.uid() and public.has_paid_plan());
create policy "clients: paid owner updates" on public.clients for update using (owner_id = auth.uid() and public.has_paid_plan());
create policy "clients: owner deletes" on public.clients for delete using (owner_id = auth.uid());

drop policy if exists "inventory: owner only" on public.inventory_items;
create policy "inventory: owner reads" on public.inventory_items for select using (owner_id = auth.uid());
create policy "inventory: paid owner writes" on public.inventory_items for insert with check (owner_id = auth.uid() and public.has_paid_plan());
create policy "inventory: paid owner updates" on public.inventory_items for update using (owner_id = auth.uid() and public.has_paid_plan());
create policy "inventory: owner deletes" on public.inventory_items for delete using (owner_id = auth.uid());

drop policy if exists "posts: author creates" on public.posts;
create policy "posts: paid author creates" on public.posts for insert with check (author_id = auth.uid() and public.has_paid_plan());
