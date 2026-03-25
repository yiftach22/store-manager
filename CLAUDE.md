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

## Current Phase
Phase 2: Core API routes (employees, tasks, orders, schedule)
