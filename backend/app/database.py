"""
Database connector and resilient data layer for GramSeva.
Connects to Supabase PostgreSQL when configured, and provides an in-memory
demonstration repository with pre-seeded data when running in academic demo mode.
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.app.config import settings

# Global in-memory storage for demo mode
_DEMO_STORE: Dict[str, List[Dict[str, Any]]] = {
    "departments": [
        {
            "id": "d0000001-0000-0000-0000-000000000001",
            "name": "Sanitation",
            "code": "SAN",
            "description": "Waste collection, solid waste disposal, public hygiene and cleanliness.",
            "contact_email": "sanitation@gramseva.gov.in",
            "contact_phone": "+919876543210",
            "is_active": True
        },
        {
            "id": "d0000002-0000-0000-0000-000000000002",
            "name": "Public Works",
            "code": "PWD",
            "description": "Road repairs, potholes, culverts, bridge maintenance and public structures.",
            "contact_email": "pwd@gramseva.gov.in",
            "contact_phone": "+919876543211",
            "is_active": True
        },
        {
            "id": "d0000003-0000-0000-0000-000000000003",
            "name": "Water Supply",
            "code": "WTR",
            "description": "Borewells, community taps, water pipeline leakages and RO purification units.",
            "contact_email": "water@gramseva.gov.in",
            "contact_phone": "+919876543212",
            "is_active": True
        },
        {
            "id": "d0000004-0000-0000-0000-000000000004",
            "name": "Electricity",
            "code": "ELE",
            "description": "Streetlights, hanging electric wires, transformer faults and power supply.",
            "contact_email": "electricity@gramseva.gov.in",
            "contact_phone": "+919876543213",
            "is_active": True
        },
        {
            "id": "d0000005-0000-0000-0000-000000000005",
            "name": "General Administration",
            "code": "ADM",
            "description": "Panchayat office documentation, encroachment, licenses and community issues.",
            "contact_email": "admin@gramseva.gov.in",
            "contact_phone": "+919876543214",
            "is_active": True
        }
    ],
    "complaints": [
        {
            "id": "c0000001-0000-0000-0000-000000000001",
            "tracking_id": "GS-2026-1001",
            "citizen_name": "Ramesh Kumar",
            "citizen_phone": "+919845123456",
            "category": "Streetlight issues",
            "description": "Four streetlights near the Government Primary School have been dysfunctional for over 10 days, making the road unsafe for children in the evening.",
            "village_name": "Harohalli",
            "ward_number": "Ward 3",
            "address": "Near Govt Primary School, Main Cross",
            "latitude": 12.6582,
            "longitude": 77.4521,
            "source": "web",
            "status": "Assigned",
            "priority": "High",
            "ai_category": "Streetlight issues",
            "ai_priority": "High",
            "ai_department": "Electricity",
            "ai_summary": "Dysfunctional streetlights near school causing safety concerns for 10 days.",
            "ai_confidence": 0.95,
            "ai_reviewed": True,
            "ai_overridden": False,
            "assigned_department_id": "d0000004-0000-0000-0000-000000000004",
            "assigned_department_name": "Electricity",
            "assigned_officer_name": "Venkatesh Murthy (Lineman)",
            "resolution_remarks": None,
            "rejection_reason": None,
            "resolved_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
        },
        {
            "id": "c0000002-0000-0000-0000-000000000002",
            "tracking_id": "GS-2026-1002",
            "citizen_name": "Lakshmi Devi",
            "citizen_phone": "+919845234567",
            "category": "Water supply",
            "description": "The main pipeline near the community center burst yesterday morning. Potable water is flooding the street and 40 families have no drinking water.",
            "village_name": "Kallugopahalli",
            "ward_number": "Ward 1",
            "address": "Opposite Community Center, Bazaar Street",
            "latitude": 12.6645,
            "longitude": 77.4610,
            "source": "whatsapp",
            "status": "In Progress",
            "priority": "Critical",
            "ai_category": "Water supply",
            "ai_priority": "Critical",
            "ai_department": "Water Supply",
            "ai_summary": "Major burst in main drinking water pipeline affecting 40 households.",
            "ai_confidence": 0.98,
            "ai_reviewed": True,
            "ai_overridden": False,
            "assigned_department_id": "d0000003-0000-0000-0000-000000000003",
            "assigned_department_name": "Water Supply",
            "assigned_officer_name": "Anand Gowda (Water Inspector)",
            "resolution_remarks": "Excavation started; repair team deployed on-site.",
            "rejection_reason": None,
            "resolved_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(hours=4)).isoformat()
        },
        {
            "id": "c0000003-0000-0000-0000-000000000003",
            "tracking_id": "GS-2026-1003",
            "citizen_name": "Basavaraj Patil",
            "citizen_phone": "+919845345678",
            "category": "Garbage collection",
            "description": "Solid waste and plastic pile has not been cleared for two weeks near the weekly market ground. Foul odor and stray dogs causing disturbance.",
            "village_name": "Bidadi Rural",
            "ward_number": "Ward 5",
            "address": "Shandy / Weekly Market Ground North Gate",
            "latitude": 12.6710,
            "longitude": 77.4435,
            "source": "web",
            "status": "Resolved",
            "priority": "Medium",
            "ai_category": "Garbage collection",
            "ai_priority": "Medium",
            "ai_department": "Sanitation",
            "ai_summary": "Uncollected waste heap at weekly market ground for two weeks.",
            "ai_confidence": 0.94,
            "ai_reviewed": True,
            "ai_overridden": False,
            "assigned_department_id": "d0000001-0000-0000-0000-000000000001",
            "assigned_department_name": "Sanitation",
            "assigned_officer_name": "Suresh Kumar (Sanitation Supervisor)",
            "resolution_remarks": "Tractor and cleaning crew cleared 3 tonnes of waste. Disinfection powder sprayed.",
            "rejection_reason": None,
            "resolved_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "created_at": (datetime.utcnow() - timedelta(days=7)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "id": "c0000004-0000-0000-0000-000000000004",
            "tracking_id": "GS-2026-1004",
            "citizen_name": "Ananya Rao",
            "citizen_phone": "+919845456789",
            "category": "Potholes and road damage",
            "description": "Deep crater formed on the bus stop curve. Two two-wheelers skidded yesterday during rainfall.",
            "village_name": "Maralavadi",
            "ward_number": "Ward 2",
            "address": "Bus Stop curve, Kanakapura Road junction",
            "latitude": 12.6490,
            "longitude": 77.4720,
            "source": "whatsapp",
            "status": "Under Review",
            "priority": "High",
            "ai_category": "Potholes and road damage",
            "ai_priority": "High",
            "ai_department": "Public Works",
            "ai_summary": "Hazardous deep potholes causing accidents on bus stop curve.",
            "ai_confidence": 0.92,
            "ai_reviewed": False,
            "ai_overridden": False,
            "assigned_department_id": None,
            "assigned_department_name": None,
            "assigned_officer_name": None,
            "resolution_remarks": None,
            "rejection_reason": None,
            "resolved_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(hours=12)).isoformat()
        },
        {
            "id": "c0000005-0000-0000-0000-000000000005",
            "tracking_id": "GS-2026-1005",
            "citizen_name": "Manjunath S",
            "citizen_phone": "+919845567890",
            "category": "Drainage and sanitation",
            "description": "Open stormwater drain is clogged with silt and plastic bottles. Drain overflowed into our front yard after rain.",
            "village_name": "Harohalli",
            "ward_number": "Ward 4",
            "address": "Ganesha Temple Road, 2nd Cross",
            "latitude": 12.6534,
            "longitude": 77.4589,
            "source": "web",
            "status": "Submitted",
            "priority": "Medium",
            "ai_category": "Drainage and sanitation",
            "ai_priority": "Medium",
            "ai_department": "Sanitation",
            "ai_summary": "Clogged stormwater drain leading to overflow into residential compound.",
            "ai_confidence": 0.91,
            "ai_reviewed": False,
            "ai_overridden": False,
            "assigned_department_id": None,
            "assigned_department_name": None,
            "assigned_officer_name": None,
            "resolution_remarks": None,
            "rejection_reason": None,
            "resolved_at": None,
            "created_at": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(hours=6)).isoformat()
        },
        {
            "id": "c0000006-0000-0000-0000-000000000006",
            "tracking_id": "GS-2026-1006",
            "citizen_name": "Chandrashekar B",
            "citizen_phone": "+919845678901",
            "category": "Other public issues",
            "description": "Private construction dumping soil and blocking village public pathway.",
            "village_name": "Kallugopahalli",
            "ward_number": "Ward 2",
            "address": "Old Lake Pathway, Survey No. 42",
            "latitude": 12.6612,
            "longitude": 77.4650,
            "source": "web",
            "status": "Rejected",
            "priority": "Low",
            "ai_category": "Other public issues",
            "ai_priority": "Low",
            "ai_department": "General Administration",
            "ai_summary": "Civil dispute regarding private encroachment on pathway.",
            "ai_confidence": 0.85,
            "ai_reviewed": True,
            "ai_overridden": False,
            "assigned_department_id": "d0000005-0000-0000-0000-000000000005",
            "assigned_department_name": "General Administration",
            "assigned_officer_name": "Nagaraj (Panchayat Development Officer)",
            "resolution_remarks": None,
            "rejection_reason": "Dispute pertains to private land survey boundary currently under civil court jurisdiction; outside Panchayat executive jurisdiction.",
            "resolved_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=8)).isoformat()
        }
    ],
    "status_history": [
        {
            "id": "h0000001",
            "complaint_id": "c0000001-0000-0000-0000-000000000001",
            "previous_status": None,
            "new_status": "Submitted",
            "remarks": "Complaint submitted via Citizen Web Portal.",
            "proof_url": None,
            "updated_by_name": "Ramesh Kumar (Citizen)",
            "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()
        },
        {
            "id": "h0000002",
            "complaint_id": "c0000001-0000-0000-0000-000000000001",
            "previous_status": "Submitted",
            "new_status": "Under Review",
            "remarks": "Grievance verified by Panchayat Development Officer.",
            "proof_url": None,
            "updated_by_name": "Panchayat Desk",
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "id": "h0000003",
            "complaint_id": "c0000001-0000-0000-0000-000000000001",
            "previous_status": "Under Review",
            "new_status": "Assigned",
            "remarks": "Assigned to Electricity Department (Venkatesh Murthy, Lineman).",
            "proof_url": None,
            "updated_by_name": "Admin User",
            "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
        },
        {
            "id": "h0000004",
            "complaint_id": "c0000002-0000-0000-0000-000000000002",
            "previous_status": None,
            "new_status": "Submitted",
            "remarks": "Complaint submitted via GramSeva WhatsApp Bot.",
            "proof_url": None,
            "updated_by_name": "Lakshmi Devi (WhatsApp)",
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "id": "h0000005",
            "complaint_id": "c0000002-0000-0000-0000-000000000002",
            "previous_status": "Submitted",
            "new_status": "In Progress",
            "remarks": "Emergency team deployed on site. Water tanker arranged.",
            "proof_url": None,
            "updated_by_name": "Anand Gowda",
            "created_at": (datetime.utcnow() - timedelta(hours=4)).isoformat()
        },
        {
            "id": "h0000006",
            "complaint_id": "c0000003-0000-0000-0000-000000000003",
            "previous_status": None,
            "new_status": "Submitted",
            "remarks": "Submitted via Citizen Web Portal.",
            "proof_url": None,
            "updated_by_name": "Basavaraj Patil",
            "created_at": (datetime.utcnow() - timedelta(days=7)).isoformat()
        },
        {
            "id": "h0000007",
            "complaint_id": "c0000003-0000-0000-0000-000000000003",
            "previous_status": "In Progress",
            "new_status": "Resolved",
            "remarks": "All solid waste cleared. Area disinfected with bleaching powder. Photo proof submitted.",
            "proof_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
            "updated_by_name": "Suresh Kumar",
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        }
    ],
    "attachments": [
        {
            "id": "a0000001",
            "complaint_id": "c0000001-0000-0000-0000-000000000001",
            "file_name": "broken_streetlight_ward3.jpg",
            "file_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
            "file_type": "image/jpeg",
            "attachment_type": "complaint",
            "uploaded_at": (datetime.utcnow() - timedelta(days=3)).isoformat()
        },
        {
            "id": "a0000002",
            "complaint_id": "c0000002-0000-0000-0000-000000000002",
            "file_name": "pipe_burst_flooding.jpg",
            "file_url": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80",
            "file_type": "image/jpeg",
            "attachment_type": "complaint",
            "uploaded_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "id": "a0000003",
            "complaint_id": "c0000003-0000-0000-0000-000000000003",
            "file_name": "garbage_pile_market.jpg",
            "file_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
            "file_type": "image/jpeg",
            "attachment_type": "complaint",
            "uploaded_at": (datetime.utcnow() - timedelta(days=7)).isoformat()
        },
        {
            "id": "a0000004",
            "complaint_id": "c0000003-0000-0000-0000-000000000003",
            "file_name": "resolved_market_clean.jpg",
            "file_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
            "file_type": "image/jpeg",
            "attachment_type": "resolution",
            "uploaded_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        }
    ],
    "whatsapp_conversations": {},
    "whatsapp_messages": [],
    "notifications": [],
    "admin_memberships": [
        {
            "id": "a0000001-0000-0000-0000-000000000001",
            "user_id": "u0000001-0000-0000-0000-000000000001",
            "email": "admin@gramseva.gov.in",
            "full_name": "Panchayat Development Officer (PDO)",
            "role": "primary_admin",
            "department_id": "d0000005-0000-0000-0000-000000000005",
            "department_name": "General Administration",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$c2VjdXJlX2dyYW1zZXZh$07851d7b3225ce8d56b0dcf867d74f2ca539423528bfe75f7dfa7732a904faea",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=30)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=30)).isoformat()
        },
        {
            "id": "a0000003-0000-0000-0000-000000000003",
            "user_id": "u0000003-0000-0000-0000-000000000003",
            "email": "sanitation.officer@gramseva.gov.in",
            "employee_id": "SAN-OFF-001",
            "full_name": "Sri. Somanna (Sanitation Officer)",
            "role": "department_officer",
            "department_id": "d0000001-0000-0000-0000-000000000001",
            "department_name": "Sanitation",
            "department_code": "SAN",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$274ca2ebf7573f5b6b983f654b144ba5$571207b91d59dca81f1084347594309b340bf5947fc06f5f0c294a100cb1af08",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        },
        {
            "id": "a0000004-0000-0000-0000-000000000004",
            "user_id": "u0000004-0000-0000-0000-000000000004",
            "email": "pwd.officer@gramseva.gov.in",
            "employee_id": "PWD-OFF-002",
            "full_name": "Sri. Suresh Gowda (Junior Engineer PWD)",
            "role": "department_officer",
            "department_id": "d0000002-0000-0000-0000-000000000002",
            "department_name": "Public Works",
            "department_code": "PWD",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$9df0be5d56ac1ab8f897ec6b889dc327$1dfc3c0ce48602d984fe1a7fa4b44f225ce3bfc24bdfd3464305da221ba1d10a",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        },
        {
            "id": "a0000005-0000-0000-0000-000000000005",
            "user_id": "u0000005-0000-0000-0000-000000000005",
            "email": "water.officer@gramseva.gov.in",
            "employee_id": "WTR-OFF-003",
            "full_name": "Smt. Kavitha Reddy (Water Supply Inspector)",
            "role": "department_officer",
            "department_id": "d0000003-0000-0000-0000-000000000003",
            "department_name": "Water Supply",
            "department_code": "WTR",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$1a4504773a825bfcf60fcb891d4e46fd$ab311300fbcebc1f3a675af0e880d91c5357c499883896ddba881ffeda91e7b9",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        },
        {
            "id": "a0000006-0000-0000-0000-000000000006",
            "user_id": "u0000006-0000-0000-0000-000000000006",
            "email": "electricity.officer@gramseva.gov.in",
            "employee_id": "ELE-OFF-004",
            "full_name": "Sri. Venkatesh Murthy (Lineman/BESCOM)",
            "role": "department_officer",
            "department_id": "d0000004-0000-0000-0000-000000000004",
            "department_name": "Electricity",
            "department_code": "ELE",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$c1a6f14e588d7f53936400fd47c83bc9$14620560a2213d49b8bb82bf120840959268ac7ad05df832c68645e46e365da4",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        },
        {
            "id": "a0000007-0000-0000-0000-000000000007",
            "user_id": "u0000007-0000-0000-0000-000000000007",
            "email": "admin.officer@gramseva.gov.in",
            "employee_id": "ADM-OFF-005",
            "full_name": "Sri. Chandrashekar (Panchayat Secretary)",
            "role": "department_officer",
            "department_id": "d0000005-0000-0000-0000-000000000005",
            "department_name": "General Administration",
            "department_code": "ADM",
            "status": "active",
            "password_hash": "pbkdf2_sha256$100000$7e2eb97ffa085c6d55926bb79029de12$fc46e07bc5f615bff71cccf628df06fa936406a4513104fef830d361d8898b04",
            "invited_by": "System Initializer",
            "is_email_verified": True,
            "last_login_at": None,
            "created_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "updated_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        }
    ],
    "admin_login_challenges": [],
    "admin_invitations": [],
    "admin_password_resets": [],
    "admin_audit_logs": []
}

import threading

_seq_counter = 1007
_seq_lock = threading.Lock()

# Live Supabase client initialization (if credentials are provided)
supabase_client = None
if settings.is_supabase_configured:
    try:
        from supabase import create_client, Client
        key_to_use = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        supabase_client: Client = create_client(settings.SUPABASE_URL, key_to_use)
        print("Connected to Supabase PostgreSQL at", settings.SUPABASE_URL)
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {e}. Falling back to demo data store.")
        supabase_client = None


def _sync_tracking_id_counter():
    """
    Synchronizes _seq_counter with the highest existing tracking_id across
    Supabase and the in-memory repository to guarantee uniqueness and prevent 23505 violations.
    """
    global _seq_counter
    current_year = datetime.utcnow().strftime("%Y")
    prefix = f"GS-{current_year}-"
    highest = _seq_counter

    # 1. Inspect in-memory demo store
    for c in _DEMO_STORE.get("complaints", []):
        tid = str(c.get("tracking_id", "")).strip()
        if tid.startswith(prefix):
            suffix = tid[len(prefix):]
            if suffix.isdigit():
                val = int(suffix)
                if val >= highest:
                    highest = val + 1

    # 2. Inspect live Supabase database
    if supabase_client:
        try:
            res = supabase_client.table("complaints").select("tracking_id").ilike("tracking_id", f"{prefix}%").execute()
            if res.data:
                for row in res.data:
                    tid = str(row.get("tracking_id", "")).strip()
                    if tid.startswith(prefix):
                        suffix = tid[len(prefix):]
                        if suffix.isdigit():
                            val = int(suffix)
                            if val >= highest:
                                highest = val + 1
        except Exception as e:
            print(f"Notice: Could not sync tracking ID sequence from Supabase: {e}")

    _seq_counter = highest
    print(f"GramSeva tracking ID sequence initialized at: {prefix}{_seq_counter}")


# Synchronize sequence on load
try:
    _sync_tracking_id_counter()
except Exception:
    pass


def get_next_tracking_id() -> str:
    """
    Generates a guaranteed unique sequential tracking ID e.g. 'GS-2026-1012'.
    Thread-safe and synchronized with live PostgreSQL.
    """
    global _seq_counter
    with _seq_lock:
        current_year = datetime.utcnow().strftime("%Y")
        prefix = f"GS-{current_year}-"
        tid = f"{prefix}{_seq_counter}"
        _seq_counter += 1
        return tid


def get_db():
    """
    Returns the Supabase client if configured, or None to signal using the built-in demo data repository.
    """
    return supabase_client


def get_demo_store():
    return _DEMO_STORE
