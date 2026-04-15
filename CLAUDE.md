# Store Manager Project

## Architecture
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL via Prisma ORM
- Auth: JWT + bcrypt
- Frontend: React + TypeScript + Vite + Tailwind (PWA — installable on mobile)

## Project Structure
/backend    → Express API
/frontend   → React dashboard + worker PWA (single app, role-based views)

## Key Rules
- Always use TypeScript, never plain JS
- All API routes require auth middleware except /auth/*
- Use Prisma for all DB operations, never raw SQL
- Error responses must follow: { error: string, code: string }

## Database
- Connection via DATABASE_URL in .env
- Run `npx prisma migrate dev` after schema changes

## Completed
- Phase 1: Backend foundation — Auth + DB schema + core API ✓
  - POST /auth/register — creates user, returns JWT
  - POST /auth/login — validates credentials, returns JWT
  - Tested and confirmed writing to DB

- Phase 2: Order Management System ✓
  - Schema: OrderTemplate (id, title, dayOfWeek Int?, category String, isActive) + OrderInstance (id, title, originalDate, currentDate, status, category, isOverdue, FK→template)
  - GET  /api/orders?startDate=&endDate= — returns instances in range (all roles)
  - GET  /api/orders/templates — list all templates (Manager only)
  - POST /api/orders/templates — create recurring template (Manager only)
  - PATCH /api/orders/templates/:id/toggle — activate/deactivate template (Manager only)
  - PATCH /api/orders/instances/:id/toggle — flip completion status (all roles)
  - POST /api/orders/sync — manual daily rollover trigger (Manager only)
  - GET  /auth/me — returns current user from DB (auth required)
  - Rollover logic: Sun–Fri (work week) rolls overdue instances forward (isOverdue=true); Saturday is rest day — instances left untouched
  - CORS configured via FRONTEND_URL env var (default: http://localhost:5173)
  - Test suite: 28 tests passing (Jest + ts-jest + Supertest + jest-mock-extended)

- Phase 2.5: UI Readiness ✓
  - Frontend scaffolded: Vite + React + TypeScript + Tailwind CSS v4
  - Vite proxy forwards /api and /auth to backend (localhost:3000) — no CORS issues in dev
  - Frontend lives at /frontend; run `npm run dev` for dev server on :5173

## MVP Scope
Orders screen only — no employees, no tasks in the UI.
- Worker view: daily orders checklist with date navigation
- Manager view: worker view + template management + sync trigger
- Single app, role-based views (role determined via GET /auth/me after login)

- Phase 3: Orders UI ✓
  - Schema: added OrderList model (id, name, isActive); listId FK on OrderTemplate + OrderInstance
  - Rollover updated: floating instances excluded from day rollover; generated fresh on Sundays
  - GET /api/orders/week?weekOf= — single call returns { weekStart, days[], lists[] } with pre-sorted instances
  - GET/POST /api/orders/lists — list management
  - POST /api/orders/instances — manager one-off instance for any day or floating list
  - Frontend: Login page + Orders page (WeekNav, DayColumn ×6, FloatingList per list, OrderItem, AddOrderModal)
  - Optimistic checkbox toggle with revert on error
  - Past days grayed/disabled; today highlighted; overdue items red at top; done items struck through at bottom

- Phase 3.5: Seed data + future-week virtual display ✓
  - Seed: 37 daily templates (5–7 per day, Sun–Fri, Hebrew titles) + 2 floating lists ("משמרת בוקר" 6 items, "משמרת ערב" 7 items)
  - prisma/seedCurrentWeek.ts — one-off script to generate real instances for the current week without triggering rollover side-effects; re-run each Sunday
  - Future weeks: GET /api/orders/week derives display from templates (virtual:true, id<0) — no DB instances pre-created
  - Manager can still add one-off instances to future dates; they appear alongside virtual items
  - Frontend: future-week checkboxes disabled; manager + button still active for one-offs

- Phase 4: Registration allowlist + user management ✓
  - AllowedEmail model (id, email, role, createdAt) — manager pre-approves emails before anyone can register
  - register() checks AllowedEmail; role is assigned from the allowlist entry, not self-assigned by the user
  - requireManager middleware moved to src/middleware/auth.ts (shared by orders + users routes)
  - GET /api/users — list all registered users (Manager only)
  - GET /api/users/allowed-emails — list allowed emails (Manager only)
  - POST /api/users/allowed-emails { email, role } — add entry (Manager only)
  - DELETE /api/users/allowed-emails/:id — remove entry (Manager only)
  - /register page: name + email + password; blocked with Hebrew error if email not in allowlist
  - Login page ↔ Register page linked
  - Manager tab bar in OrdersPage: "הזמנות" | "ניהול עובדים"
  - UsersTab: add/remove allowed emails with role selector + badge; list of all registered users

- Phase 5: Inline template management ✓
  - EditTemplatesModal (createPortal → renders at document.body, immune to parent opacity)
  - Day columns: pencil ✎ button in header opens modal for that day's templates
  - Floating lists: "ערוך" + "מחק" buttons in card header; delete = soft-delete list + deactivate templates + remove current-week unchecked instances
  - "עריכת תבניות" toggle button next to "הזמנות יומיות" section title — edit mode shows all template controls; normal mode shows one-time add buttons only
  - "+ הוסף רשימה" button (edit mode only) opens modal to create list + items in one flow
  - New API endpoints (Manager only):
    - PATCH /api/orders/templates/:id/toggle — now also deletes current-week unchecked instances on deactivate; creates current-week instance on reactivate (today/future days only)
    - POST /api/orders/templates — now creates current-week instance immediately if day hasn't passed
    - PATCH /api/orders/lists/:id — rename list
    - DELETE /api/orders/lists/:id — soft-delete list
  - Template add/toggle triggers fetchWeek() refresh so board updates live
  - Past-day columns: content faded (opacity-70) but edit button remains full opacity; modal unaffected by parent opacity via portal

## Test credentials
- Manager: manager@test.com / password123 (pre-existing, not gated by AllowedEmail)
- Workers: must be added to AllowedEmail by manager before they can register

- Phase 6: Realtime updates via socket.io ✓
  - backend: http.createServer wraps Express; socket.io Server attached with CORS + JWT auth middleware
  - toggleInstance emits `instance:toggled` { id, status } to all connected clients after DB write
  - frontend: OrdersPage connects on mount (JWT in handshake auth), listens for `instance:toggled`, applies authoritative status + resort to local weekData state
  - Optimistic updates preserved — socket echo from own toggle is idempotent
  - Dev: VITE_SOCKET_URL=http://localhost:3000 in frontend/.env.development

- Phase 7: Cron job for daily rollover ✓
  - node-cron scheduled at 00:01 every day in index.ts
  - Calls processDailyRollover(new Date()) — service already skips Saturday internally
  - Manual POST /api/orders/sync kept as manager backup trigger
  - Logs result (updated/created counts) and errors to console

- Phase 8: Tasks DB + Backend API ✓
  - Schema: JobRole, UserJobRole, TaskTemplate, TaskInstance (all with Int ids)
  - Migration: tasks-schema
  - Seed: prisma/seedTasks.ts — 3 roles (קופאי, מלצר, אחראי משמרת) + 10 templates total
  - GET/POST/PATCH/DELETE /api/roles — role CRUD (Manager only)
  - GET/POST/PATCH/DELETE /api/roles/:roleId/templates — template CRUD (Manager only)
  - GET /api/tasks/status?date=YYYY-MM-DD — all active roles with daily+weekly instances (Manager only)
  - PATCH /api/tasks/instances/:id/toggle — flip status, emits task:toggled socket event (all roles)
  - PATCH /api/users/:id/role { roleId: number|null } — assign/remove role (Manager only)
  - generateTaskInstances(today) in task.service.ts; called by cron at 00:01 alongside orders rollover
  - Daily instances: Sun–Fri; Weekly instances: Sundays only; Saturday skipped entirely

- Phase 9: Task Management screen (web) ✓
  - `/tasks` route (manager only; redirects workers to `/`)
  - NavBar component shared across all pages: הזמנות | ניהול משימות | מעקב משימות (manager links)
  - TasksPage: role cards grid, edit mode toggle ("עריכת תפקידים" / "סיום עריכה")
  - RoleCard: inline rename (pencil → input), inline delete confirm, per-section (יומי/שבועי) template add + toggle + delete
  - Edit mode: shows inactive templates (strikethrough); normal mode: active only
  - OrdersPage: replaced logo/user header row with NavBar

- Phase 10: Task Status Follow screen (web) ✓
  - `/tasks/status` route (manager only)
  - Date navigation: prev/next day buttons + "היום" jump button
  - Fetches GET /api/tasks/status?date=YYYY-MM-DD on each date change
  - RoleStatusCard: collapsed shows יומי + שבועי progress bars (blue/green, X/Y format); click to expand
  - Expanded: task list with ✓ (green) / ○ (gray) per instance
  - Filters out roles with no instances for the selected date

- Phase 11: User management update (web) ✓
  - GET /api/users now includes jobRole: { id, name } | null for each user
  - UsersTab: role dropdown per worker row; calls PATCH /api/users/:id/role on change
  - Dropdown options: all active job roles + "ללא תפקיד"

- Phase 12: PWA worker view ✓
  - vite-plugin-pwa added; manifest configured (name "ניסת", RTL, theme color #7c3aed, SVG icon)
  - index.html: title "ניסת", theme-color, apple-mobile-web-app-* meta tags
  - GET /api/tasks/my-tasks?date=YYYY-MM-DD — returns { role, daily[], weekly[] } for the authenticated user's job role (all auth roles)
  - /my-tasks route (WorkerTasksPage) — single-column task checklist, optimistic toggle, socket.io realtime
  - NavBar: top bar on desktop (md+); bottom tab bar on mobile with icons
  - Workers land on /my-tasks after login; managers land on /; manager-only routes redirect workers to /my-tasks
  - login() in AuthContext now returns the user's role so LoginPage can navigate accordingly

## Current Phase
Phase 12 complete — all planned phases done.

## Tasks System Design (Phases 8–12)

### Concepts
- **Role (תפקיד)**: A job position the manager creates freely (e.g. קופאי, מלצר, אחראי משמרת).
  - Manager can create / rename / delete roles
  - Many-to-many with users (UserRole junction table), but each user has at most one role for now
  - A user can have no role ("עובד" — just a worker with no tasks)
- **TaskTemplate**: A recurring task assigned to a role
  - `frequency`: 'daily' (repeats every workday Sun–Fri) or 'weekly' (once per week)
  - No day-of-week specificity for daily tasks — they appear every workday
  - Manager can add / edit title / deactivate per template
- **TaskInstance**: The generated checklist item for a given day or week
  - Daily instances: one per active daily template per role, generated each workday at 00:01
  - Weekly instances: one per active weekly template per role, generated each Sunday at 00:01
  - **Shared per role** — all workers with the same role share the same instance (checking it marks it done for everyone)
  - **No rollover** — uncompleted instances are NOT carried forward; each period starts fresh
  - Old instances kept in DB for history (manager can navigate to past days/weeks)

### DB Schema additions
```
Role            id, name, isActive, createdAt
UserRole        userId, roleId  (@@id([userId, roleId]))  ← many-to-many junction
TaskTemplate    id, title, frequency(daily|weekly), isActive, roleId
TaskInstance    id, title, frequency, status(bool), date(DateTime), roleId, templateId?
```
User model: add `roles UserRole[]` relation (existing `role String` field = auth role MANAGER|WORKER, unchanged)

### API endpoints (all Manager only unless noted)
```
GET    /api/roles                          — list all active roles
POST   /api/roles                          — create role { name }
PATCH  /api/roles/:id                      — rename role { name }
DELETE /api/roles/:id                      — soft-delete role (isActive=false)

GET    /api/roles/:roleId/tasks            — list templates for a role
POST   /api/roles/:roleId/tasks            — create template { title, frequency }
PATCH  /api/tasks/:id                      — edit template { title } or toggle isActive
DELETE /api/tasks/:id                      — soft-delete template

GET    /api/tasks/status?date=YYYY-MM-DD   — all roles with their instances for that day/week
PATCH  /api/tasks/instances/:id/toggle     — flip completion (all roles — workers use this)

PATCH  /api/users/:id/role                 — assign role to user { roleId: number|null }
```

### Task generation (cron — added to existing 00:01 job in index.ts)
- **Daily** (every workday 00:01, skip Saturday): for each active role, create TaskInstance per active daily template for today
- **Weekly** (Sunday 00:01): for each active role, create TaskInstance per active weekly template for this week (date = Sunday)
- Existing orders rollover runs in the same cron job

### Manager web screens (new routes in frontend)
1. **ניהול משימות** (`/tasks`): role cards (daily + weekly task sections), edit mode to add/edit/delete roles and templates
2. **מעקב משימות** (`/tasks/status`): role cards with daily + weekly progress bars; click → detail list; date/week navigation for history

### Navigation update
- Top nav bar (or tab bar) extended with: ניהול משימות | מעקב משימות | (existing orders + users tabs remain)

### User management update
- UsersTab: add role dropdown per registered user (calls PATCH /api/users/:id/role)
- Dropdown options: all active roles + "ללא תפקיד" (no role)

## Phases

### Phase 8: Tasks DB + Backend API
- Prisma schema: Role, UserRole, TaskTemplate, TaskInstance + User relation
- Migration + seed (example roles and tasks)
- All API endpoints above
- Task generation service function (reusable, called by cron)
- Update cron in index.ts to also generate task instances

### Phase 9: Task Management screen (web)
- New route /tasks (manager only)
- Role management: create / rename / delete roles
- Per-role task editing: add / edit title / deactivate templates, split daily/weekly
- Edit mode pattern (consistent with orders screen)

### Phase 10: Task Status Follow screen (web)
- New route /tasks/status (manager only)
- Role cards with daily + weekly progress bars (X/Y completed)
- Date navigation (previous/next day for daily, previous/next week for weekly)
- Click role card → detail modal or expanded view: done ✓ and undone ✗ task list

### Phase 11: User management update (web) ✓
- Add role dropdown to each registered user row in UsersTab
- Calls PATCH /api/users/:id/role on change

### Phase 12: PWA worker view ✓
- vite-plugin-pwa for installability (manifest + service worker auto-generated)
- GET /api/tasks/my-tasks?date= — worker-accessible endpoint returning their role's tasks
- /my-tasks route (WorkerTasksPage) — optimistic toggle, socket realtime
- NavBar bottom tab bar on mobile; top bar on desktop
- Role-based login redirect: managers → /, workers → /my-tasks

## Future Phases
(none planned)
