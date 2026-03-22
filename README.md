# 🎓 Attendance & Leave Management AI Command Centre

An AI-powered university attendance management system built on the ATLAS template for Atlas Skilltech University.

---

## 🚨 Project Overview

This project extends the Atlas AI Command Center template with a fully functional **Attendance & Leave Management** module powered by Google Gemini AI. It features three intelligent AI agents working together to automate and streamline university attendance management.

### What's Built

| Component | Description |
|-----------|-------------|
| **AI Attendance Agent** | Analyzes attendance patterns and flags at-risk students |
| **AI Leave Decision Agent** | Recommends approval/rejection of leave requests |
| **AI Medical Verification Agent** | Uses Gemini Vision to verify medical certificates |
| **Risk Detection** | Automatically detects students below 75% attendance threshold |
| **Attendance Dashboard** | Real-time stats, at-risk students, and recent records |
| **Mark Attendance** | Faculty can mark Present/Absent/Late per subject |
| **Apply Leave** | Students submit leave requests with document upload |
| **Manage Leaves** | Admin view with AI recommendations and approve/reject controls |

---

## ✨ Core Features

- **3 AI Agents** — Attendance analysis, leave decision making, and document verification
- **Gemini Vision** — AI reads and verifies uploaded medical certificates
- **75% Rule Enforcement** — University policy built into the AI logic
- **Smart Leave Processing** — AI considers current attendance before recommending leave approval
- **Medical Certificate Validation** — AI detects if uploaded document is genuinely medical
- **Real-time Dashboard** — Live stats with at-risk student alerts
- **Fully Containerized** — Docker and Docker Compose
- **Built on ATLAS Template** — Inherits auth, audit logging, RBAC, and AI infrastructure

---

## 💻 Technology Stack

| Area | Technology | Purpose |
|------|------------|---------|
| Backend | Python 3.11 + FastAPI | High-performance API |
| Frontend | Next.js 14+ + React + TypeScript | Modern UI framework |
| AI | Gemini API + Gemini Vision | Attendance analysis, leave decisions, document verification |
| Database | PostgreSQL 15 | Application data |
| Auth | JWT + Keycloak (optional) | Secure authentication |
| DevOps | Docker + Docker Compose | Containerization |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Required | Purpose |
|------|----------|---------|
| Docker Desktop | ✅ Yes | Runs all services |
| Gemini API Key | ✅ Yes | Powers all three AI agents |

### Step 1: Clone & Setup
```bash
git clone https://github.com/SohaPatel/atlasprojectSoha
cd atlasprojectSoha
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```bash
GEMINI_API_KEY=your-api-key-here
```

Get your free API key from: https://aistudio.google.com/apikey

### Step 3: Start Everything
```bash
docker compose up --build
```

### Step 4: Access the App

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 Frontend | http://localhost:3000 | Main application |
| 📡 Backend API | http://localhost:8000/docs | Swagger API docs |

**Default admin login:**
- Email: `admin@atlasuniversity.edu.in`
- Password: `admin123`

---

## 📂 Project Structure
```
.
├── backend/
│   └── app/
│       ├── modules/
│       │   └── attendance_ai/          # ← New AI Module
│       │       ├── agent.py            # AI agents (attendance + leave)
│       │       ├── models.py           # Database models
│       │       ├── schemas.py          # Data validation
│       │       ├── service.py          # Business logic
│       │       └── router.py           # API endpoints + medical verification
│       ├── api/                        # Existing ATLAS APIs
│       ├── core/                       # Config, DB, Auth
│       ├── models/                     # SQLAlchemy models
│       └── services/
│           └── ai/                     # Gemini AI services
│
├── frontend/
│   └── src/
│       ├── app/
│       │   └── attendance/
│       │       └── page.tsx            # ← Attendance dashboard page
│       └── components/
│           └── layout/
│               └── Sidebar.tsx         # Updated with attendance link
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🤖 AI Agents Details

### Agent 1 — Attendance Analysis Agent
Located in `agent.py` → `analyze_attendance()`
- Calculates overall and subject-wise attendance percentage
- Flags students at **WARNING** (<75%) or **CRITICAL** (<60%) risk levels
- Generates personalized recommendations per student
- Suggests specific actions for improvement

### Agent 2 — Leave Decision Agent
Located in `agent.py` → `analyze_leave_request()`
- Evaluates leave requests against current attendance standing
- Assigns a **risk score** (0.0 to 1.0) to each request
- Recommends **APPROVE**, **REJECT**, or **REVIEW**
- Falls back to rule-based logic if Gemini is unavailable

### Agent 3 — Medical Certificate Verification Agent
Located in `router.py` → `verify_medical_certificate()`
- Uses **Gemini Vision** to read and analyze uploaded documents
- Detects if the document is a genuine medical certificate
- Identifies fake or incorrect documents (selfies, random files, etc.)
- Returns confidence level and detailed explanation

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/mark` | Mark student attendance |
| GET | `/api/attendance/all` | Get all attendance records |
| GET | `/api/attendance/student/{id}` | Get student attendance |
| GET | `/api/attendance/summary/{id}` | Get attendance summary |
| GET | `/api/attendance/analyze/{id}` | AI analysis of student |
| GET | `/api/attendance/at-risk` | Get all at-risk students |
| POST | `/api/attendance/leave` | Submit leave request |
| GET | `/api/attendance/leave/all` | Get all leave requests |
| PATCH | `/api/attendance/leave/{id}/approve` | Approve leave |
| PATCH | `/api/attendance/leave/{id}/reject` | Reject leave |
| POST | `/api/attendance/verify-medical-certificate` | AI verify medical document |

---

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| GEMINI_API_KEY | ✅ Yes | Google Gemini API key |
| AI_MODEL | No | Default: gemini-2.0-flash-exp |
| DATABASE_URL | ✅ Yes | PostgreSQL connection string |
| SECRET_KEY | ✅ Yes | JWT signing key |
| NEXTAUTH_SECRET | ✅ Yes | NextAuth.js secret |
| KEYCLOAK_PORT | No | Default: 8081 |

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Port 8080 in use | Set `KEYCLOAK_PORT=8081` in `.env` |
| AI features not working | Check `GEMINI_API_KEY` is set in `.env` |
| Frontend not updating | Run `docker compose restart frontend` |
| Backend error | Run `docker compose logs backend` |
| Page not loading | Wait 1-2 mins for Docker to fully start |

---

## 👩‍💻 Built By

**Soha Patel** — Atlas Skilltech University Internship 2026