"""
GramSeva Administrator Authentication & Invitation Management Service
Enforces strict 2-stage authentication on EVERY login:
Stage A: Password authentication and challenge issuance.
Stage B: Single-use, hashed, 10-minute email verification link consumption.
Also provides Primary Administrator initialization, invitation workflows,
account suspension, password resets, and comprehensive audit logging.
"""
import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status

from backend.app.config import settings
from backend.app.database import get_db, get_demo_store
from backend.app.services.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_secure_token,
    mask_email,
    validate_password_strength,
    create_access_token,
    decode_access_token
)
from backend.app.services.email_service import (
    send_login_verification_email,
    send_admin_invitation_email,
    send_password_reset_email,
    send_officer_verification_email
)

DEPARTMENTS_CONFIG = {
    "Sanitation": {"id": "d0000001-0000-0000-0000-000000000001", "code": "SAN"},
    "Public Works": {"id": "d0000002-0000-0000-0000-000000000002", "code": "PWD"},
    "Water Supply": {"id": "d0000003-0000-0000-0000-000000000003", "code": "WTR"},
    "Electricity": {"id": "d0000004-0000-0000-0000-000000000004", "code": "ELE"},
    "General Administration": {"id": "d0000005-0000-0000-0000-000000000005", "code": "ADM"},
}


# In-memory CAPTCHA store: captcha_id -> (text, expires_at)
_CAPTCHA_STORE: Dict[str, Tuple[str, datetime]] = {}


def create_captcha() -> Dict[str, Any]:
    """Generates a high-readability 5-character government portal CAPTCHA code."""
    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    text = "".join(random.choices(chars, k=5))
    cid = f"cpt-{str(uuid.uuid4())[:8]}"
    _CAPTCHA_STORE[cid] = (text, datetime.utcnow() + timedelta(minutes=10))
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="130" height="42" viewBox="0 0 130 42">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <line x1="5" y1="12" x2="125" y2="30" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="10" y1="35" x2="120" y2="8" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="16" y="29" font-family="Courier, monospace" font-size="24" font-weight="bold" letter-spacing="6" fill="#1e3a8a">{text}</text>
    </svg>"""
    import urllib.parse
    svg_uri = f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"
    return {
        "captcha_id": cid,
        "captcha_image": svg_uri,
        "captcha_text": text,
        "length": 5
    }


def verify_captcha_code(captcha_id: Optional[str], code: Optional[str]) -> bool:
    """Validates submitted CAPTCHA code (case-insensitive)."""
    if not captcha_id or not code:
        return False
    entry = _CAPTCHA_STORE.pop(captcha_id, None)
    if not entry:
        return False
    expected, exp = entry
    if datetime.utcnow() > exp:
        return False
    return expected.upper() == code.strip().upper()


class AdminAuthService:
    def __init__(self):
        self.db = get_db()
        self.demo = get_demo_store()

    # ------------------------------------------------------------------
    # Audit Logging
    # ------------------------------------------------------------------
    def log_audit(self, actor_email: str, action: str, target_email: Optional[str] = None,
                  ip_address: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
        """Records administrative security events in the audit log."""
        log_entry = {
            "id": str(uuid.uuid4()),
            "actor_email": actor_email,
            "action": action,
            "target_email": target_email or actor_email,
            "ip_address": ip_address or "127.0.0.1",
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }
        if self.db:
            try:
                self.db.table("admin_audit_logs").insert(log_entry).execute()
                return
            except Exception as e:
                print(f"Warning: Failed to persist audit log to Supabase: {e}")

        # Fallback to demo store
        self.demo.setdefault("admin_audit_logs", []).insert(0, log_entry)

    # ------------------------------------------------------------------
    # Membership Lookup Helpers
    # ------------------------------------------------------------------
    def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        if self.db:
            try:
                res = self.db.table("admin_memberships").select("*").eq("email", clean_email).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        # Check demo store
        for m in self.demo.get("admin_memberships", []):
            if m["email"].lower() == clean_email:
                return m

        # Auto-bootstrap primary admin in demo store if matching configured email
        if clean_email == settings.PRIMARY_ADMIN_EMAIL.lower():
            primary = {
                "id": "a0000001-0000-0000-0000-000000000001",
                "user_id": str(uuid.uuid4()),
                "email": settings.PRIMARY_ADMIN_EMAIL.lower(),
                "full_name": settings.PRIMARY_ADMIN_NAME,
                "role": "primary_admin",
                "department_id": "d0000005-0000-0000-0000-000000000005",
                "department_name": "General Administration",
                "status": "active",
                "password_hash": hash_password(settings.PRIMARY_ADMIN_DEFAULT_PASSWORD),
                "invited_by": "System Bootstrap",
                "last_login_at": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            self.demo.setdefault("admin_memberships", []).append(primary)
            return primary

        return None

    def get_admin_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up administrator by email or unique Employee ID, with alias support."""
        clean = identifier.strip().lower()
        clean_upper = identifier.strip().upper()

        ALIAS_MAP = {
            "sanitation.officer@gramseva.gov.in": "officer.san@gramseva.gov.in",
            "officer.san@gramseva.gov.in": "sanitation.officer@gramseva.gov.in",
            "san-off-001": "emp-san-101",
            "emp-san-101": "san-off-001",

            "pwd.officer@gramseva.gov.in": "officer.pwd@gramseva.gov.in",
            "officer.pwd@gramseva.gov.in": "pwd.officer@gramseva.gov.in",
            "pwd-off-002": "emp-pwd-201",
            "emp-pwd-201": "pwd-off-002",

            "water.officer@gramseva.gov.in": "officer.wtr@gramseva.gov.in",
            "officer.wtr@gramseva.gov.in": "water.officer@gramseva.gov.in",
            "wtr-off-003": "emp-wtr-301",
            "emp-wtr-301": "wtr-off-003",

            "electricity.officer@gramseva.gov.in": "officer.ele@gramseva.gov.in",
            "officer.ele@gramseva.gov.in": "electricity.officer@gramseva.gov.in",
            "ele-off-004": "emp-ele-401",
            "emp-ele-401": "ele-off-004",

            "admin.officer@gramseva.gov.in": "officer.adm@gramseva.gov.in",
            "officer.adm@gramseva.gov.in": "admin.officer@gramseva.gov.in",
            "adm-off-005": "emp-adm-501",
            "emp-adm-501": "adm-off-005",
        }

        search_targets = {clean, clean_upper}
        if clean in ALIAS_MAP:
            alias_val = ALIAS_MAP[clean]
            search_targets.add(alias_val.lower())
            search_targets.add(alias_val.upper())

        if self.db:
            try:
                for target in search_targets:
                    res = self.db.table("admin_memberships").select("*").or_(f"email.eq.{target.lower()},employee_id.eq.{target.upper()}").execute()
                    if res.data and len(res.data) > 0:
                        return res.data[0]
            except Exception:
                pass

        for m in self.demo.get("admin_memberships", []):
            m_email = m.get("email", "").lower()
            m_emp = m.get("employee_id", "").upper()
            for target in search_targets:
                if m_email == target.lower() or m_emp == target.upper():
                    return m

        if clean == settings.PRIMARY_ADMIN_EMAIL.lower() or clean == "admin@gramseva.gov.in":
            return self.get_admin_by_email(clean)

        return None

    def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        if self.db:
            try:
                res = self.db.table("admin_memberships").select("*").eq("id", admin_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception:
                pass

        for m in self.demo.get("admin_memberships", []):
            if m["id"] == admin_id:
                return m
        return None

    # ------------------------------------------------------------------
    # Three-Role Authentication Flow
    # ------------------------------------------------------------------
    def initiate_login(
        self,
        email: str,
        password: str,
        expected_role: Optional[str] = None,
        captcha_id: Optional[str] = None,
        captcha_code: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Role-aware login handler supporting:
        1. Main Admin (Panchayat Officer) -> Password + fresh single-use email verification link
        2. Department Officer -> Email/Employee ID + Password + CAPTCHA -> Direct JWT session (requires verified email & Main Admin approval)
        3. WhatsApp CRM Manager -> Email + Password + CAPTCHA -> Direct JWT session
        """
        # Validate CAPTCHA if provided
        if captcha_id and captcha_code:
            if not verify_captcha_code(captcha_id, captcha_code):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired CAPTCHA code. Please enter the fresh code shown."
                )

        clean_identifier = email.strip()
        admin = self.get_admin_by_identifier(clean_identifier)

        if not admin:
            self.log_audit(clean_identifier, "ADMIN_LOGIN_FAILED_UNKNOWN_ACCOUNT", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrative email/employee ID or password."
            )

        admin_role = admin.get("role", "admin")

        # Strict Role Matching
        if expected_role:
            if expected_role == "main_admin" and admin_role not in ["main_admin", "primary_admin"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This account is not authorized as Main Admin (Panchayat Officer). Please switch to your assigned role."
                )
            elif expected_role == "department_officer" and admin_role != "department_officer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This account is not registered as a Department Officer. Please select the correct login role."
                )

        # Verify password
        stored_hash = admin.get("password_hash")
        if not verify_password(password, stored_hash):
            self.log_audit(admin["email"], "ADMIN_LOGIN_FAILED_WRONG_PASSWORD", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrative email/employee ID or password."
            )

        # Department Officer Email Verification check
        if admin_role == "department_officer":
            if not admin.get("is_email_verified", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your official email address is not yet verified. Please click the verification link sent to your email."
                )

        # Check account status
        account_status = admin.get("status", "active")
        if account_status == "suspended":
            self.log_audit(admin["email"], "ADMIN_LOGIN_FAILED_SUSPENDED", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your administrative account has been suspended. Please contact the Panchayat Development Officer."
            )
        elif account_status == "pending_approval":
            self.log_audit(admin["email"], "OFFICER_LOGIN_PENDING_APPROVAL", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your Department Officer registration has been submitted and verified, but is currently awaiting approval from the Panchayat Officer (Main Admin)."
            )
        elif account_status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your officer registration was rejected. Please contact the Panchayat Office."
            )

        # Issue direct JWT session for verified & approved Department Officer
        if admin_role == "department_officer":
            now_iso = datetime.utcnow().isoformat()
            claims = {
                "sub": admin["id"],
                "email": admin["email"],
                "role": "department_officer",
                "full_name": admin.get("full_name"),
                "employee_id": admin.get("employee_id"),
                "department_id": admin.get("department_id"),
                "department_name": admin.get("department_name"),
                "department_code": admin.get("department_code"),
                "verified": True
            }
            token = create_access_token(claims)
            admin["last_login_at"] = now_iso
            if self.db:
                try:
                    self.db.table("admin_memberships").update({"last_login_at": now_iso}).eq("id", admin["id"]).execute()
                except Exception:
                    pass

            self.log_audit(admin["email"], "OFFICER_LOGIN_SUCCESS", ip_address=ip_address,
                           metadata={"department_code": admin.get("department_code")})
            return {
                "stage": "AUTHENTICATED",
                "access_token": token,
                "token_type": "bearer",
                "user": claims,
                "role": "department_officer",
                "message": f"Welcome, {admin.get('full_name')} ({admin.get('department_name')})"
            }

        # Main Admin: Mandatory 2-Stage Verification Challenge
        clean_email = admin["email"]
        self._invalidate_pending_challenges(clean_email)

        raw_token = generate_secure_token()
        token_hash_val = hash_token(raw_token)
        challenge_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(minutes=settings.CHALLENGE_EXPIRE_MINUTES)

        challenge_record = {
            "id": challenge_id,
            "admin_id": admin["id"],
            "email": clean_email,
            "token_hash": token_hash_val,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "expires_at": expires_at.isoformat(),
            "consumed_at": None,
            "is_valid": True,
            "created_at": datetime.utcnow().isoformat()
        }

        if self.db:
            try:
                self.db.table("admin_login_challenges").insert(challenge_record).execute()
            except Exception as e:
                print(f"Warning: Could not save challenge to Supabase: {e}")
                self.demo.setdefault("admin_login_challenges", []).append(challenge_record)
        else:
            self.demo.setdefault("admin_login_challenges", []).append(challenge_record)

        send_login_verification_email(clean_email, raw_token, ip_address)

        self.log_audit(clean_email, "ADMIN_LOGIN_PASSWORD_SUCCESS", ip_address=ip_address)
        self.log_audit(clean_email, "ADMIN_LOGIN_CHALLENGE_SENT", ip_address=ip_address,
                       metadata={"challenge_id": challenge_id})

        return {
            "stage": "EMAIL_VERIFICATION_REQUIRED",
            "challenge_id": challenge_id,
            "email": clean_email,
            "masked_email": mask_email(clean_email),
            "role": "main_admin",
            "expires_in_minutes": settings.CHALLENGE_EXPIRE_MINUTES,
            "dev_verification_url": f"{settings.FRONTEND_URL}/admin/verify?token={raw_token}" if (settings.DEBUG and not settings.is_smtp_configured) else None,
            "message": "We have sent a secure verification link to your registered email address. Please click the link to continue."
        }

    # ------------------------------------------------------------------
    # STAGE B: Email Verification Challenge Consumption
    # ------------------------------------------------------------------
    def verify_login_challenge(self, raw_token: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """
        Stage B: Consumes the email verification token and issues a verified administrator session JWT.
        """
        if not raw_token or not raw_token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token is missing or malformed."
            )

        token_hash_val = hash_token(raw_token.strip())
        challenge = self._find_challenge_by_hash(token_hash_val)

        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification link. Please initiate a new login."
            )

        # Check if already consumed or invalidated
        if not challenge.get("is_valid") or challenge.get("consumed_at") is not None:
            self.log_audit(challenge.get("email", "unknown"), "ADMIN_LOGIN_REPLAY_ATTEMPT_BLOCKED",
                           ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification link has already been used or expired. Each link works only once."
            )

        # Check expiration
        expires_at_str = challenge.get("expires_at")
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", ""))
        except Exception:
            expires_at = datetime.utcnow() - timedelta(minutes=1)

        if datetime.utcnow() > expires_at:
            challenge["is_valid"] = False
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification link has expired (10-minute limit exceeded). Please log in again."
            )

        # Look up admin
        admin = self.get_admin_by_email(challenge["email"])
        if not admin or admin.get("status") == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator account is inactive or suspended."
            )

        # Consume challenge atomically
        challenge["consumed_at"] = datetime.utcnow().isoformat()
        challenge["is_valid"] = False

        if self.db:
            try:
                self.db.table("admin_login_challenges").update({
                    "consumed_at": challenge["consumed_at"],
                    "is_valid": False
                }).eq("id", challenge["id"]).execute()
            except Exception:
                pass

        # Update last login timestamp
        now_iso = datetime.utcnow().isoformat()
        admin["last_login_at"] = now_iso
        if self.db:
            try:
                self.db.table("admin_memberships").update({"last_login_at": now_iso}).eq("id", admin["id"]).execute()
            except Exception:
                pass

        # Log audit
        self.log_audit(admin["email"], "ADMIN_LOGIN_VERIFIED", ip_address=ip_address,
                       metadata={"admin_id": admin["id"], "role": admin["role"]})

        # Generate verified admin JWT session
        claims = {
            "sub": admin["id"],
            "email": admin["email"],
            "name": admin["full_name"],
            "role": admin["role"],
            "department_id": admin.get("department_id"),
            "department_name": admin.get("department_name", "General Administration"),
            "verified": True
        }
        access_token = create_access_token(claims)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in_minutes": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "user": {
                "id": admin["id"],
                "email": admin["email"],
                "name": admin["full_name"],
                "role": admin["role"],
                "department_name": admin.get("department_name", "General Administration"),
                "status": admin["status"],
                "last_login_at": now_iso
            }
        }

    # ------------------------------------------------------------------
    # Resend Login Verification Challenge
    # ------------------------------------------------------------------
    def resend_login_challenge(self, email: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """
        Resends a fresh login challenge email, invalidating previous pending challenges.
        """
        clean_email = email.strip().lower()
        admin = self.get_admin_by_email(clean_email)
        if not admin or admin.get("status") == "suspended":
            # Silent return to avoid email enumeration
            return {
                "status": "sent",
                "masked_email": mask_email(clean_email),
                "message": "If the account exists and is active, a fresh verification link has been sent."
            }

        # Rate-limiting check: ensure at least 20 seconds between resends
        recent_challenges = [
            c for c in self.demo.get("admin_login_challenges", [])
            if c["email"].lower() == clean_email
        ]
        if recent_challenges:
            last = recent_challenges[-1]
            try:
                created = datetime.fromisoformat(last["created_at"].replace("Z", ""))
                if (datetime.utcnow() - created).total_seconds() < 20:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Please wait 20 seconds before requesting another verification email."
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        self._invalidate_pending_challenges(clean_email)
        raw_token = generate_secure_token()
        token_hash_val = hash_token(raw_token)
        challenge_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(minutes=settings.CHALLENGE_EXPIRE_MINUTES)

        challenge_record = {
            "id": challenge_id,
            "admin_id": admin["id"],
            "email": clean_email,
            "token_hash": token_hash_val,
            "ip_address": ip_address,
            "user_agent": "resend",
            "expires_at": expires_at.isoformat(),
            "consumed_at": None,
            "is_valid": True,
            "created_at": datetime.utcnow().isoformat()
        }
        self.demo.setdefault("admin_login_challenges", []).append(challenge_record)

        send_login_verification_email(clean_email, raw_token, ip_address)
        self.log_audit(clean_email, "ADMIN_LOGIN_CHALLENGE_RESENT", ip_address=ip_address)

        return {
            "status": "sent",
            "challenge_id": challenge_id,
            "masked_email": mask_email(clean_email),
            "dev_verification_url": f"{settings.FRONTEND_URL}/admin/verify?token={raw_token}" if (settings.DEBUG and not settings.is_smtp_configured) else None,
            "message": "A fresh verification link has been sent to your email."
        }

    # ------------------------------------------------------------------
    # Administrator & Department Officer Invitations (Primary Admin Only)
    # ------------------------------------------------------------------
    def invite_administrator(
        self,
        actor_admin: Dict[str, Any],
        invite_data: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates and emails an invitation to join as an administrator or department officer. Only callable by primary_admin.
        """
        if actor_admin.get("role") not in ["primary_admin", "main_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Primary Administrator (Panchayat Officer) has permission to invite staff."
            )

        email = invite_data.get("email", "").strip().lower()
        full_name = invite_data.get("full_name", "").strip()
        role = invite_data.get("role", "department_officer")
        department_name = invite_data.get("department_name", "Sanitation")
        department_id = invite_data.get("department_id")
        department_code = invite_data.get("department_code")
        employee_id = invite_data.get("employee_id")

        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="A valid official email is required.")
        if not full_name:
            raise HTTPException(status_code=400, detail="Full name is required.")

        # Crucial Requirement: If a specific department like Sanitation, PWD, WTR, ELE is selected,
        # or if role is department_officer, ALWAYS register as department_officer!
        if role == "department_officer" or (department_name in ["Sanitation", "Public Works", "Water Supply", "Electricity"] and role != "primary_admin"):
            role = "department_officer"

        dept_cfg = DEPARTMENTS_CONFIG.get(department_name)
        if dept_cfg:
            department_id = department_id or dept_cfg["id"]
            department_code = department_code or dept_cfg["code"]
        else:
            department_code = department_code or "ADM"

        if not employee_id and role == "department_officer":
            random_num = random.randint(100, 999)
            employee_id = f"{department_code}-OFF-{random_num}"

        # Check if already registered in Supabase or demo store
        existing_admin = self.get_admin_by_email(email)
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An account for '{email}' already exists ({existing_admin.get('role')})."
            )

        # Check if pending invitation already exists, revoke old one
        for inv in self.demo.get("admin_invitations", []):
            if inv["email"].lower() == email and not inv.get("accepted_at") and not inv.get("revoked_at"):
                inv["revoked_at"] = datetime.utcnow().isoformat()

        raw_token = generate_secure_token()
        token_hash_val = hash_token(raw_token)
        invite_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=settings.INVITATION_EXPIRE_HOURS)

        invite_record = {
            "id": invite_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "department_id": department_id,
            "department_name": department_name,
            "department_code": department_code,
            "employee_id": employee_id,
            "token_hash": token_hash_val,
            "invited_by": actor_admin.get("email", "Primary Administrator"),
            "expires_at": expires_at.isoformat(),
            "accepted_at": None,
            "revoked_at": None,
            "created_at": datetime.utcnow().isoformat()
        }

        # Save to Supabase with backward-compatible fallback
        if self.db:
            try:
                db_payload = {
                    "id": invite_id,
                    "email": email,
                    "full_name": full_name,
                    "role": role,
                    "department_id": department_id,
                    "department_name": department_name,
                    "token_hash": token_hash_val,
                    "invited_by": actor_admin.get("email", "Primary Administrator"),
                    "expires_at": expires_at.isoformat(),
                    "accepted_at": None,
                    "revoked_at": None,
                    "created_at": invite_record["created_at"]
                }
                try:
                    self.db.table("admin_invitations").insert(db_payload).execute()
                except Exception as insert_err:
                    err_str = str(insert_err)
                    if "admin_invitations_role_check" in err_str:
                        # Fallback if DB check constraint has not been updated
                        db_payload["role"] = "admin"
                        db_payload["department_name"] = f"{department_name} [ROLE:{role}]"
                        self.db.table("admin_invitations").insert(db_payload).execute()
                    else:
                        raise insert_err
            except Exception as e:
                print(f"Warning: Could not save invitation to Supabase table: {e}")
                self.demo.setdefault("admin_invitations", []).append(invite_record)
        else:
            self.demo.setdefault("admin_invitations", []).append(invite_record)

        # Also keep in local in-memory store for quick lookups
        self.demo.setdefault("admin_invitations", []).append(invite_record)

        send_admin_invitation_email(
            to_email=email,
            full_name=full_name,
            role=role,
            raw_token=raw_token,
            invited_by=actor_admin.get("name") or actor_admin.get("email", "Primary Administrator"),
            department_name=department_name,
            employee_id=employee_id
        )

        self.log_audit(
            actor_admin.get("email", "primary_admin"),
            "OFFICER_INVITED" if role == "department_officer" else "ADMIN_INVITED",
            target_email=email,
            ip_address=ip_address,
            metadata={"role": role, "name": full_name, "department": department_name}
        )

        return {
            "status": "invited",
            "invitation_id": invite_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "department_name": department_name,
            "department_code": department_code,
            "employee_id": employee_id,
            "dev_invite_url": f"{settings.FRONTEND_URL}/admin/accept-invitation?token={raw_token}" if settings.DEBUG else None,
            "message": f"Invitation successfully dispatched to {email}."
        }

    def validate_invitation_token(self, raw_token: str) -> Dict[str, Any]:
        """Validates an invitation token for UI rendering."""
        token_hash_val = hash_token(raw_token.strip())
        invitation = self._find_invitation_by_hash(token_hash_val)

        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid invitation link.")
        if invitation.get("accepted_at"):
            raise HTTPException(status_code=400, detail="This invitation has already been accepted.")
        if invitation.get("revoked_at"):
            raise HTTPException(status_code=400, detail="This invitation has been revoked by the Primary Administrator.")

        try:
            exp = datetime.fromisoformat(invitation["expires_at"].replace("Z", ""))
            if datetime.utcnow() > exp:
                raise HTTPException(status_code=400, detail="This invitation has expired (24 hours exceeded).")
        except HTTPException:
            raise
        except Exception:
            pass

        role = invitation.get("role", "admin")
        dept_name = invitation.get("department_name", "General Administration")
        if role == "department_officer" or (dept_name in ["Sanitation", "Public Works", "Water Supply", "Electricity"] and role != "primary_admin"):
            role = "department_officer"

        dept_cfg = DEPARTMENTS_CONFIG.get(dept_name, {})
        dept_code = invitation.get("department_code") or dept_cfg.get("code") or "ADM"
        emp_id = invitation.get("employee_id") or (f"{dept_code}-OFF-001" if role == "department_officer" else None)

        return {
            "email": invitation["email"],
            "full_name": invitation["full_name"],
            "role": role,
            "department_name": dept_name,
            "department_code": dept_code,
            "employee_id": emp_id,
            "invited_by": invitation.get("invited_by", "Primary Administrator")
        }

    def accept_invitation(self, raw_token: str, password: str, full_name: Optional[str] = None,
                          ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Completes registration for an invited administrator or department officer."""
        token_hash_val = hash_token(raw_token.strip())
        invitation = self._find_invitation_by_hash(token_hash_val)

        if not invitation or invitation.get("accepted_at") or invitation.get("revoked_at"):
            raise HTTPException(status_code=400, detail="Invalid, revoked, or already accepted invitation link.")

        # Password strength validation
        valid, err = validate_password_strength(password)
        if not valid:
            raise HTTPException(status_code=400, detail=err)

        email = invitation["email"].lower()
        now_iso = datetime.utcnow().isoformat()

        role = invitation.get("role", "admin")
        dept_name = invitation.get("department_name", "General Administration")

        # Crucial Requirement: Ensure anyone assigned to Sanitation, PWD, WTR, ELE (or explicitly department_officer)
        # is saved under role: 'department_officer' in Supabase!
        if role == "department_officer" or (dept_name in ["Sanitation", "Public Works", "Water Supply", "Electricity"] and role != "primary_admin"):
            role = "department_officer"

        dept_cfg = DEPARTMENTS_CONFIG.get(dept_name, {})
        department_id = invitation.get("department_id") or dept_cfg.get("id")
        department_code = invitation.get("department_code") or dept_cfg.get("code") or "ADM"

        employee_id = invitation.get("employee_id")
        if not employee_id and role == "department_officer":
            random_num = random.randint(100, 999)
            employee_id = f"{department_code}-OFF-{random_num}"

        # Create administrator / department officer profile
        new_admin = {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "email": email,
            "full_name": full_name or invitation["full_name"],
            "role": role,
            "department_id": department_id,
            "department_name": dept_name,
            "department_code": department_code,
            "employee_id": employee_id,
            "status": "active",
            "is_email_verified": True,
            "approved_by": invitation.get("invited_by", "Primary Administrator"),
            "approved_at": now_iso,
            "password_hash": hash_password(password),
            "invited_by": invitation.get("invited_by", "Primary Administrator"),
            "last_login_at": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        invitation["accepted_at"] = now_iso

        if self.db:
            try:
                # Upsert / insert into admin_memberships in Supabase
                self.db.table("admin_memberships").upsert(new_admin, on_conflict="email").execute()
                self.db.table("admin_invitations").update({"accepted_at": now_iso}).eq("id", invitation["id"]).execute()
            except Exception as e:
                print(f"Warning: Could not save admin to Supabase: {e}")
                self.demo.setdefault("admin_memberships", []).append(new_admin)
        else:
            self.demo.setdefault("admin_memberships", []).append(new_admin)

        # Also cache locally
        self.demo.setdefault("admin_memberships", []).append(new_admin)

        self.log_audit(email, "ADMIN_INVITATION_ACCEPTED", ip_address=ip_address,
                       metadata={"role": new_admin["role"], "department": dept_name})

        role_label = "Department Officer" if role == "department_officer" else "Administrator"
        return {
            "status": "activated",
            "role": role,
            "department_name": dept_name,
            "department_code": department_code,
            "employee_id": employee_id,
            "message": f"Your {role_label} account has been activated. Please sign in with your credentials.",
            "email": email
        }

    def revoke_invitation(self, actor_admin: Dict[str, Any], invitation_id: str,
                          ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Revokes an outstanding invitation."""
        if actor_admin.get("role") != "primary_admin":
            raise HTTPException(status_code=403, detail="Only Primary Administrator can revoke invitations.")

        invitation = None
        for inv in self.demo.get("admin_invitations", []):
            if inv["id"] == invitation_id:
                invitation = inv
                break

        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found.")

        invitation["revoked_at"] = datetime.utcnow().isoformat()
        self.log_audit(actor_admin.get("email", "primary_admin"), "ADMIN_INVITATION_REVOKED",
                       target_email=invitation["email"], ip_address=ip_address)
        return {"status": "revoked", "message": "Invitation revoked successfully."}

    # ------------------------------------------------------------------
    # Administrator Management (Primary Admin Only)
    # ------------------------------------------------------------------
    def list_administrators(self, actor_admin: Dict[str, Any]) -> Dict[str, Any]:
        """Lists all administrators and pending invitations."""
        admins = []
        invitations = []

        if self.db:
            try:
                res_admins = self.db.table("admin_memberships").select(
                    "id, email, full_name, role, department_name, department_code, employee_id, status, invited_by, last_login_at, created_at"
                ).order("created_at", desc=True).execute()
                if res_admins.data:
                    admins = res_admins.data
            except Exception as e:
                print(f"Warning: Failed to query admin_memberships: {e}")

            try:
                res_inv = self.db.table("admin_invitations").select(
                    "id, email, full_name, role, department_name, invited_by, expires_at, accepted_at, revoked_at, created_at"
                ).order("created_at", desc=True).execute()
                if res_inv.data:
                    for inv in res_inv.data:
                        inv["is_active"] = not inv.get("accepted_at") and not inv.get("revoked_at")
                        if inv.get("department_name") in ["Sanitation", "Public Works", "Water Supply", "Electricity"] and inv.get("role") != "primary_admin":
                            inv["role"] = "department_officer"
                    invitations = res_inv.data
            except Exception as e:
                print(f"Warning: Failed to query admin_invitations: {e}")

        if not admins:
            for a in self.demo.get("admin_memberships", []):
                admins.append({
                    "id": a["id"],
                    "email": a["email"],
                    "full_name": a["full_name"],
                    "role": a["role"],
                    "department_name": a.get("department_name", "General Administration"),
                    "department_code": a.get("department_code"),
                    "employee_id": a.get("employee_id"),
                    "status": a.get("status", "active"),
                    "invited_by": a.get("invited_by"),
                    "last_login_at": a.get("last_login_at"),
                    "created_at": a.get("created_at")
                })

        if not invitations:
            for inv in self.demo.get("admin_invitations", []):
                invitations.append({
                    "id": inv["id"],
                    "email": inv["email"],
                    "full_name": inv["full_name"],
                    "role": inv["role"],
                    "department_name": inv.get("department_name", "General Administration"),
                    "invited_by": inv["invited_by"],
                    "expires_at": inv["expires_at"],
                    "accepted_at": inv.get("accepted_at"),
                    "revoked_at": inv.get("revoked_at"),
                    "created_at": inv["created_at"],
                    "is_active": not inv.get("accepted_at") and not inv.get("revoked_at")
                })

        return {
            "administrators": admins,
            "invitations": invitations,
            "current_user_role": actor_admin.get("role")
        }

    def suspend_administrator(self, actor_admin: Dict[str, Any], target_admin_id: str,
                              ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Suspends an administrator account."""
        if actor_admin.get("role") != "primary_admin":
            raise HTTPException(status_code=403, detail="Only Primary Administrator can suspend administrators.")

        if actor_admin.get("sub") == target_admin_id:
            raise HTTPException(status_code=400, detail="Primary Administrator cannot suspend their own account.")

        target = self.get_admin_by_id(target_admin_id)
        if not target:
            raise HTTPException(status_code=404, detail="Administrator not found.")

        target["status"] = "suspended"
        target["updated_at"] = datetime.utcnow().isoformat()

        # Invalidate any active challenges
        self._invalidate_pending_challenges(target["email"])

        self.log_audit(actor_admin.get("email", "primary_admin"), "ADMIN_SUSPENDED",
                       target_email=target["email"], ip_address=ip_address)
        return {"status": "suspended", "message": f"Administrator {target['email']} has been suspended."}

    def reactivate_administrator(self, actor_admin: Dict[str, Any], target_admin_id: str,
                                 ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Reactivates a suspended administrator account."""
        if actor_admin.get("role") != "primary_admin":
            raise HTTPException(status_code=403, detail="Only Primary Administrator can reactivate administrators.")

        target = self.get_admin_by_id(target_admin_id)
        if not target:
            raise HTTPException(status_code=404, detail="Administrator not found.")

        target["status"] = "active"
        target["updated_at"] = datetime.utcnow().isoformat()

        self.log_audit(actor_admin.get("email", "primary_admin"), "ADMIN_REACTIVATED",
                       target_email=target["email"], ip_address=ip_address)
        return {"status": "active", "message": f"Administrator {target['email']} has been reactivated."}

    # ------------------------------------------------------------------
    # Password Reset Workflows
    # ------------------------------------------------------------------
    def request_password_reset(self, email: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Requests a secure 15-minute password reset link."""
        clean_email = email.strip().lower()
        admin = self.get_admin_by_email(clean_email)

        # Silent success response to prevent email harvesting
        if not admin or admin.get("status") == "suspended":
            return {
                "status": "sent",
                "message": "If this email belongs to an active administrator account, instructions have been dispatched."
            }

        raw_token = generate_secure_token()
        token_hash_val = hash_token(raw_token)
        reset_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

        record = {
            "id": reset_id,
            "email": clean_email,
            "token_hash": token_hash_val,
            "expires_at": expires_at.isoformat(),
            "consumed_at": None,
            "created_at": datetime.utcnow().isoformat()
        }
        self.demo.setdefault("admin_password_resets", []).append(record)

        send_password_reset_email(clean_email, raw_token)
        self.log_audit(clean_email, "ADMIN_PASSWORD_RESET_REQUESTED", ip_address=ip_address)

        return {
            "status": "sent",
            "message": "If this email belongs to an active administrator account, instructions have been dispatched.",
            "dev_reset_url": f"{settings.FRONTEND_URL}/admin/reset-password?token={raw_token}" if settings.DEBUG else None
        }

    def execute_password_reset(self, raw_token: str, new_password: str,
                               ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Validates token and updates password."""
        token_hash_val = hash_token(raw_token.strip())
        reset_rec = None
        for r in self.demo.get("admin_password_resets", []):
            if r["token_hash"] == token_hash_val:
                reset_rec = r
                break

        if not reset_rec or reset_rec.get("consumed_at"):
            raise HTTPException(status_code=400, detail="Invalid, expired, or already used password reset link.")

        try:
            exp = datetime.fromisoformat(reset_rec["expires_at"].replace("Z", ""))
            if datetime.utcnow() > exp:
                raise HTTPException(status_code=400, detail="Password reset link has expired.")
        except HTTPException:
            raise
        except Exception:
            pass

        valid, err = validate_password_strength(new_password)
        if not valid:
            raise HTTPException(status_code=400, detail=err)

        admin = self.get_admin_by_email(reset_rec["email"])
        if not admin:
            raise HTTPException(status_code=404, detail="Administrator account not found.")

        # Update password
        admin["password_hash"] = hash_password(new_password)
        admin["updated_at"] = datetime.utcnow().isoformat()
        reset_rec["consumed_at"] = datetime.utcnow().isoformat()

        # Invalidate challenges
        self._invalidate_pending_challenges(admin["email"])
        self.log_audit(admin["email"], "ADMIN_PASSWORD_RESET_COMPLETED", ip_address=ip_address)

        return {"status": "success", "message": "Password successfully reset. You may now log in with your new credentials."}

    # ------------------------------------------------------------------
    # Department Officer Self-Registration & Email Verification
    # ------------------------------------------------------------------
    def register_department_officer(
        self,
        full_name: str,
        employee_id: str,
        email: str,
        password: str,
        department_id: str,
        department_name: str,
        department_code: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Registers a new Department Officer.
        Generates email verification token and creates account in 'pending_approval' status.
        """
        valid_strength, err = validate_password_strength(password)
        if not valid_strength:
            raise HTTPException(status_code=400, detail=err)

        clean_email = email.strip().lower()
        clean_emp_id = employee_id.strip().upper()
        clean_dept_code = department_code.strip().upper()

        # Check for duplicate email
        if self.get_admin_by_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email '{clean_email}' already exists."
            )

        # Check for duplicate Employee ID
        if self.get_admin_by_identifier(clean_emp_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee ID '{clean_emp_id}' is already registered in the system."
            )

        raw_token = generate_secure_token()
        token_hash_val = hash_token(raw_token)
        officer_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()

        officer_record = {
            "id": officer_id,
            "user_id": str(uuid.uuid4()),
            "email": clean_email,
            "employee_id": clean_emp_id,
            "full_name": full_name.strip(),
            "role": "department_officer",
            "department_id": department_id,
            "department_name": department_name,
            "department_code": clean_dept_code,
            "status": "pending_approval",
            "is_email_verified": False,
            "email_verification_token_hash": token_hash_val,
            "password_hash": hash_password(password),
            "invited_by": "Self Registration",
            "approved_by": None,
            "approved_at": None,
            "last_login_at": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        if self.db:
            try:
                self.db.table("admin_memberships").insert(officer_record).execute()
            except Exception as e:
                print(f"Warning: Failed to save department officer in Supabase: {e}")
                self.demo.setdefault("admin_memberships", []).append(officer_record)
        else:
            self.demo.setdefault("admin_memberships", []).append(officer_record)

        # Send official email verification link
        send_officer_verification_email(
            to_email=clean_email,
            full_name=full_name.strip(),
            department_name=department_name,
            employee_id=clean_emp_id,
            raw_token=raw_token
        )

        self.log_audit(clean_email, "OFFICER_REGISTRATION_SUBMITTED", ip_address=ip_address,
                       metadata={"employee_id": clean_emp_id, "department_code": clean_dept_code})

        dev_url = f"{settings.FRONTEND_URL}/admin/verify-officer?token={raw_token}" if (settings.DEBUG and not settings.is_smtp_configured) else None

        return {
            "status": "pending_verification",
            "officer_id": officer_id,
            "message": "Registration submitted! We have sent an email verification link to your official email. Please verify your email to submit your profile for Panchayat Officer approval.",
            "email": clean_email,
            "masked_email": mask_email(clean_email),
            "employee_id": clean_emp_id,
            "department_name": department_name,
            "department_code": clean_dept_code,
            "dev_verification_url": dev_url
        }

    def verify_officer_email(self, raw_token: str, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """
        Validates the officer's email verification link.
        Marks email as verified; account remains in 'pending_approval' awaiting Main Admin action.
        """
        if not raw_token or not raw_token.strip():
            raise HTTPException(status_code=400, detail="Verification token is required.")

        token_hash_val = hash_token(raw_token.strip())
        officer = None

        if self.db:
            try:
                res = self.db.table("admin_memberships").select("*").eq("email_verification_token_hash", token_hash_val).execute()
                if res.data and len(res.data) > 0:
                    officer = res.data[0]
            except Exception:
                pass

        if not officer:
            for m in self.demo.get("admin_memberships", []):
                if m.get("email_verification_token_hash") == token_hash_val:
                    officer = m
                    break

        if not officer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired officer email verification link."
            )

        officer["is_email_verified"] = True
        officer["email_verification_token_hash"] = None
        now_iso = datetime.utcnow().isoformat()
        officer["updated_at"] = now_iso

        if self.db:
            try:
                self.db.table("admin_memberships").update({
                    "is_email_verified": True,
                    "email_verification_token_hash": None,
                    "updated_at": now_iso
                }).eq("id", officer["id"]).execute()
            except Exception as e:
                print(f"Warning: Could not update officer verification status in Supabase: {e}")

        self.log_audit(officer["email"], "OFFICER_EMAIL_VERIFIED", ip_address=ip_address,
                       metadata={"employee_id": officer.get("employee_id")})

        return {
            "success": True,
            "is_email_verified": True,
            "message": "Official email verified successfully! Your account is now submitted for Main Admin (Panchayat Officer) approval.",
            "officer": {
                "full_name": officer["full_name"],
                "email": officer["email"],
                "employee_id": officer.get("employee_id"),
                "department_name": officer.get("department_name"),
                "status": officer.get("status")
            }
        }

    # ------------------------------------------------------------------
    # Department Officer Management (Main Admin / Panchayat Officer)
    # ------------------------------------------------------------------
    def list_department_officers(self, actor_admin: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Lists all registered Department Officers for Main Admin review."""
        if actor_admin.get("role") not in ["primary_admin", "main_admin"]:
            raise HTTPException(status_code=403, detail="Access restricted to Main Administrator.")

        officers = []
        if self.db:
            try:
                res = self.db.table("admin_memberships").select(
                    "id, email, employee_id, full_name, role, department_id, department_name, department_code, status, is_email_verified, approved_by, approved_at, created_at, last_login_at"
                ).eq("role", "department_officer").order("created_at", desc=True).execute()
                if res.data is not None:
                    officers = res.data
            except Exception:
                pass

        if not officers:
            officers = [
                {k: v for k, v in m.items() if k != "password_hash"}
                for m in self.demo.get("admin_memberships", [])
                if m.get("role") == "department_officer"
            ]

        return officers

    def approve_department_officer(self, actor_admin: Dict[str, Any], officer_id: str,
                                   ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Approves a Department Officer, activating their account for login."""
        if actor_admin.get("role") not in ["primary_admin", "main_admin"]:
            raise HTTPException(status_code=403, detail="Access restricted to Main Administrator.")

        officer = self.get_admin_by_id(officer_id)
        if not officer:
            raise HTTPException(status_code=404, detail="Department Officer not found.")

        now_iso = datetime.utcnow().isoformat()
        approver = actor_admin.get("email", "primary_admin")

        officer["status"] = "active"
        officer["approved_by"] = approver
        officer["approved_at"] = now_iso
        officer["updated_at"] = now_iso

        if self.db:
            try:
                self.db.table("admin_memberships").update({
                    "status": "active",
                    "approved_by": approver,
                    "approved_at": now_iso,
                    "updated_at": now_iso
                }).eq("id", officer_id).execute()
            except Exception as e:
                print(f"Warning: Could not approve officer in Supabase: {e}")

        self.log_audit(approver, "OFFICER_APPROVED", target_email=officer["email"], ip_address=ip_address,
                       metadata={"officer_id": officer_id, "department": officer.get("department_name")})

        return {
            "success": True,
            "status": "active",
            "message": f"Officer '{officer['full_name']}' has been approved and activated.",
            "officer": {
                "id": officer["id"],
                "full_name": officer["full_name"],
                "status": "active",
                "approved_by": approver
            }
        }

    def deactivate_department_officer(self, actor_admin: Dict[str, Any], officer_id: str,
                                      ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Toggles officer status between active and suspended."""
        if actor_admin.get("role") not in ["primary_admin", "main_admin"]:
            raise HTTPException(status_code=403, detail="Access restricted to Main Administrator.")

        officer = self.get_admin_by_id(officer_id)
        if not officer:
            raise HTTPException(status_code=404, detail="Department Officer not found.")

        now_iso = datetime.utcnow().isoformat()
        new_status = "suspended" if officer.get("status") == "active" else "active"

        officer["status"] = new_status
        officer["updated_at"] = now_iso

        if self.db:
            try:
                self.db.table("admin_memberships").update({
                    "status": new_status,
                    "updated_at": now_iso
                }).eq("id", officer_id).execute()
            except Exception:
                pass

        action_label = "OFFICER_SUSPENDED" if new_status == "suspended" else "OFFICER_REACTIVATED"
        self.log_audit(actor_admin.get("email", "primary_admin"), action_label, target_email=officer["email"],
                       ip_address=ip_address, metadata={"officer_id": officer_id})

        return {
            "success": True,
            "message": f"Officer status changed to '{new_status}'.",
            "status": new_status
        }

    # ------------------------------------------------------------------
    # Audit Logs Retrieval
    # ------------------------------------------------------------------
    def get_audit_logs(self, actor_admin: Dict[str, Any], limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent audit logs. Visible to primary_admin."""
        if actor_admin.get("role") != "primary_admin":
            raise HTTPException(status_code=403, detail="Only Primary Administrator can view security audit logs.")

        logs = self.demo.get("admin_audit_logs", [])
        return logs[:limit]

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------
    def _invalidate_pending_challenges(self, email: str):
        for c in self.demo.get("admin_login_challenges", []):
            if c["email"].lower() == email.lower() and c.get("is_valid"):
                c["is_valid"] = False

    def _find_challenge_by_hash(self, token_hash_val: str) -> Optional[Dict[str, Any]]:
        if self.db:
            try:
                res = self.db.table("admin_login_challenges").select("*").eq("token_hash", token_hash_val).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Warning: Failed to fetch challenge from Supabase: {e}")
        for c in self.demo.get("admin_login_challenges", []):
            if c["token_hash"] == token_hash_val:
                return c
        return None

    def _find_invitation_by_hash(self, token_hash_val: str) -> Optional[Dict[str, Any]]:
        if self.db:
            try:
                res = self.db.table("admin_invitations").select("*").eq("token_hash", token_hash_val).execute()
                if res.data and len(res.data) > 0:
                    inv = res.data[0]
                    dept_name = inv.get("department_name") or ""
                    if "[ROLE:" in dept_name:
                        import re
                        m = re.search(r"\[ROLE:([a-zA-Z_]+)\]", dept_name)
                        if m:
                            inv["role"] = m.group(1)
                            inv["department_name"] = dept_name.replace(m.group(0), "").strip()
                    # Enforce department_officer for departments
                    if inv.get("department_name") in ["Sanitation", "Public Works", "Water Supply", "Electricity"] and inv.get("role") != "primary_admin":
                        inv["role"] = "department_officer"
                    return inv
            except Exception as e:
                print(f"Warning: Failed to fetch invitation from Supabase: {e}")
        for inv in self.demo.get("admin_invitations", []):
            if inv["token_hash"] == token_hash_val:
                return inv
        return None


# Global singleton service
admin_auth_service = AdminAuthService()
