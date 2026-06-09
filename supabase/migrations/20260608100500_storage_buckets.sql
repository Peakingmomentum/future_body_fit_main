-- Storage buckets for org-scoped media (trainer videos, logos).
-- Path convention: {org_id}/...  RLS enforces the prefix matches the caller's org.

insert into storage.buckets (id, name, public)
values
  ('org-media', 'org-media', false),
  ('org-branding', 'org-branding', true)
on conflict (id) do nothing;

-- org-media: signed URLs for reads (private); staff of the matching org can write.
create policy "org-media: org members read" on storage.objects
  for select using (
    bucket_id = 'org-media'
    and (storage.foldername(name))[1]::uuid = public.current_org_id()
  );

create policy "org-media: staff write" on storage.objects
  for insert with check (
    bucket_id = 'org-media'
    and (storage.foldername(name))[1]::uuid in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create policy "org-media: staff update" on storage.objects
  for update using (
    bucket_id = 'org-media'
    and (storage.foldername(name))[1]::uuid in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create policy "org-media: staff delete" on storage.objects
  for delete using (
    bucket_id = 'org-media'
    and (storage.foldername(name))[1]::uuid in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

-- org-branding: public read (so login/landing pages can render the trainer's
-- logo before auth), staff-only write.
create policy "org-branding: public read" on storage.objects
  for select using (bucket_id = 'org-branding');

create policy "org-branding: staff write" on storage.objects
  for insert with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1]::uuid in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );

create policy "org-branding: staff update" on storage.objects
  for update using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1]::uuid in (
      select org_id from public.org_members where user_id = auth.uid()
    )
  );
