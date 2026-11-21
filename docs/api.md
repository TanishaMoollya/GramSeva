# GramSeva — REST API Documentation

The GramSeva FastAPI backend provides a high-performance RESTful API powering both the Citizen Web Portal and the Administrator CRM, as well as the Meta WhatsApp Cloud API webhooks.

- **Base URL (Local)**: `http://localhost:8000`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`
- **Alternative ReDoc**: `http://localhost:8000/redoc`

---

## 1. System Health

### `GET /api/health`
Returns system status and connection states.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "demo_mode": true,
  "supabase_configured": false,
  "gemini_ai_configured": false,
  "whatsapp_configured": false
}
```

---

## 2. Grievance Management (`/api/complaints`)

### `POST /api/complaints`
Registers a new grievance submitted from the Citizen Web Portal.
Triggers automated Google Gemini AI classification and saves to the database.

**Request Body:**
```json
{
  "citizen_name": "Ramesh Gowda",
  "citizen_phone": "+919845123456",
  "category": "Water supply",
  "description": "Drinking water pipeline has burst near the community hall. Road is submerged and supply interrupted for 40 houses.",
  "village_name": "Harohalli",
  "ward_number": "Ward 2",
  "address": "Bazaar Street, Opposite Community Hall",
  "latitude": 12.6582,
  "longitude": 77.4521,
  "source": "web",
  "image_url": "https://example.com/water_leak.jpg"
}
```

**Response (201 Created):**
```json
{
  "id": "c-20261112210000-GS-2026-1007",
  "tracking_id": "GS-2026-1007",
  "citizen_name": "Ramesh Gowda",
  "citizen_phone": "+919845123456",
  "category": "Water supply",
  "description": "Drinking water pipeline has burst near the community hall...",
  "village_name": "Harohalli",
  "ward_number": "Ward 2",
  "address": "Bazaar Street, Opposite Community Hall",
  "latitude": 12.6582,
  "longitude": 77.4521,
  "source": "web",
  "status": "Submitted",
  "priority": "Critical",
  "ai_category": "Water supply",
  "ai_priority": "Critical",
  "ai_department": "Water Supply",
  "ai_summary": "Major burst in main drinking water pipeline affecting 40 households.",
  "ai_confidence": 0.96,
  "ai_reviewed": false,
  "ai_overridden": false,
  "status_history": [
    {
      "previous_status": null,
      "new_status": "Submitted",
      "remarks": "Complaint registered via WEB portal.",
      "updated_by_name": "Ramesh Gowda (Citizen)",
      "created_at": "2026-11-12T15:30:00Z"
    }
  ],
  "attachments": [],
  "created_at": "2026-11-12T15:30:00Z",
  "updated_at": "2026-11-12T15:30:00Z"
}
```

---

### `GET /api/complaints/track/{tracking_id}`
Public citizen tracking endpoint.

**Query Parameters:**
- `phone` *(string, optional)*: Citizen's 10-digit mobile number for identity verification.

**Response (200 OK):**
Returns complete complaint record, current status, assigned department/officer, timeline history, and resolution photo proof if resolved.

---

### `GET /api/complaints`
Lists complaints for the Admin CRM with search, filtering, and sorting.

**Query Parameters:**
- `search` *(string, optional)*: Match against Tracking ID, Citizen Name, or Phone.
- `status` *(string, optional)*: `Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`, `Rejected`.
- `category` *(string, optional)*: Grievance category.
- `department` *(string, optional)*: Filter by assigned department name.
- `source` *(string, optional)*: `web` or `whatsapp`.
- `priority` *(string, optional)*: `Low`, `Medium`, `High`, `Critical`.
- `sort_by` *(string, default: `newest`)*: `newest`, `oldest`, `priority`.

---

### `PATCH /api/complaints/{id}/status`
Administrator updates grievance status.
Automatically triggers a WhatsApp notification to the citizen if `notify_citizen: true`.

**Request Body:**
```json
{
  "status": "In Progress",
  "remarks": "Field inspection completed; replacement pipe fittings dispatched.",
  "proof_url": null,
  "updated_by_name": "Panchayat Development Officer",
  "notify_citizen": true
}
```

---

### `PATCH /api/complaints/{id}/assign`
Assigns the complaint to a responsible department and field officer.

**Request Body:**
```json
{
  "department_id": "d0000003-0000-0000-0000-000000000003",
  "department_name": "Water Supply",
  "officer_name": "Anand Gowda (Water Inspector)",
  "notes": "Emergency repair order #402",
  "assigned_by_name": "Administrator",
  "notify_citizen": true
}
```

---

### `PATCH /api/complaints/{id}/ai-override`
Administrator review and manual override of Gemini AI suggestion.

**Request Body:**
```json
{
  "category": "Water supply",
  "priority": "High",
  "department": "Water Supply",
  "summary": "Verified pipeline rupture causing water pressure loss."
}
```

---

## 3. WhatsApp Integration (`/api/whatsapp`)

### `GET /api/whatsapp/webhook`
Meta Cloud API Webhook Verification.

**Query Parameters:**
- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

---

### `POST /api/whatsapp/webhook`
Incoming webhook receiver for live Meta WhatsApp Cloud API events.
Dispatches messages to the conversational state machine and creates complaints in Supabase.

---

### `POST /api/whatsapp/simulate`
Interactive Simulator endpoint enabling full end-to-end testing without external Meta credentials!

**Request Body:**
```json
{
  "phone_number": "+919845123456",
  "message_text": "Hi"
}
```

**Response (200 OK):**
```json
{
  "phone_number": "+919845123456",
  "bot_reply": "🏛️ *Welcome to GramSeva Citizen Portal*...",
  "current_step": "SELECT_CATEGORY",
  "collected_data": {},
  "complaint_created": false,
  "tracking_id": null
}
```

---

## 4. Analytics & Reports (`/api/analytics`)

### `GET /api/analytics/summary`
Returns metric totals, category distribution, department distribution, priority counts, and monthly trends for Recharts visual dashboard.

### `GET /api/analytics/export-csv`
Downloads an RFC-4180 compliant CSV file of all grievances.

---

## 5. Administrator Authentication & Security (`/api/auth`)

GramSeva enforces a mandatory two-stage authentication flow on every login, alongside invitation-only onboarding and role-based access control.

### `POST /api/auth/login`
**Stage A: Password Authentication & Challenge Issuance.**
Validates administrative credentials. If valid, generates a cryptographic single-use 10-minute challenge (SHA-256 hash stored in DB) and emails a verification link to the registered email address. Does NOT return an access token.

**Request Body:**
```json
{
  "email": "admin@gramseva.gov.in",
  "password": "GramSeva@2026Secure!"
}
```

**Response (200 OK):**
```json
{
  "stage": "EMAIL_VERIFICATION_REQUIRED",
  "challenge_id": "c71a3964-b04f-402a-9ca8-df1c1b12b509",
  "email": "admin@gramseva.gov.in",
  "masked_email": "a***n@gramseva.gov.in",
  "expires_in_minutes": 10,
  "message": "We have sent a secure verification link to your registered email address."
}
```

---

### `POST /api/auth/verify-challenge`
**Stage B: Email Verification Challenge Consumption.**
Consumes the single-use token from the email link (`/admin/verify?token=...`). Replay attempts are rejected with HTTP 400. Issues a signed JWT access session upon success.

**Request Body:**
```json
{
  "token": "d7k61f8sKldp4A9v2hL8Q1x4M..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in_minutes": 480,
  "user": {
    "id": "a0000001-0000-0000-0000-000000000001",
    "email": "admin@gramseva.gov.in",
    "name": "Panchayat Development Officer (PDO)",
    "role": "primary_admin",
    "department_name": "General Administration",
    "status": "active"
  }
}
```

---

### `POST /api/auth/resend-challenge`
Dispatches a fresh login challenge email, subject to rate-limiting cooldown and invalidating prior challenges.

---

### `GET /api/auth/me`
*Requires `Authorization: Bearer <token>`.*
Validates the current verified administrator session.

---

### `POST /api/auth/forgot-password`
Requests a 15-minute single-use password recovery link. Always returns a generic success message to prevent user enumeration.

---

### `POST /api/auth/reset-password`
Validates the reset token, verifies password complexity standards, and updates the administrator's password.

---

### `GET /api/auth/administrators`
*Requires Primary Administrator authorization.*
Returns the complete roster of active and suspended administrators, as well as outstanding invitations.

---

### `POST /api/auth/invite-admin`
*Requires Primary Administrator authorization.*
Dispatches an official 24-hour single-use invitation link (`/admin/accept-invitation?token=...`) to onboard a new department administrator.

**Request Body:**
```json
{
  "email": "officer.water@gramseva.gov.in",
  "full_name": "Kavitha Reddy",
  "role": "admin",
  "department_name": "Water Supply"
}
```

---

### `POST /api/auth/administrators/{id}/suspend`
*Requires Primary Administrator authorization.*
Suspends administrative account access. Primary administrators cannot suspend themselves.

---

### `POST /api/auth/administrators/{id}/reactivate`
*Requires Primary Administrator authorization.*
Re-enables administrative access for a suspended account.

---

### `DELETE /api/auth/invitations/{id}`
*Requires Primary Administrator authorization.*
Revokes an outstanding administrator invitation link.

---

### `GET /api/auth/audit-logs`
*Requires Primary Administrator authorization.*
Retrieves recent administrative and security audit events.
