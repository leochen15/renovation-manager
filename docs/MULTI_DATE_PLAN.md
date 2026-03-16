---
name: Multi-date task rows
overview: Allow a user to create a single logical task with multiple date ranges while keeping the `tasks` table schema unchanged by inserting one row per range, then grouping those rows in the schedule UI via a shared `created_at` value.
todos:
  - id: schema-and-group-key
    content: Adopt grouping key `(project_id, title, created_at)` and ensure multi-insert uses shared `created_at`.
    status: in_progress
  - id: multi-range-create-ui
    content: Refactor ScheduleScreen new-task form to manage a list of date ranges and insert one row per range.
    status: pending
  - id: grouped-rendering
    content: Group fetched `Task[]` into grouped tasks and render one row with multiple bars; update timeline calculations accordingly.
    status: pending
  - id: grouped-editing
    content: "Update edit modal to edit grouped tasks: per-range date edits by row id; group-level edits (title/status) applied to all rows via group filters."
    status: pending
  - id: mocks
    content: Update mock data to include a grouped task example and ensure mock Supabase supports the needed update patterns.
    status: pending
isProject: false
---



## Goal

Add “multiple date ranges per task” in the Schedule feature, stored as **one `tasks` row per range** (no DB schema changes), while the UI displays/edits them as a **single grouped task**.

## Current state (what we’re building on)

- DB table `tasks` includes `title`, `start_date`, `end_date`, `status`, `sort_order`, `created_at`. See `[docs/SUPABASE_SCHEMA.sql](/Users/leochen/developer/renovation-manager/docs/SUPABASE_SCHEMA.sql)`.
- The app currently reads/writes `tasks` directly from the client in `[src/screens/ScheduleScreen.tsx](/Users/leochen/developer/renovation-manager/src/screens/ScheduleScreen.tsx)` via Supabase.

## Data model approach (no schema change)

- **Insert strategy**: when creating a multi-range task, the client generates one shared ISO timestamp `groupCreatedAt = new Date().toISOString()` and sends it as `created_at` for **every inserted row** in that group.
- **Grouping key** (per your decision): `(project_id, title, created_at)`.
  - Existing single-range tasks naturally form a group of 1.
  - This avoids schema change and is more reliable than title-only grouping.

## UI/UX changes

- **New task form** (`ScheduleScreen`):
  - Default UI shows **one** `start_date`/`end_date` range (current behavior).
  - Add clickable text: **“Add Date(s)”**.
    - Clicking appends another start/end range input pair.
    - Allow removing extra ranges (keep at least 1 range).
  - On submit:
    - Validate every range (YYYY-MM-DD, `end_date` strictly after `start_date`), then insert **N rows**.
    - Generate `groupCreatedAt = new Date().toISOString()` once, and insert every row with the same `created_at = groupCreatedAt` (plus same `project_id`, `title`, `status`, etc.).
- **Schedule display**: show a **single task row** per group with **multiple bars**.
  - Query still fetches raw rows from `tasks`.
  - Client groups rows by `(project_id, title, created_at)` into `GroupedTask` objects.
  - Timeline min/max should be computed from **all ranges across all rows**.
  - Rendering: within one grouped row, render each bar with its own offset/duration.
- **Edit flow** (must identify which range was modified):
  - Editing UI should show the grouped task’s ranges (each range corresponds to a DB row `id`).
  - Add clickable text in the edit modal: **“Add Date(s)”**.
    - Clicking appends a new blank range entry in the UI (no DB row yet).
  - On save:
    - **Existing ranges**: update their `start_date`/`end_date` by row `id`.
    - **Newly added ranges**: insert new `tasks` row(s) using the group’s existing `(project_id, title, created_at)` so they join the same group (plus current group-level fields like `status`).
    - **Group-level edits** (per your decision): update shared fields (e.g., `title`, `status`) for all rows filtered by `(project_id, title, created_at)`.

## Backend/API impact

- None required (current architecture uses Supabase client directly). If you later add an API layer, keep the same contract: “create task group” = insert multiple rows with shared `created_at`.

## Code touchpoints

- `[src/screens/ScheduleScreen.tsx](/Users/leochen/developer/renovation-manager/src/screens/ScheduleScreen.tsx)`
  - Refactor local state from single range → `ranges: Array<{start:string; end:string; id?:string}>`.
  - Change `submit()` to `supabase.from('tasks').insert(ranges.map(...))` with shared `created_at`.
  - Add grouping helper: raw `Task[]` → `GroupedTask[]`.
  - Update timeline calc and gantt rendering to use grouped tasks + multiple bars.
  - Update edit modal to edit grouped task, with per-range editing.
- `[src/types.ts](/Users/leochen/developer/renovation-manager/src/types.ts)`
  - Keep `Task` as-is.
  - Add a UI-only type (in screen file or shared types) like `GroupedTask = { groupKey, title, status, created_at, ranges: Task[] }`.
- `[src/mocks/mockDb.ts](/Users/leochen/developer/renovation-manager/src/mocks/mockDb.ts)`
  - Add example grouped tasks: multiple `Task` rows with same `title` + same `created_at` but different start/end.
- `[src/mocks/mockSupabase.ts](/Users/leochen/developer/renovation-manager/src/mocks/mockSupabase.ts)`
  - Ensure `.insert([...])` already works (it does) and that `.update(...).eq(... )` patterns for group updates are supported by your query usage.

## Validation and edge cases

- **Overlapping ranges**: allow by default; optionally warn but don’t block.
- **Duplicate ranges**: de-dupe on submit (exact same start/end) to avoid accidental duplicates.
- **Sorting**: within a grouped task, sort ranges by `start_date`.
- **Renames**: if title changes, update group rows so grouping remains stable.

## Test plan (manual)

- Create a task with 3 ranges; verify 3 DB rows inserted with identical `created_at` and same `title`.
- Verify schedule shows 1 grouped row with 3 bars.
- Edit one range dates: only that bar moves, group label remains.
- Edit status/title: all rows in the group update, schedule grouping remains intact.
- Verify existing single-range tasks still display correctly (one bar).

