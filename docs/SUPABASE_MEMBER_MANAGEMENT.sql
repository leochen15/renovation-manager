-- Project Access Management: soft-deactivate members, owner UPDATE policy, profiles co-member read
-- Safe to run on an existing database.

-- 1. Add active column to project_members
alter table project_members add column if not exists active boolean not null default true;

-- 2. Update is_project_member to require active = true
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
      and project_members.active = true
  );
$$;

-- 3. project_members UPDATE policy: owner can update role and active for non-owner members
create policy "Members update by owner" on project_members
  for update using (
    exists (
      select 1 from projects p
      where p.id = project_members.project_id
        and p.owner_id = auth.uid()
        and project_members.user_id != p.owner_id
    )
  );

-- 4. Profiles readable by project co-members (active members of same project)
create policy "Profiles readable by project co-members" on profiles
  for select using (
    exists (
      select 1 from project_members pm1
      join project_members pm2 on pm2.project_id = pm1.project_id and pm2.user_id = profiles.id
      where pm1.user_id = auth.uid()
        and pm1.active = true
        and pm2.active = true
    )
  );

