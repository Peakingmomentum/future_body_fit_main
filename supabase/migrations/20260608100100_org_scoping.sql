-- Add org_id to existing user-scoped tables and backfill to stock org.
-- Stock org id is the fixed UUID seeded in the previous migration.

do $$
declare
  stock_org constant uuid := '00000000-0000-0000-0000-00000000f17b';
begin
  -- profiles
  alter table public.profiles
    add column if not exists org_id uuid references public.organizations(id) on delete restrict,
    add column if not exists referred_by_org_id uuid references public.organizations(id) on delete set null,
    add column if not exists last_active_at timestamptz;

  update public.profiles set org_id = stock_org where org_id is null;
  alter table public.profiles alter column org_id set not null;
  alter table public.profiles alter column org_id set default stock_org;
  create index if not exists profiles_org_idx on public.profiles(org_id);

  -- workout_plans
  alter table public.workout_plans
    add column if not exists org_id uuid references public.organizations(id) on delete restrict;
  update public.workout_plans set org_id = stock_org where org_id is null;
  alter table public.workout_plans alter column org_id set not null;
  alter table public.workout_plans alter column org_id set default stock_org;
  create index if not exists workout_plans_org_idx on public.workout_plans(org_id);

  -- workout_logs
  alter table public.workout_logs
    add column if not exists org_id uuid references public.organizations(id) on delete restrict;
  update public.workout_logs set org_id = stock_org where org_id is null;
  alter table public.workout_logs alter column org_id set not null;
  alter table public.workout_logs alter column org_id set default stock_org;
  create index if not exists workout_logs_org_idx on public.workout_logs(org_id);

  -- nutrition_logs
  alter table public.nutrition_logs
    add column if not exists org_id uuid references public.organizations(id) on delete restrict;
  update public.nutrition_logs set org_id = stock_org where org_id is null;
  alter table public.nutrition_logs alter column org_id set not null;
  alter table public.nutrition_logs alter column org_id set default stock_org;
  create index if not exists nutrition_logs_org_idx on public.nutrition_logs(org_id);

  -- fitness_buddy_messages
  alter table public.fitness_buddy_messages
    add column if not exists org_id uuid references public.organizations(id) on delete restrict;
  update public.fitness_buddy_messages set org_id = stock_org where org_id is null;
  alter table public.fitness_buddy_messages alter column org_id set not null;
  alter table public.fitness_buddy_messages alter column org_id set default stock_org;
  create index if not exists fitness_buddy_messages_org_idx on public.fitness_buddy_messages(org_id);
end $$;

-- Auto-assign org_id on new profile inserts from the user's invited org cookie
-- handled in app layer / org-signup edge function; default keeps existing
-- B2C signups under the stock org transparently.
