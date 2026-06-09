-- Fixup: library curation operates on the exercises pool, not user-generated
-- workout_plans. library_overrides (from 20260608100200) is retained for
-- future workout-plan curation but the active path uses exercise_overrides.

create table public.exercise_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  base_exercise_id uuid not null references public.exercises(id) on delete cascade,
  action public.override_action not null,
  replacement_exercise_id uuid references public.custom_exercises(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, base_exercise_id),
  check (action <> 'replaced' or replacement_exercise_id is not null)
);
create index exercise_overrides_org_idx on public.exercise_overrides(org_id);

alter table public.exercise_overrides enable row level security;

create policy "org reads exercise overrides" on public.exercise_overrides
  for select using (org_id = public.current_org_id());
create policy "org staff writes exercise overrides" on public.exercise_overrides
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- Replace the view to operate on exercises (the actual library pool).
drop view if exists public.effective_workout_library;

create or replace view public.effective_exercise_library as
with caller_org as (select public.current_org_id() as org_id)
-- Base exercises minus hidden, with replacements swapped in
select
  e.id,
  coalesce(ce.name, e.name) as name,
  coalesce(ce.target_muscles, e.target_muscles) as target_muscles,
  coalesce(ce.equipment, e.equipment) as equipment,
  coalesce(ce.difficulty, e.difficulty) as difficulty,
  coalesce(ce.video_url, e.video_url) as video_url,
  coalesce(ce.media_url, e.external_video_url, e.reference_video_url) as media_url,
  case when o.id is not null then 'replaced' else 'base' end as source,
  (select org_id from caller_org) as org_id
from public.exercises e
left join public.exercise_overrides o
  on o.base_exercise_id = e.id and o.org_id = (select org_id from caller_org)
left join public.custom_exercises ce
  on ce.id = o.replacement_exercise_id
where (o.id is null or o.action = 'replaced')
union all
-- Org's own custom exercises (not overriding a base one)
select
  ce.id,
  ce.name,
  ce.target_muscles,
  ce.equipment,
  ce.difficulty,
  ce.video_url,
  ce.media_url,
  'custom'::text as source,
  ce.org_id
from public.custom_exercises ce
where ce.org_id = (select org_id from caller_org)
  and ce.base_exercise_id is null;
