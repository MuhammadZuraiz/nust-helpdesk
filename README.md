# 📌 NUST Helpdesk API  
**Production-style backend system for campus issue management**

A scalable REST API that simulates a real-world university helpdesk system where students report issues and staff manage them through structured workflows, SLA enforcement, and audit tracking.

---

# Overview

In many campuses, issues are handled through informal channels like WhatsApp or calls — resulting in:

- Lost requests  
- No accountability  
- No tracking or ownership  
- No service deadlines  

This project solves that by building a **production-grade backend system** with:

- Structured ticket workflows (state machine)
- Role-based access control (RBAC)
- SLA tracking & breach detection
- Department-based queue management
- Audit logs for accountability

---

# Key Features

## 1. Workflow Enforcement (State Machine)

OPEN → IN_PROGRESS → RESOLVED → CLOSED  
        ↘ NEEDS_INFO ↗

- Prevents invalid transitions  
- Enforces real business rules  
- Centralized logic via `ticketStatus.service.js`  

---

## 2. Role-Based Access Control (RBAC)

| Role        | Capabilities |
|------------|-------------|
| Student | Create tickets, comment, cancel, reopen, close |
| Agent   | Handle assigned tickets, update status |
| Supervisor | Assign tickets, manage department queue |
| Admin   | Full system control |

---

## 3. Department-Based Queue System

- Agents & supervisors only see their department tickets  
- Admin sees everything  

---

## 4. Advanced Queue & Search

Example:

GET /tickets/queue?status=OPEN&priority=HIGH&search=wifi&page=1&limit=10&sortBy=slaDueSoon

Supports:
- status, priority
- department, category
- assignee
- date range
- full-text search
- SLA-based sorting

---

## 5. SLA System

Each ticket gets:
- responseDueAt
- resolveDueAt

---

## 6. SLA Breach Detection

POST /jobs/run-sla-check

---

## 7. Comments & Internal Notes

- Public comments → student ↔ staff  
- Internal notes → staff only  

---

## 8. Audit Logging

Tracks:
- Ticket created
- Status changes
- Assignment
- SLA breaches

---

## 9. Clean Architecture

src/
 ├── routes/
 ├── controllers/
 ├── services/
 ├── middlewares/
 ├── validators/
 ├── jobs/
 └── utils/

---

# Tech Stack

- Node.js + Express
- Prisma ORM
- PostgreSQL / SQLite
- JWT Authentication
- Zod Validation

---

# Installation

git clone <your-repo>
cd nust-helpdesk-api
npm install

---

# Environment Setup

DATABASE_URL=your_db
JWT_SECRET=your_secret
PORT=4000

---

# Database Setup

npx prisma generate
npx prisma migrate dev

---

# Seed Database

node prisma/seed.js

---

# Run Server

npm run dev

---

# API Endpoints

Auth:
POST /auth/register  
POST /auth/login  

Tickets:
POST /tickets  
GET /tickets/my  
GET /tickets/:id  
GET /tickets/queue  
PATCH /tickets/:id/assign  
PATCH /tickets/:id/status  
PATCH /tickets/:id/cancel  
PATCH /tickets/:id/reopen  
PATCH /tickets/:id/close  

Comments:
POST /tickets/:id/comments  
POST /tickets/:id/notes  

Audit:
GET /tickets/:id/audit  

Jobs:
POST /jobs/run-sla-check  

---

# What Makes This Project Strong

- Not just CRUD  
- Real-world backend logic  
- SLA automation  
- Workflow enforcement  
- Clean architecture  

---

# Author

Muhammad Zuraiz
"""