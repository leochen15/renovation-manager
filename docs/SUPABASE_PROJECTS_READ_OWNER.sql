-- Supabase migration: allow project owners to read their own projects
-- Safe to run on an existing database.

drop policy if exists "Projects read by owner" on projects;

create policy "Projects read by owner" on projects
  for select using (owner_id = auth.uid());
