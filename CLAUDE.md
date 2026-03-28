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

## Current Phase
Phase 3: Orders UI (React frontend)
- Login screen (POST /auth/login → store JWT in localStorage)
- Orders screen: GET /api/orders for current week, PATCH toggle per item
- Manager overlay: template list (GET /api/orders/templates), create/deactivate, sync button

## Future Phases (infrastructure already in schema)
- Phase 4: Employees + Tasks + Schedule (TaskTemplate, TaskInstance, WorkerCategory models exist)
- Phase 5: Cron job to auto-run daily rollover (replace manual POST /api/orders/sync)
- Phase 6: Mobile app (/mobile — React Native + Expo)
