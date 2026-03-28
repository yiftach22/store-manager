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
  - GET  /api/orders?startDate=&endDate= — returns instances in range
  - POST /api/orders/templates — create recurring template (Manager only)
  - PATCH /api/orders/instances/:id/toggle — flip completion status
  - POST /api/orders/sync — manual trigger for daily rollover
  - Rollover logic: Mon–Sat rolls overdue instances forward (isOverdue=true); Sunday deletes them (weekend cleanup)
  - Test suite: 27 tests passing (Jest + ts-jest + Supertest + jest-mock-extended)
    - Unit: processDailyRollover — weekday/Sunday/completion/generation cases
    - Integration: 401 auth guard, 403/201 RBAC, GET validation, PATCH toggle, sync

## Current Phase
Phase 3: Employees + Tasks + Schedule API routes
