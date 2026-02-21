-- Supabase migration: Allow users to accept project invites
-- This fixes RLS policies that were blocking invite acceptance
-- Safe to run on an existing database.

-- Allow users to insert themselves into project_members if they have a pending invite
create policy "Members insert by invite" on project_members
  for insert with check (
    exists (
      select 1 from project_invites pi
      where pi.project_id = project_members.project_id
        and pi.email = auth.email()
        and pi.role = project_members.role
    )
  );

-- Allow users to delete invites that match their email (for accepting invites)
create policy "Invites delete by invitee" on project_invites
  for delete using (project_invites.email = auth.email());

