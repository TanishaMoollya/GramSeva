# GramSeva — Setup & Installation Guide

This guide details the complete local setup for **GramSeva**, an AI-Powered Public Grievance Redressal and CRM System built for Gram Panchayats in India.

---

## 1. System Requirements

- **Node.js**: Version 18.x, 20.x, or 22.x+
- **Python**: Version 3.10, 3.11, or 3.12+
- **Git**: (Optional) for version control
- **Supabase Account**: (Optional for production; built-in Demo Repository Mode works out of the box without any keys!)
- **Google AI Studio Key**: (Optional for live Gemini; heuristic classifier active in demo mode)
- **Meta WhatsApp Cloud API Account**: (Optional for live WhatsApp; web simulator active in demo mode)

---

## 2. Repository Structure

```
GramSeva/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── config.py         # Pydantic environment configuration
│   │   ├── database.py       # Supabase client & demo repository store
│   │   ├── main.py           # FastAPI entrypoint & middleware
│   │   ├── models/           # Pydantic schemas (complaints, whatsapp)
│   │   ├── routers/          # API routes (complaints, analytics, whatsapp, ai, departments)
│   │   └── services/         # Gemini AI, WhatsApp State Machine, Complaint CRM logic
│   ├── tests/                # Pytest test suite (all tests passing)
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variable template
│   └── .env                  # Local environment file
├── frontend/                 # Next.js 14 App Router Application
│   ├── src/
│   │   ├── app/              # Routes: /, /register, /track, /whatsapp, /admin, /admin/login
│   │   ├── components/       # Navbar, Footer, Leaflet GIS ComplaintMap
│   │   ├── lib/api.ts        # Type-safe API client
│   │   └── types/            # TypeScript data contracts
│   ├── package.json          # Dependencies (Leaflet, Recharts, Lucide, Tailwind)
│   ├── .env.example          # Frontend environment template
│   └── .env.local            # Frontend local environment
├── database/                 # SQL Migrations for Supabase PostgreSQL
│   ├── 01_schema.sql         # Tables, enums, triggers & sequences
│   ├── 02_rls_policies.sql   # Row Level Security (RLS) & Storage buckets
│   └── 03_seed_data.sql      # Departments & sample rural grievances
└── docs/                     # Documentation & setup manuals
    ├── setup.md              # Installation manual
    ├── api.md                # REST API reference
    ├── whatsapp_setup.md     # Meta Cloud API & ngrok webhook guide
    ├── gemini_setup.md       # Google Gemini AI guide
    └── testing_and_demo.md   # Step-by-step evaluator demo script
```

---

## 3. Backend Setup (FastAPI)

### Step 3.1: Navigate and Create Virtual Environment

```bash
cd backend

# On Windows (PowerShell):
python -m venv .venv
.venv\Scripts\activate

# On macOS / Linux:
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3.2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3.3: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The system is configured with `DEMO_MODE=True` by default. You can immediately run the application without external API keys. To connect live services, supply:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`

### Step 3.4: Run Pytest Test Suite

Verify all unit and integration tests across complaints, AI classification, WhatsApp webhook & state machine, and the two-stage administrator authentication system:

```bash
pytest -v
```

Expected output: `17 passed`.

---

## 4. Administrator Authentication & Security Architecture

GramSeva enforces strict, enterprise-grade administrative security:

### Core Security Rules:
1. **Public Administrator Registration is Disabled**: There is no self-registration or sign-up form on the login page.
2. **No Auto-Filled Credentials**: Both email and password fields are strictly blank on load.
3. **Mandatory 2-Stage Verification on EVERY Login**:
   - **Stage A (Password Authentication)**: Administrator submits registered email and password. Backend validates credentials and issues a cryptographic single-use 10-minute challenge token (SHA-256 hash stored in database).
   - **Stage B (Email Verification)**: Backend sends a branded verification email with a single-use link (`/admin/verify?token=...`). The administrator clicks the link to consume the challenge and receive their verified JWT session. Replay attempts are strictly blocked.
4. **Primary Administrator Model**:
   - Root administrator is initialized as `primary_admin` (`admin@gramseva.gov.in`).
   - Only the Primary Administrator can invite additional administrators (`/admin` &rarr; "Manage Administrators" tab).
   - Invitations generate a 24-hour single-use token and email an onboarding link (`/admin/accept-invitation?token=...`).
   - Primary Administrator can suspend and reactivate accounts, revoke invitations, and audit security events.
5. **CLI Bootstrap Utility**:
   ```bash
   python backend/app/scripts/bootstrap_admin.py
   ```

### Step 3.5: Start the Backend Server

When you are inside the `backend/` directory, you can start the server with any of the following commands:

```bash
# Recommended (FastAPI Uvicorn)
uvicorn app.main:app --reload --port 8000

# Or using the built-in launcher:
python run.py

# Or:
python main.py
```

*(Note: If you are running from the root `GramSeva/` directory instead of `backend/`, run `uvicorn backend.app.main:app --reload --port 8000`)*

The FastAPI Swagger documentation is accessible at:  
👉 **http://localhost:8000/docs**

---

## 4. Frontend Setup (Next.js)

### Step 4.1: Install Dependencies

```bash
cd ../frontend
npm install
```

### Step 4.2: Configure Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 4.3: Start Frontend Development Server

```bash
npm run dev
```

The portal is now running at:  
👉 **http://localhost:3000**

---

## 5. Supabase Database Deployment (Optional for Live Production)

1. Open your [Supabase Dashboard](https://supabase.com).
2. Go to **SQL Editor**.
3. Run the migrations in sequential order:
   - Paste and run `database/01_schema.sql` (Creates tables, enums, triggers).
   - Paste and run `database/02_rls_policies.sql` (Configures security policies).
   - Paste and run `database/03_seed_data.sql` (Inserts departments & realistic sample grievances).
4. Copy your project URL and service role key into `backend/.env`.
