# Renovation Manager MVP – Implementation Plan

## Summary
Build a single codebase web + mobile app using Expo (React Native Web) and Supabase. MVP includes:
- Multi-project support per user
- Schedule with a native Gantt view
- Noticeboard (simple posts with tags)
- Trades directory (contacts)
- Budget items (planned/actual costs)
- Basic multi-user collaboration via project invites
No offline mode, no attachments, no roles beyond Owner/Collaborator.

## Tech Stack
- Frontend: Expo (React Native + React Native Web), TypeScript
- Navigation: React Navigation
- UI: Tamagui (shared components and styling)
- State/data: TanStack Query + Supabase JS client
- Backend: Supabase (Postgres, Auth, Storage)
- Hosting: Vercel (web), Expo EAS (mobile builds)

## Architecture & Data Flow
- Client reads/writes directly to Supabase with Row-Level Security (RLS)
- Auth via Supabase email/password + magic link
- User can create multiple projects
- Users invite collaborators by email:
  - Owner creates invite in `project_invites`
  - Recipient signs up and accepts invite
  - Accepting creates `project_members` entry and deletes invite

## Data Model (Supabase Tables)
1. `profiles`
- `id` (uuid, pk, auth.uid)
- `full_name` (text)
- `created_at` (timestamptz)

2. `projects`
- `id` (uuid, pk)
- `name` (text)
- `address` (text, nullable)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `owner_id` (uuid, fk profiles.id)
- `created_at` (timestamptz)

3. `project_members`
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `user_id` (uuid, fk profiles.id)
- `role` (text, enum: `owner`, `collaborator`)
- `created_at` (timestamptz)

4. `project_invites`
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `email` (text)
- `invited_by` (uuid, fk profiles.id)
- `created_at` (timestamptz)

5. `tasks` (for Gantt)
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `title` (text)
- `start_date` (date)
- `end_date` (date)
- `status` (text, enum: `planned`, `in_progress`, `blocked`, `done`)
- `trade_id` (uuid, fk trades.id, nullable)
- `sort_order` (int)
- `created_at` (timestamptz)

6. `notices`
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `title` (text)
- `body` (text)
- `tags` (text[], default empty)
- `created_by` (uuid, fk profiles.id)
- `created_at` (timestamptz)

7. `trades`
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `name` (text)
- `trade` (text)
- `phone` (text)
- `email` (text)
- `created_at` (timestamptz)

8. `budget_items`
- `id` (uuid, pk)
- `project_id` (uuid, fk projects.id)
- `name` (text)
- `category` (text)
- `estimated_cost` (numeric)
- `actual_cost` (numeric, nullable)
- `status` (text, enum: `planned`, `committed`, `paid`)
- `notes` (text, nullable)
- `created_at` (timestamptz)

## RLS Policies (Supabase)
- `profiles`: users can select/update their own profile
- `projects`: select if member; insert if owner_id = auth.uid
- `project_members`: select if member; insert if owner of project
- `project_invites`: insert/select if owner of project; select if email = auth.email
- `tasks`, `notices`, `trades`, `budget_items`: select/insert/update/delete only if user is project member

## UI/UX Structure (Clean & Modern)
- Top-level navigation:
  - Web: left sidebar (Projects / Schedule / Noticeboard / Trades / Budget)
  - Mobile: bottom tabs
- Project switcher in header

Screens:
1. Auth
- Sign up, sign in, magic link
2. Projects
- List, create, select
3. Schedule (Gantt)
- Vertical list of tasks with horizontally scrollable timeline
- Tasks on the left, bars on the right
- Status chips (Planned, In-Progress, Blocked)
4. Noticeboard
- Card list of notices
- Create/edit post
5. Trades
- Simple directory list + detail view
6. Budget
- Table/list of budget items
- Totals summary (estimated vs actual)

## Gantt Implementation (Native)
- Use a horizontal `ScrollView` for the timeline
- Each task row is a `View` with an absolutely-positioned bar
- Timeline scale: 1 day = fixed width (e.g., 24px)
- Calculate left offset and width based on task start/end dates
- Add vertical scroll for task list + horizontal scroll sync for header
- Performance: flat list with memoized rows

## Implementation Phases
1. Project setup
- Initialize Expo (web + native)
- Add TypeScript, linting, navigation, Tamagui
- Configure Supabase client

2. Auth & profile
- Supabase Auth screens
- Profile bootstrap on first login

3. Projects & memberships
- Create project
- List project memberships
- Invite flow via `project_invites`
- Accept invite flow

4. Core feature modules
- Schedule: tasks CRUD + Gantt view
- Noticeboard: notices CRUD + tags
- Trades: directory CRUD
- Budget: items CRUD + summary totals

5. UX polish
- Empty states
- Loading/skeletons
- Simple filtering by status (tasks, budget)

## API & Interfaces (Public)
- Supabase tables as defined above
- No custom server APIs
- Auth uses Supabase Auth endpoints
- Client uses Supabase JS with RLS enforcement

## Test Cases & Scenarios
1. Auth
- Sign up, sign in, sign out, magic link
2. Projects
- Create project, switch project, delete project (optional)
3. Invites
- Owner sends invite
- Invitee accepts and sees shared project
- Non-member cannot access project data
4. Gantt
- Tasks render with correct start/end widths
- Scroll sync works
- Status filters apply
5. Noticeboard
- Create/edit/delete notice
6. Trades
- Add/edit/remove trade
7. Budget
- Create items, update actual cost, totals reflect accurately

## Assumptions & Defaults
- Multi-project support enabled
- Invites are email-based and require the recipient to sign up before accepting
- No attachments or offline mode in MVP
- Gantt uses a simple day-based scale and custom layout (no third-party Gantt library)
- Roles limited to owner/collaborator
