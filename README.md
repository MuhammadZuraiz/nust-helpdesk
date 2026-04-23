# NUST Helpdesk

**Production-style campus issue management system — full stack**

A scalable REST API + React frontend that simulates a real-world university helpdesk system where students report issues and staff manage them through structured workflows, SLA enforcement, and audit tracking.

🔗 **Live Demo**
- Frontend: _https://your-frontend.onrender.com_
- Backend API: _https://nust-helpdesk.onrender.com_

---

## Overview

In many campuses, issues are handled through informal channels like WhatsApp or calls — resulting in:

- Lost requests
- No accountability
- No tracking or ownership
- No service deadlines

This project solves that by building a **production-grade fullstack system** with:

- Structured ticket workflows (state machine)
- Role-based access control (RBAC)
- SLA tracking & breach detection
- Department-based queue management
- Audit logs for accountability

---

## Project Structure

```
nust-helpdesk/
├── NUST-helpdesk-api/       # Node.js + Express + Prisma backend
└── helpdesk-frontend/       # React + Vite + Tailwind frontend
```

---

## Key Features

### 1. Workflow Enforcement (State Machine)
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
            ↘ NEEDS_INFO ↗
```
- Prevents invalid transitions
- Enforces real business rules
- Centralized logic via `ticketStatus.service.js`

### 2. Role-Based Access Control (RBAC)

| Role       | Capabilities                                      |
|------------|---------------------------------------------------|
| Student    | Create tickets, comment, cancel, reopen, close    |
| Agent      | Handle assigned tickets, update status            |
| Supervisor | Assign tickets, manage department queue           |
| Admin      | Full system control                               |

### 3. Department-Based Queue System
- Agents & supervisors only see their department tickets
- Admin sees everything

### 4. Advanced Queue & Search
```
GET /tickets/queue?status=OPEN&priority=HIGH&search=wifi&page=1&limit=10&sortBy=slaDueSoon
```
Supports: status, priority, department, category, assignee, date range, full-text search, SLA-based sorting

### 5. SLA System
Each ticket gets `responseDueAt` and `resolveDueAt` deadlines automatically.

### 6. SLA Breach Detection
```
POST /jobs/run-sla-check
```

### 7. Comments & Internal Notes
- Public comments → student ↔ staff
- Internal notes → staff only

### 8. Audit Logging
Tracks: ticket created, status changes, assignment, SLA breaches

---

## Tech Stack

**Backend**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication (access + refresh tokens)
- Zod Validation
- Nodemailer (email notifications)

**Frontend**
- React + Vite
- Tailwind CSS
- React Router

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (or use the free Render PostgreSQL)

### Backend Setup

```bash
git clone https://github.com/MuhammadZuraiz/nust-helpdesk.git
cd nust-helpdesk/NUST-helpdesk-api
npm install
```

Create `.env`:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nust_helpdesk
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=4000
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_ethereal_user
EMAIL_PASS=your_ethereal_pass
EMAIL_FROM=helpdesk@nust_helpdesk.com
```

```bash
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

### Frontend Setup

```bash
cd ../helpdesk-frontend
npm install
```

Create `.env`:
```env
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Deployment (Render)

### Backend — Web Service

| Setting          | Value                                                              |
|------------------|--------------------------------------------------------------------|
| Root Directory   | `NUST-helpdesk-api`                                               |
| Build Command    | `npm install && npx prisma generate && npx prisma migrate deploy` |
| Start Command    | `npm start`                                                        |

Environment variables: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `EMAIL_*`

### Frontend — Static Site

| Setting           | Value                          |
|-------------------|--------------------------------|
| Root Directory    | `helpdesk-frontend`            |
| Build Command     | `npm install && npm run build` |
| Publish Directory | `dist`                         |

Environment variables:
```
VITE_API_URL=https://nust-helpdesk.onrender.com
```

---

## API Endpoints

**Auth**
```
POST /auth/register
POST /auth/login
```

**Tickets**
```
POST   /tickets
GET    /tickets/my
GET    /tickets/:id
GET    /tickets/queue
PATCH  /tickets/:id/assign
PATCH  /tickets/:id/status
PATCH  /tickets/:id/cancel
PATCH  /tickets/:id/reopen
PATCH  /tickets/:id/close
```

**Comments**
```
POST /tickets/:id/comments
POST /tickets/:id/notes
```

**Audit**
```
GET /tickets/:id/audit
```

**Jobs**
```
POST /jobs/run-sla-check
```

---

## Author

Muhammad Zuraiz