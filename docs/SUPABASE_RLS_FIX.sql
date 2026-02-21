-- Supabase migration: fix RLS recursion in project_members
-- Safe to run on an existing database.

create or replace function is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set row_security = off
as $$
  select exists (
    select 1 from project_members
    where project_members.project_id = p_project_id
      and project_members.user_id = auth.uid()
  );
$$;

drop policy if exists "Members read by members" on project_members;

create policy "Members read by members" on project_members
  for select using (is_project_member(project_members.project_id));
