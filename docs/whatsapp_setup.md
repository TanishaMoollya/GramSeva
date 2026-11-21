# GramSeva — Meta WhatsApp Cloud API Setup Guide

This document describes how to configure the official **Meta WhatsApp Cloud API** with **GramSeva** for automated citizen grievance intake, conversational routing, and live SMS/WhatsApp status update notifications.

---

## 1. Overview & Architecture

GramSeva integrates with the official **Meta Cloud API** (Graph API `v20.0`) through a state machine on the FastAPI backend:

```
[ Citizen WhatsApp ]
        │
        ▼ (Incoming webhook event)
[ Meta Cloud API Server ]
        │
        ▼ (HTTPS POST to /api/whatsapp/webhook)
[ ngrok Public Tunnel ]
        │
        ▼
[ GramSeva FastAPI Backend ]
        ├── Verification: /api/whatsapp/webhook (hub.challenge)
        ├── State Machine: State Machine transitions (Welcome -> Category -> Description -> Location -> Name -> Confirmation)
        ├── AI Classification: Google Gemini API (gemini-2.5-flash)
        └── Database Storage: Supabase PostgreSQL (complaints, whatsapp_messages, whatsapp_conversations)
        │
        ▼ (Outbound Graph API response)
[ Citizen WhatsApp Notification ]
```

---

## 2. Prerequisites

1. A **Meta for Developers** account ([developers.facebook.com](https://developers.facebook.com/)).
2. A Meta Business App with the **WhatsApp** product added.
3. A WhatsApp Business Test Phone Number (provided for free by Meta in Sandbox).
4. **ngrok** or any public HTTPS tunneling tool.

---

## 3. Step-by-Step Meta Cloud API Configuration

### Step 3.1: Retrieve Meta API Credentials

1. Open **Meta App Dashboard** > **WhatsApp** > **API Setup**.
2. Note your credentials:
   - **Phone number ID**: e.g., `105938472910482`
   - **WhatsApp Business Account ID**: e.g., `109283748291024`
   - **Temporary Access Token** or **Permanent System User Access Token**

### Step 3.2: Configure Backend Environment Variables

Open `backend/.env` and update:

```env
WHATSAPP_API_VERSION=v20.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token_here
WHATSAPP_VERIFY_TOKEN=gramseva_webhook_secret_token_2026
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id_here
```

---

## 4. Setting Up ngrok Webhook Tunnel

Meta WhatsApp webhooks require a **publicly reachable HTTPS URL** with a valid SSL certificate. Meta **rejects `http://localhost`**.

### Step 4.1: Start ngrok Tunnel

With the FastAPI backend running on port 8000:

```bash
ngrok http 8000
```

ngrok will output a public HTTPS URL like:
```
Forwarding https://1a2b-3c4d-5e6f.ngrok-free.app -> http://localhost:8000
```

### Step 4.2: Configure Webhook in Meta Dashboard

1. In Meta Developer Dashboard, navigate to **WhatsApp** > **Configuration** > **Webhook**.
2. Click **Edit**.
3. Fill in:
   - **Callback URL**: `https://1a2b-3c4d-5e6f.ngrok-free.app/api/whatsapp/webhook`
   - **Verify Token**: `gramseva_webhook_secret_token_2026`
4. Click **Verify and Save**.
   - FastAPI handles the `hub.challenge` verification handshake automatically and returns HTTP 200.
5. In **Webhook fields**, click **Manage** and subscribe to:
   - `messages` (Essential: receives citizen messages)

---

## 5. Conversational Bot Interaction Flow

When a citizen messages the GramSeva WhatsApp test number:

1. **Greeting**: Citizen sends `"Hi"` or `"1"`.
   - Bot replies with welcome message and lists categories (1 to 6).
2. **Category Selection**: Citizen replies with `"4"` (Water Supply).
   - Bot validates and prompts for a detailed problem description.
3. **Problem Description**: Citizen types the issue.
   - Bot prompts for Village, Ward, and Landmark.
4. **Location Details**: Citizen types village name and address.
   - Bot prompts for citizen's full name.
5. **Name**: Citizen types their name.
   - Bot asks for an optional photo (or reply `"SKIP"`).
6. **Photo**: Citizen sends photo or replies `"SKIP"`.
   - Bot presents a formatted summary and asks: *"Reply YES to submit or NO to cancel"*.
7. **Confirmation**: Citizen replies `"YES"`.
   - Backend calls the grievance intake pipeline:
     - Assigns unique `GS-2026-XXXX` ID.
     - Runs Google Gemini AI classification.
     - Stores in the **SAME complaints table** as the website.
     - Bot replies with confirmation message and tracking instructions.

### Universal Commands:
- `TRACK <ID>`: Returns real-time status, assigned department, and remarks.
- `HELP`: Displays command list and helpline information.
- `RESET`: Clears the conversation state machine.

---

## 6. Real-Time Status Update Notifications

When a Panchayat Administrator updates grievance status or assigns a department in the Admin CRM, GramSeva automatically calls:

```python
await whatsapp_service.send_status_notification(
    recipient_phone=complaint["citizen_phone"],
    tracking_id=complaint["tracking_id"],
    new_status="In Progress",
    department_name="Sanitation",
    remarks="Excavation crew deployed to clear drain."
)
```

**Delivered WhatsApp Message Sample:**
> 📢 **GramSeva Grievance Update**  
> Dear Citizen, your complaint **GS-2026-1002** has been assigned to the **Water Supply Department**.  
>  
> 📌 **Current Status:** In Progress  
> 📝 **Remarks:** Emergency water tanker deployed to affected houses.  
>  
> Track real-time progress on GramSeva Citizen Portal or reply with `TRACK GS-2026-1002`.

---

## 7. Zero-Configuration Simulator (Demo Mode)

For evaluators or examiners without a Meta Business account:

1. Open **http://localhost:3000/whatsapp**.
2. An interactive WhatsApp smartphone emulator is available.
3. You can chat with the live bot, enter grievances, confirm creation, and view the generated complaint immediately in the Admin CRM table!
