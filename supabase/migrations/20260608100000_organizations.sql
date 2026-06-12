-- Multi-tenancy foundation: organizations + org_members
-- Stock Future Body org owns seeded workouts; all existing users backfilled to it.

create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  branding jsonb not null default '{}'::jsonb,
  -- branding shape: { logo_url, primary_hsl, accent_hsl, app_name, support_email, ios_bundle_id, android_package }
  plan text not null default 'white_label', -- 'stock' | 'white_label' | 'affiliate_only'
  stripe_subscription_id text,
  stripe_customer_id text,
  is_stock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index organizations_one_stock_org on public.organizations (is_stock) where is_stock = true;

create type public.org_role as enum ('owner', 'staff');

create table public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_idx on public.org_members(user_id);

-- Seed the stock Future Body org with a fixed UUID for stable references.
insert into public.organizations (id, slug, name, plan, is_stock, branding)
values (
  '00000000-0000-0000-0000-00000000f17b'::uuid,
  'future-body',
  'Future Body Fit',
  'stock',
  true,
  jsonb_build_object(
    'app_name', 'Future Body Fit',
    'primary_hsl', '160 100% 50%',
    'accent_hsl', '280 100% 65%',
    'support_email', 'support@futurebody.app'
  )
);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

-- NOTE: current_org_id() is defined in 20260608100100_org_scoping.sql, AFTER
-- profiles.org_id exists (a LANGUAGE sql function validates column references
-- at creation time, so it cannot be created here before the column is added).

-- RLS: anyone authenticated can read the stock org (for branding fallback);
-- members can read their own org; only owners can update.
create policy "read stock org" on public.organizations
  for select using (is_stock = true);

create policy "read own org" on public.organizations
  for select using (
    id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "owners update org" on public.organizations
  for update using (
    id in (select org_id from public.org_members where user_id = auth.uid() and role = 'owner')
  );

create policy "read own memberships" on public.org_members
  for select using (user_id = auth.uid());

create policy "owners read memberships" on public.org_members
  for select using (
    org_id in (select org_id from public.org_members where user_id = auth.uid() and role = 'owner')
  );
