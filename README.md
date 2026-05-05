# Nitsat — Store Operations Management System

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

A full-stack store operations platform for managing daily orders and employee tasks — built from scratch and **currently running in production** at a real store.

Developed as an AI-assisted project using [Claude Code](https://claude.ai/code), with a strong foundation in TypeScript, Node.js, and React driving every architectural decision.

---

## Overview

Nitsat replaces paper checklists and WhatsApp messages with a structured, real-time system. Managers define recurring order templates and task checklists per employee role; workers see only what's relevant to them and check off items as they go. Every update propagates instantly to all connected devices — no refresh needed.

**Two user types, one app:**
- **Manager** — configures templates, tracks completion across roles, manages users and job assignments
- **Worker** — sees their daily/weekly task list and shared order checklists; checks items off from their phone

---

## Features

### Orders System
- Weekly board view with 6-day columns (Sun–Fri) + floating shift lists
- Recurring order templates per day-of-week; manager can add one-off items to any date
- Overdue items roll forward automatically at midnight (skipping Saturday, the rest day)
- Future weeks derived from templates — no pre-created rows in the database

### Tasks System
- Job-role–based daily and weekly task checklists (e.g., Cashier, Waiter, Shift Lead)
- Task instances are **shared per role** — one worker checking an item marks it done for everyone in that role
- No rollover — each day starts fresh, historical data kept for manager review

### Real-Time Sync
- Socket.IO connection established on login (JWT authenticated at handshake)
- Toggle events broadcast to all clients; optimistic UI updates on the actor's side corrected by the authoritative socket echo

### Manager Dashboard
- Template management: add/rename/deactivate recurring order and task templates inline
- User management: invite by email allowlist, assign job roles per worker
- Task status page: per-role progress bars with daily/weekly breakdowns, date navigation for history

### PWA (Progressive Web App)
- Workers add the app to their home screen directly from the browser — no app store, no install friction
- Native-feeling bottom tab bar on mobile, standard top nav on desktop
- Configured with manifest, theme color, and Apple mobile web app meta tags

### Automated Scheduling
- `node-cron` job at 00:01 Asia/Jerusalem: daily order rollover + task instance generation
- Manager can also trigger sync manually via the dashboard

---

## Architecture

```
┌─────────────────────────────────┐
│  Browser / PWA (iOS & Android)  │
│  React 19 + Tailwind CSS v4     │
└──────────┬──────────────────────┘
           │ HTTP (REST)  +  WebSocket
           ▼
┌─────────────────────────────────┐
│  Express API (Node.js)          │
│  JWT Auth · Rate Limiting       │
│  Controllers → Services layer   │
└──────────┬──────────────────────┘
           │ Prisma ORM
           ▼
┌─────────────────────────────────┐
│  PostgreSQL                     │
│  Orders · Tasks · Users · Roles │
└─────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Real-time | Socket.IO 4.8 (JWT auth on handshake) |
| Auth | JWT + bcrypt |
| Scheduling | node-cron |
| Testing | Jest, ts-jest, Supertest (28 tests) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
├── backend/
│   └── src/
│       ├── controllers/     # Route handlers (thin layer)
│       ├── services/        # Business logic (order rollover, task generation)
│       ├── routes/          # Express routers
│       ├── middleware/       # JWT auth, role guards, error handler
│       └── prisma/          # Prisma client singleton
│
└── frontend/
    └── src/
        ├── pages/           # LoginPage, OrdersPage, TasksPage, WorkerTasksPage …
        ├── components/      # DayColumn, FloatingList, RoleCard, NavBar …
        ├── context/         # AuthContext (JWT + user state)
        └── lib/             # Axios instance, role helpers
```

---

## Key Design Decisions

- **Service layer over fat controllers** — business logic (rollover rules, instance generation, overdue detection) lives in dedicated service files, keeping route handlers thin and testable.
- **Optimistic UI + socket correction** — checkboxes respond immediately; if the server write fails the UI reverts. The socket echo from a successful write is idempotent, so the actor's own toggle is never doubled.
- **Virtual future-week rendering** — future weeks display template-derived "virtual" items (`id < 0`) without creating DB rows in advance. Managers can still add real one-off instances to future dates, which appear alongside virtual ones.
- **Shared task instances per role** — one `TaskInstance` row is shared by all workers in a role, avoiding duplication and making completion genuinely collaborative.
- **PWA over native mobile app** — workers open a URL, tap "Add to Home Screen", and get a full-screen app with no App Store dependency, no version management overhead, and instant updates.

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- `npx` / npm

### Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, FRONTEND_URL
npm install
npx prisma migrate dev        # run migrations
npm run dev                   # starts on :3000
```

Seed example data:

```bash
npx ts-node prisma/seed.ts
npx ts-node prisma/seedTasks.ts
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # starts on :5173 (proxies /api and /auth to :3000)
```

### Test credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Manager | manager@test.com | password123 |
| Worker | Add via manager's Users tab first |  |

---

## Running Tests

```bash
cd backend
npm test                 # 28 tests (auth, orders, tasks)
npm run test:coverage    # with coverage report
```
