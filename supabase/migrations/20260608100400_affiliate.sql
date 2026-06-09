-- Affiliate program: 40% recurring lifetime commission per referred end-user.
-- profiles.referred_by_org_id was already added in 20260608100100_org_scoping.sql.

create table public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text unique not null,
  label text,
  is_active boolean not null default true,
  click_count int not null default 0,
  signup_count int not null default 0,
  created_at timestamptz not null default now()
);
create index affiliate_links_org_idx on public.affiliate_links(org_id);

create type public.payout_status as enum ('pending', 'paid', 'failed', 'reversed');

create table public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  referred_user_count int not null default 0,
  gross_mrr_cents bigint not null default 0,
  commission_cents bigint not null default 0,
  status public.payout_status not null default 'pending',
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, period_start, period_end)
);
create index affiliate_payouts_org_idx on public.affiliate_payouts(org_id, period_start desc);

alter table public.affiliate_links enable row level security;
alter table public.affiliate_payouts enable row level security;

-- Anyone can read an active link by code (for the /r/[code] redirect).
create policy "public read active link by code" on public.affiliate_links
  for select using (is_active = true);

create policy "org staff manages links" on public.affiliate_links
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "org reads its payouts" on public.affiliate_payouts
  for select using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );
-- Inserts/updates to payouts are restricted to service role (edge function).
