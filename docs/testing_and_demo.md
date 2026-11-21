# GramSeva — Testing & Demonstration Guide

This guide provides step-by-step verification instructions for project evaluators and academic examiners demonstrating **GramSeva**.

---

## 1. Quick Start for Evaluators

1. **Start the FastAPI Backend**:
   ```bash
   cd backend
   .venv\Scripts\activate   # (or source .venv/bin/activate on macOS/Linux)
   uvicorn backend.app.main:app --reload --port 8000
   ```
   Backend will be running at `http://localhost:8000`.

2. **Start the Next.js Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

3. **Admin CRM Credentials (Demo Mode)**:
   - **Login URL**: `http://localhost:3000/admin/login`
   - **Email**: `admin@gramseva.gov.in`
   - **Password**: `GramSeva@2026`

---

## 2. Test Scenario A: Citizen Website Grievance Lifecycle

### Objective:
Verify end-to-end complaint submission from the web portal, database insertion, admin CRM visibility, department assignment, status updates, and citizen tracking.

### Steps:
1. Open `http://localhost:3000/register`.
2. Fill out the complaint registration form:
   - **Full Name**: *Suresh Kumar*
   - **Mobile Number**: *98451 98765*
   - **Category**: *Streetlight issues*
   - **Description**: *"Three streetlights near the primary school are blinking and damaged, making the street pitch dark."*
   - Click **Preview AI Classification**: Observe the instant Gemini AI prediction (Category: Streetlight issues, Priority: High, Department: Electricity).
   - **Village**: *Harohalli*
   - **Ward**: *Ward 3*
   - **Address**: *Near Govt Primary School, 2nd Main*
   - Adjust the pin on the **interactive Leaflet map** or click **Use My Current Location**.
3. Click **Submit Grievance**.
4. Observe the confirmation screen displaying your unique tracking ID (e.g. `GS-2026-1007`).
5. Open the **Admin CRM** at `http://localhost:3000/admin`:
   - In the Grievance Registry table, notice the newly filed complaint appears at the top with `source: web` and initial status `Submitted`.
   - Click **Manage** to open the details modal.
   - Review the AI Suggestions Box.
   - Under **Assign Responsible Department**, select `Electricity` and enter officer name `Venkatesh Murthy (Lineman)`, then click **Update Department Assignment**.
   - Under **Update Grievance Status**, change status to `In Progress`, add remarks *"Lineman dispatched to replace bulbs"*, and commit status change.
6. Return to `http://localhost:3000/track`:
   - Enter `GS-2026-1007` and search.
   - Observe the updated visual timeline showing **In Progress**, assigned to Electricity Department, with the officer's remarks visible!

---

## 3. Test Scenario B: WhatsApp Conversational Bot Intake

### Objective:
Verify that the citizen can submit a complaint via WhatsApp, that the conversational state machine guides them, that the complaint is saved into the **SAME** Supabase database, and that updates trigger notifications.

### Steps:
1. Open the **WhatsApp Simulator** at `http://localhost:3000/whatsapp`.
2. Type `"Hi"` or click the **Hi** quick-reply pill.
3. The bot welcomes you and displays the 6 civic categories.
4. Reply with `"4"` (Water Supply).
5. The bot asks for the problem description. Reply:
   `"Main drinking water pipeline broke, water is flooding the street and 30 houses have no water."`
6. The bot asks for location details. Reply:
   `"Kallugopahalli, Ward 1, Near Community Center"`
7. The bot asks for your full name. Reply:
   `"Lakshmi Devi"`
8. The bot asks for a photo. Reply `"SKIP"` or send a photo URL.
9. The bot displays a formatted summary of collected details and asks you to confirm.
10. Reply `"YES"`.
11. The bot confirms registration, returns your unique tracking ID (e.g. `GS-2026-1008`), and provides tracking guidance.
12. Test WhatsApp tracking: type `TRACK GS-2026-1008` in the simulator. Observe the bot returning real-time status!
13. Open the **Admin CRM** at `http://localhost:3000/admin`:
    - Notice `GS-2026-1008` is immediately visible in the table with `source: whatsapp`!
    - Click **Manage**, change status to `In Progress` with the *"Send WhatsApp Notification"* toggle checked.
    - An outbound message update is dispatched!

---

## 4. Test Scenario C: Google Gemini AI Classification & Override

### Objective:
Demonstrate automated categorization, priority assessment, department recommendation, and admin override.

### Steps:
1. In the backend Swagger docs at `http://localhost:8000/docs`, test `POST /api/ai/classify`:
   - Description: *"Open drain is clogged with solid plastic waste and overflowing into front yard after heavy rain."*
   - Response will return:
     - `category`: `"Drainage and sanitation"`
     - `priority`: `"High"`
     - `department`: `"Sanitation"`
     - `summary`: Concise 1-sentence issue summary.
2. In the Admin CRM (`http://localhost:3000/admin`):
   - Open any complaint's detail modal.
   - Click **Override Suggestion** in the AI box.
   - Change the category, priority (e.g. from Medium to Critical), or department.
   - Click **Save Override**.
   - Notice the badge changes to **Admin Overridden**, preserving an audit trail.

---

## 5. Automated Backend Test Suite Verification

Run the automated pytest test suite in your terminal:

```bash
cd backend
.venv\Scripts\activate
pytest backend/tests/ -v
```

All 8 tests will execute and pass:
- `test_ai_classification_water` (PASSED)
- `test_ai_classification_streetlight` (PASSED)
- `test_health_check` (PASSED)
- `test_list_departments` (PASSED)
- `test_submit_complaint_and_track` (PASSED)
- `test_analytics_summary` (PASSED)
- `test_meta_webhook_verification` (PASSED)
- `test_whatsapp_complete_conversation_flow` (PASSED)
