-- Community: feed posts, Workout of the Day, reactions/comments. Org-scoped.

create table public.org_feed_posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  media_url text,
  external_link text,         -- for embedded YouTube/IG Live links (v1 livestream substitute)
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index org_feed_posts_org_idx on public.org_feed_posts(org_id, created_at desc);

create table public.workout_of_the_day (
  org_id uuid not null references public.organizations(id) on delete cascade,
  day date not null,
  workout_id uuid not null,       -- references workout_plans OR custom_workouts (validated app-side)
  workout_source text not null default 'base',  -- 'base' | 'custom'
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, day)
);

create table public.post_reactions (
  post_id uuid not null references public.org_feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '❤',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.org_feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments(post_id, created_at);

alter table public.org_feed_posts enable row level security;
alter table public.workout_of_the_day enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;

-- All org members (incl. end-users) read posts/WOD; only staff write.
create policy "org reads posts" on public.org_feed_posts
  for select using (org_id = public.current_org_id());
create policy "staff writes posts" on public.org_feed_posts
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "org reads wod" on public.workout_of_the_day
  for select using (org_id = public.current_org_id());
create policy "staff writes wod" on public.workout_of_the_day
  for all using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

create policy "read reactions on visible posts" on public.post_reactions
  for select using (
    post_id in (select id from public.org_feed_posts where org_id = public.current_org_id())
  );
create policy "react on visible posts" on public.post_reactions
  for insert with check (
    user_id = auth.uid()
    and post_id in (select id from public.org_feed_posts where org_id = public.current_org_id())
  );
create policy "delete own reactions" on public.post_reactions
  for delete using (user_id = auth.uid());

create policy "read comments on visible posts" on public.post_comments
  for select using (
    post_id in (select id from public.org_feed_posts where org_id = public.current_org_id())
  );
create policy "comment on visible posts" on public.post_comments
  for insert with check (
    user_id = auth.uid()
    and post_id in (select id from public.org_feed_posts where org_id = public.current_org_id())
  );
create policy "delete own comments" on public.post_comments
  for delete using (user_id = auth.uid());
