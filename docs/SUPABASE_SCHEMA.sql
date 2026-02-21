-- Renovation Manager MVP schema

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  start_date date,
  end_date date,
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  created_at timestamptz default now()
);

create table if not exists project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  email text not null,
  invited_by uuid references profiles(id) on delete set null,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  created_at timestamptz default now()
);

create table if not exists project_role_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer')),
  can_view_schedule boolean not null default true,
  can_edit_schedule boolean not null default true,
  can_view_noticeboard boolean not null default true,
  can_edit_noticeboard boolean not null default true,
  can_view_trades boolean not null default true,
  can_edit_trades boolean not null default true,
  can_view_budget boolean not null default true,
  can_edit_budget boolean not null default true,
  can_view_invites boolean not null default false,
  can_edit_invites boolean not null default false,
  created_at timestamptz default now(),
  unique (project_id, role)
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  trade text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('planned', 'in_progress', 'blocked', 'done')),
  trade_id uuid references trades(id) on delete set null,
  sort_order int,
  created_at timestamptz default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  category text not null,
  estimated_cost numeric not null,
  actual_cost numeric,
  status text not null check (status in ('planned', 'committed', 'paid')),
  notes text,
  created_at timestamptz default now()
);

-- Helper function to avoid RLS recursion on project_members
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

-- Enable RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_invites enable row level security;
alter table project_role_permissions enable row level security;
alter table trades enable row level security;
alter table tasks enable row level security;
alter table notices enable row level security;
alter table budget_items enable row level security;

-- RLS policies
create policy "Profiles are self" on profiles
  for select using (auth.uid() = id);
create policy "Profiles update self" on profiles
  for update using (auth.uid() = id);
create policy "Profiles insert self" on profiles
  for insert with check (auth.uid() = id);

create policy "Projects read by members" on projects
  for select using (exists (
    select 1 from project_members pm
    where pm.project_id = projects.id and pm.user_id = auth.uid()
  ));
create policy "Projects read by owner" on projects
  for select using (owner_id = auth.uid());
create policy "Projects insert by owner" on projects
  for insert with check (auth.uid() = owner_id);

create policy "Members read by members" on project_members
  for select using (is_project_member(project_members.project_id));
create policy "Members insert by owner" on project_members
  for insert with check (exists (
    select 1 from projects p
    where p.id = project_members.project_id and p.owner_id = auth.uid()
  ));
create policy "Members insert by invite" on project_members
  for insert with check (
    exists (
      select 1 from project_invites pi
      where pi.project_id = project_members.project_id
        and pi.email = auth.email()
        and pi.role = project_members.role
    )
  );

create policy "Invites read by owner" on project_invites
  for select using (exists (
    select 1 from projects p
    where p.id = project_invites.project_id and p.owner_id = auth.uid()
  ) or project_invites.email = auth.email()
  or exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = project_invites.project_id and pm.user_id = auth.uid() and prp.can_view_invites = true
  ));
create policy "Invites insert by owner" on project_invites
  for insert with check (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = project_invites.project_id and pm.user_id = auth.uid() and prp.can_edit_invites = true
  ));
create policy "Invites delete by owner" on project_invites
  for delete using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = project_invites.project_id and pm.user_id = auth.uid() and prp.can_edit_invites = true
  ));
create policy "Invites delete by invitee" on project_invites
  for delete using (project_invites.email = auth.email());

create policy "Role permissions read by members" on project_role_permissions
  for select using (exists (
    select 1 from project_members pm
    where pm.project_id = project_role_permissions.project_id and pm.user_id = auth.uid()
  ));
create policy "Role permissions insert by owner" on project_role_permissions
  for insert with check (exists (
    select 1 from projects p
    where p.id = project_role_permissions.project_id and p.owner_id = auth.uid()
  ));
create policy "Role permissions update by owner" on project_role_permissions
  for update using (exists (
    select 1 from projects p
    where p.id = project_role_permissions.project_id and p.owner_id = auth.uid()
  ));

create policy "Trades read by members" on trades
  for select using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = trades.project_id and pm.user_id = auth.uid() and prp.can_view_trades = true
  ));
create policy "Trades insert by members" on trades
  for insert with check (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = trades.project_id and pm.user_id = auth.uid() and prp.can_edit_trades = true
  ));
create policy "Trades update by members" on trades
  for update using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = trades.project_id and pm.user_id = auth.uid() and prp.can_edit_trades = true
  ));
create policy "Trades delete by members" on trades
  for delete using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = trades.project_id and pm.user_id = auth.uid() and prp.can_edit_trades = true
  ));

create policy "Tasks read by members" on tasks
  for select using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and prp.can_view_schedule = true
  ));
create policy "Tasks insert by members" on tasks
  for insert with check (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and prp.can_edit_schedule = true
  ));
create policy "Tasks update by members" on tasks
  for update using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and prp.can_edit_schedule = true
  ));
create policy "Tasks delete by members" on tasks
  for delete using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = tasks.project_id and pm.user_id = auth.uid() and prp.can_edit_schedule = true
  ));

create policy "Notices read by members" on notices
  for select using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = notices.project_id and pm.user_id = auth.uid() and prp.can_view_noticeboard = true
  ));
create policy "Notices insert by members" on notices
  for insert with check (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = notices.project_id and pm.user_id = auth.uid() and prp.can_edit_noticeboard = true
  ));
create policy "Notices update by members" on notices
  for update using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = notices.project_id and pm.user_id = auth.uid() and prp.can_edit_noticeboard = true
  ));
create policy "Notices delete by members" on notices
  for delete using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = notices.project_id and pm.user_id = auth.uid() and prp.can_edit_noticeboard = true
  ));

create policy "Budget read by members" on budget_items
  for select using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = budget_items.project_id and pm.user_id = auth.uid() and prp.can_view_budget = true
  ));
create policy "Budget insert by members" on budget_items
  for insert with check (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = budget_items.project_id and pm.user_id = auth.uid() and prp.can_edit_budget = true
  ));
create policy "Budget update by members" on budget_items
  for update using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = budget_items.project_id and pm.user_id = auth.uid() and prp.can_edit_budget = true
  ));
create policy "Budget delete by members" on budget_items
  for delete using (exists (
    select 1 from project_members pm
    join project_role_permissions prp on prp.project_id = pm.project_id and prp.role = pm.role
    where pm.project_id = budget_items.project_id and pm.user_id = auth.uid() and prp.can_edit_budget = true
  ));
