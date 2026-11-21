# GramSeva — Google Gemini AI Classification Guide

This document describes how **GramSeva** integrates the **Google Gemini API** (`gemini-2.5-flash`) via the FastAPI backend to classify rural citizen grievances, assess severity priority, extract concise summaries, and recommend designated departments.

---

## 1. Overview & Architecture

When a citizen submits a complaint (via either the Web Portal or WhatsApp), the backend passes the problem description to `classify_complaint_ai()` in `backend/app/services/gemini_service.py`.

```
[ Citizen Grievance Text ]
          │
          ▼
[ Google Gemini 2.5 Flash ]
(system instruction with JSON schema constraint)
          │
          ▼
{
  "category": "Streetlight issues",
  "priority": "High",
  "department": "Electricity",
  "summary": "Dysfunctional streetlights near school causing safety concerns for 10 days.",
  "confidence": 0.95
}
          │
          ▼
[ Output Validation & Sanitization ]
          │
          ▼
[ Saved with Complaint Record in Supabase ]
          │
          ▼
[ Reviewed & Validated by Administrator in CRM ]
```

---

## 2. Obtaining a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** > **Create API key in new project**.
4. Copy the generated key (starts with `AIzaSy...`).

---

## 3. Configuring the Backend

Add your Gemini API key to `backend/.env`:

```env
GEMINI_API_KEY=AIzaSyYourGeneratedGeminiKeyHere
GEMINI_MODEL=gemini-2.5-flash
```

Restart your FastAPI backend server:

```bash
uvicorn backend.app.main:app --reload
```

The startup logs will confirm:
```
🧠 Gemini AI: Configured
```

---

## 4. Prompt Engineering & JSON Schema Enforcement

GramSeva enforces structured JSON output using Gemini's native JSON mode:

```python
system_instruction = (
    "You are an AI assistant for GramSeva, an Indian rural Gram Panchayat grievance management system. "
    "Analyze the citizen's complaint description and return a JSON object with:\n"
    "- 'category': MUST be exactly one of: ['Streetlight issues', 'Garbage collection', 'Potholes and road damage', 'Water supply', 'Drainage and sanitation', 'Other public issues']\n"
    "- 'priority': MUST be exactly one of: ['Low', 'Medium', 'High', 'Critical']\n"
    "- 'department': MUST be exactly one of: ['Sanitation', 'Public Works', 'Water Supply', 'Electricity', 'General Administration']\n"
    "- 'summary': A concise 1-2 sentence professional summary of the problem.\n"
    "- 'confidence': A float between 0.70 and 0.99 indicating classification certainty.\n"
    "Return valid JSON only, no markdown markers or extra text."
)
```

---

## 5. Resilient Fallback (Demo / Offline Mode)

If `GEMINI_API_KEY` is not provided, or if the API request times out or exceeds quota, GramSeva **automatically engages its built-in heuristic classifier**:
- It evaluates semantic keyword clusters (`light`, `pole`, `wire`, `darkness` → *Electricity* / *Streetlight issues*).
- It assesses urgency words (`danger`, `burst`, `flood`, `accident`, `children`, `hospital` → *High* or *Critical* priority).
- **Complaints are NEVER rejected by AI.** Complaint registration always completes smoothly, even without an internet connection or external API key!

---

## 6. Administrator Review & Override

In the Admin CRM:
1. Every grievance displays an **AI Suggestion Box** showing Category, Suggested Priority, Recommended Department, and Executive Summary.
2. The Panchayat Development Officer can review the suggestion and click **Override Suggestion** to modify any field.
3. Any overridden complaint is stamped with `ai_reviewed = true` and `ai_overridden = true` in Supabase for full auditability.
