# 🏛️ GramSeva — AI-Powered Public Grievance Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4.svg?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Meta WhatsApp](https://img.shields.io/badge/Meta%20WhatsApp-Cloud%20API-25D366.svg?logo=whatsapp&logoColor=white)](https://developers.facebook.com/)
[![Tests](https://img.shields.io/badge/Pytest-8%20Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)

**GramSeva** is a modern, full-stack, AI-driven Public Grievance Redressal and CRM platform specifically engineered for **Indian Gram Panchayats**. It bridges the gap between rural citizens and village local administration by providing two synchronized grievance intake channels:
1. **Official Citizen Web Portal** (responsive Next.js interface with OpenStreetMap GIS location pinning).
2. **Meta WhatsApp Cloud API Chatbot** (conversational intake in natural language).

Both channels feed into the **exact same Supabase PostgreSQL database** and are analyzed by **Google Gemini AI** for instant category classification, priority tagging, summary generation, and automatic departmental routing.

---

## 📸 Key Features

### 👤 Citizen Features
- **Grievance Registration**: Submit complaints with category, description, village/ward details, landmark, photo attachment, and interactive Leaflet map pin or GPS location.
- **Real-Time Status Tracking**: Enter Tracking ID (`GS-2026-XXXX`) and mobile number to see a multi-stage visual progress timeline (`Submitted → Under Review → Assigned → In Progress → Resolved / Rejected`).
- **Resolution Proof**: Inspect official remarks and uploaded photographic proof submitted by field workers upon resolution.
- **WhatsApp Chatbot**: File complaints, receive tracking IDs, check status, and receive real-time notifications on WhatsApp when an admin updates the grievance.

### 🛡️ Administrator & Panchayat Officer CRM
- **Executive Dashboard**: Real-time summary cards for total, new, pending, in-progress, resolved, and rejected grievances, along with resolution percentages.
- **Interactive Recharts Analytics**: Category distribution, department workload, monthly trends, and priority breakdowns.
- **Leaflet GIS Map**: Color-coded status pins plotted across the Gram Panchayat area with click-to-inspect popups.
- **Search, Filter & Sort**: Search by Tracking ID, citizen name, or phone. Filter by status, category, department, and submission source (`web` vs `whatsapp`).
- **AI Suggestion Review & Manual Override**: Review Gemini AI category, priority, department recommendations, and summary, with an override option preserving an audit trail.
- **Department & Officer Assignment**: Assign grievances to Sanitation, Public Works, Water Supply, Electricity, or General Administration, complete with work orders.
- **Automated Citizen Notifications**: Committing a status change dispatches an automated WhatsApp notification to the citizen.
- **CSV Data Export**: One-click download of all grievances in RFC-4180 CSV format.

---

## 🏗️ Monorepo Structure

```
GramSeva/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py         # Pydantic Settings & environment validation
│   │   ├── database.py       # Supabase client & in-memory Demo Store
│   │   ├── main.py           # FastAPI application entrypoint & CORS
│   │   ├── models/           # Pydantic Schemas for complaints & WhatsApp
│   │   ├── routers/          # API endpoints (complaints, analytics, whatsapp, ai, departments)
│   │   └── services/         # Gemini AI, WhatsApp State Machine & Complaint CRM service
│   ├── tests/                # Pytest test suite (8 tests passing)
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Backend environment template
│   └── .env                  # Local backend environment
│
├── frontend/                 # Next.js 14 (App Router) Application
│   ├── src/
│   │   ├── app/              # Routes: /, /register, /track, /whatsapp, /admin, /admin/login
│   │   ├── components/       # Navbar, Footer, Leaflet GIS ComplaintMap
│   │   ├── lib/              # Type-safe API client
│   │   └── types/            # TypeScript data contracts
│   ├── package.json          # Node dependencies
│   ├── .env.example          # Frontend environment template
│   └── .env.local            # Local frontend environment
│
├── database/                 # Supabase PostgreSQL Migrations
│   ├── 01_schema.sql         # Tables, enums, triggers & sequences
│   ├── 02_rls_policies.sql   # Row Level Security (RLS) & Storage buckets
│   └── 03_seed_data.sql      # Departments & sample rural grievances
│
└── docs/                     # Full Technical Manuals & Setup Guides
    ├── setup.md              # Installation manual
    ├── api.md                # Complete REST API reference
    ├── whatsapp_setup.md     # Meta WhatsApp Cloud API & ngrok guide
    ├── gemini_setup.md       # Google Gemini AI classification guide
    └── testing_and_demo.md   # Step-by-step evaluator demo script
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **Python** v3.10, v3.11, or v3.12+

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated tests
pytest backend/tests/ -v

# Start FastAPI server (from inside backend/):
uvicorn app.main:app --reload --port 8000
# Or:
python run.py
```
Backend API docs: 👉 **http://localhost:8000/docs**

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend web portal: 👉 **http://localhost:3000**

---

## 🔑 Demo Mode vs Live Production Mode

GramSeva is engineered with **two operational modes**:

| Feature | Demonstration Mode (Default) | Live Production Mode |
|---|---|---|
| **Supabase PostgreSQL** | Pre-seeded in-memory store with realistic rural complaints | Live Supabase PostgreSQL database via `SUPABASE_URL` |
| **Google Gemini AI** | Smart heuristic keyword classifier (works offline) | Real `gemini-2.5-flash` API via `GEMINI_API_KEY` |
| **Meta WhatsApp API** | Interactive in-browser smartphone simulator (`/whatsapp`) | Live WhatsApp messages via Meta Graph API & ngrok |
| **Admin Login** | `admin@gramseva.gov.in` / `GramSeva@2026` | Supabase Auth with encrypted JWT tokens |

---

## 🧪 Verification & Demonstration Scenarios

### Scenario A: Citizen Web Portal Lifecycle
1. Open `http://localhost:3000/register`.
2. Fill out grievance form (e.g. *Streetlight issues* near Primary School).
3. Click **Preview AI Classification** to see instant Gemini category & priority suggestions.
4. Pin location on the interactive Leaflet map and submit.
5. Note the generated ID (e.g. `GS-2026-1007`).
6. Log into Admin CRM (`http://localhost:3000/admin`), review the complaint, assign it to *Electricity Department*, and advance status to *In Progress*.
7. Track the grievance on `http://localhost:3000/track` to observe the updated timeline!

### Scenario B: WhatsApp Chatbot Intake
1. Open `http://localhost:3000/whatsapp`.
2. Send `"Hi"`, choose category `"4"` (Water Supply), describe the issue, provide village name, and confirm with `"YES"`.
3. Receive unique tracking ID and test the `TRACK <ID>` command.
4. Open Admin CRM to see the complaint created in the **SAME database** with `source: whatsapp`!

### Scenario C: AI Review & Override
1. In Admin CRM, open any complaint.
2. Review the Gemini AI confidence score, suggested department, and summary.
3. Click **Override Suggestion** to modify fields.
4. Save to update database records with an auditable **Admin Overridden** stamp.

---

## 📚 Detailed Documentation

- [Setup & Installation Manual](file:///c:/Users/Tanisha/Desktop/TANISHA/GramSeva/docs/setup.md)
- [REST API Reference](file:///c:/Users/Tanisha/Desktop/TANISHA/GramSeva/docs/api.md)
- [Meta WhatsApp Cloud API Setup & ngrok Guide](file:///c:/Users/Tanisha/Desktop/TANISHA/GramSeva/docs/whatsapp_setup.md)
- [Google Gemini AI Guide](file:///c:/Users/Tanisha/Desktop/TANISHA/GramSeva/docs/gemini_setup.md)
- [Evaluator Testing & Demonstration Script](file:///c:/Users/Tanisha/Desktop/TANISHA/GramSeva/docs/testing_and_demo.md)

---

## 📄 License
Academic demonstration project built for Indian Gram Panchayat Civic Empowerment.
