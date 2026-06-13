-- Fix two issues blocking white-label branding from loading:
--
-- 1) Infinite recursion: the "owners read memberships" policy on org_members
--    subqueried org_members itself, so evaluating it (directly, or via the
--    "read own org" policy on organizations) errored with
--    "infinite recursion detected in policy for relation org_members".
--    Fixed with a SECURITY DEFINER helper that bypasses RLS.
--
-- 2) No public branding read: anon preview visitors (?org=<slug>) and authed
--    end-users who are not org_members could not read a non-stock org's
--    branding. Branding is inherently public (it renders on the public landing
--    page), but the organizations table also holds sensitive columns
--    (stripe_customer_id, stripe_subscription_id). RLS cannot restrict columns,
--    so we expose only the safe branding columns through a SECURITY DEFINER RPC.

-- 1) Break the org_members recursion.
create or replace function public.is_org_owner(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members
    where org_id = _org_id
      and user_id = auth.uid()
      and role = 'owner'
  )
$$;

drop policy if exists "owners read memberships" on public.org_members;
create policy "owners read memberships" on public.org_members
  for select using (public.is_org_owner(org_id));

-- 2) Public, column-safe branding lookup by org id or slug.
create or replace function public.get_org_branding(_id uuid default null, _slug text default null)
returns table (
  id uuid,
  slug text,
  name text,
  branding jsonb,
  plan text,
  is_stock boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.slug, o.name, o.branding, o.plan, o.is_stock
  from public.organizations o
  where (_id is not null and o.id = _id)
     or (_id is null and _slug is not null and o.slug = _slug)
  limit 1
$$;

grant execute on function public.get_org_branding(uuid, text) to anon, authenticated;
