# Store Manager Project

## Architecture
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL via Prisma ORM
- Auth: JWT + bcrypt
- Frontend: React + TypeScript + Vite + Tailwind
- Mobile: React Native + Expo

## Project Structure
/backend    → Express API
/frontend   → React dashboard + schedule board
/mobile     → React Native employee app

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

## Test credentials
- Manager: manager@test.com / password123 (pre-existing, not gated by AllowedEmail)
- Workers: must be added to AllowedEmail by manager before they can register

## Current Phase
Phase 5: Manager panel — template management (create/deactivate daily & floating templates, create new lists, manual sync trigger)

## Future Phases
- Phase 6: Cron job to auto-run daily rollover (replace manual POST /api/orders/sync)
- Phase 7: Mobile app (/mobile — React Native + Expo)
