-- Library curation: hide/replace base workouts per org, plus custom content.
-- "Base workouts" = workout_plans owned by the stock org. We do NOT duplicate
-- them per tenant; we override by reference.

create type public.override_action as enum ('hidden', 'replaced');

create table public.library_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  base_workout_id uuid not null references public.workout_plans(id) on delete cascade,
  action public.override_action not null,
  replacement_workout_id uuid references public.workout_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, base_workout_id),
  check (action <> 'replaced' or replacement_workout_id is not null)
);
create index library_overrides_org_idx on public.library_overrides(org_id);

create table public.custom_workouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  target_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty text,
  duration_minutes int,
  media_url text,            -- supabase storage path in org-media bucket
  media_kind text default 'mp4',  -- 'mp4' | 'gif' | 'image'
  plan_data jsonb not null default '{}'::jsonb, -- mirrors workout_plans shape
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index custom_workouts_org_idx on public.custom_workouts(org_id);

create table public.custom_meal_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  goal_type text,
  calories int,
  macros jsonb not null default '{}'::jsonb,
  meals jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index custom_meal_plans_org_idx on public.custom_meal_plans(org_id);

create table public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  base_exercise_id uuid references public.exercises(id) on delete cascade,
  -- Either overrides a base exercise (base_exercise_id set) or is a new one (null).
  name text not null,
  target_muscles text[] not null default '{}',
  equipment text,
  difficulty text,
  video_url text,
  media_url text,
  created_at timestamptz not null default now()
);
create index custom_exercises_org_idx on public.custom_exercises(org_id);

alter table public.library_overrides enable row level security;
alter table public.custom_workouts enable row level security;
alter table public.custom_meal_plans enable row level security;
alter table public.custom_exercises enable row level security;

-- Members of an org read its overrides/custom content; owners/staff write.
create policy "org reads overrides" on public.library_overrides
  for select using (org_id = public.current_org_id());
create policy "org owners write overrides" on public.library_overrides
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "org reads custom workouts" on public.custom_workouts
  for select using (org_id = public.current_org_id() and is_published);
create policy "org staff writes custom workouts" on public.custom_workouts
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "org reads custom meals" on public.custom_meal_plans
  for select using (org_id = public.current_org_id() and is_published);
create policy "org staff writes custom meals" on public.custom_meal_plans
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "org reads custom exercises" on public.custom_exercises
  for select using (org_id = public.current_org_id());
create policy "org staff writes custom exercises" on public.custom_exercises
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- View for the effective workout library for the caller's org:
-- base workouts (from stock org) minus hidden, with replacements swapped in,
-- UNION the org's own custom workouts.
create or replace view public.effective_workout_library as
with caller_org as (select public.current_org_id() as org_id)
select
  coalesce(r.id, w.id) as id,
  coalesce(r.title, w.plan_data->>'title') as title,
  coalesce(r.plan_data, w.plan_data) as plan_data,
  'base'::text as source,
  (select org_id from caller_org) as org_id
from public.workout_plans w
left join public.library_overrides o
  on o.base_workout_id = w.id and o.org_id = (select org_id from caller_org)
left join public.workout_plans r on r.id = o.replacement_workout_id
where w.org_id = '00000000-0000-0000-0000-00000000f17b'::uuid
  and (o.id is null or o.action = 'replaced')
union all
select c.id, c.title, c.plan_data, 'custom'::text as source, c.org_id
from public.custom_workouts c
where c.org_id = (select org_id from caller_org) and c.is_published;
