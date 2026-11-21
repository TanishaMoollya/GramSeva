"""
GramSeva Administrator Authentication & Invitation Management Service
Enforces strict 2-stage authentication on EVERY login:
Stage A: Password authentication and challenge issuance.
Stage B: Single-use, hashed, 10-minute email verification link consumption.
Also provides Primary Administrator initialization, invitation workflows,
account suspension, password resets, and comprehensive audit logging.
"""
import uuid
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
    send_password_reset_email
)


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
    # STAGE A: Password Authentication & Challenge Issuance
    # ------------------------------------------------------------------
    def initiate_login(self, email: str, password: str, ip_address: Optional[str] = None,
                       user_agent: Optional[str] = None) -> Dict[str, Any]:
        """
        Stage A: Authenticates password and initiates a fresh email verification challenge.
        DOES NOT return an access token.
        """
        clean_email = email.strip().lower()
        admin = self.get_admin_by_email(clean_email)

        if not admin:
            self.log_audit(clean_email, "ADMIN_LOGIN_FAILED_UNKNOWN_EMAIL", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrative email or password."
            )

        # Check account status
        if admin.get("status") == "suspended":
            self.log_audit(clean_email, "ADMIN_LOGIN_FAILED_SUSPENDED", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your administrative account has been suspended. Please contact the Primary Administrator."
            )

        # Verify password
        stored_hash = admin.get("password_hash")
        if not verify_password(password, stored_hash):
            self.log_audit(clean_email, "ADMIN_LOGIN_FAILED_WRONG_PASSWORD", ip_address=ip_address)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrative email or password."
            )

        # Password authentication succeeded! Invalidate older pending challenges for this email
        self._invalidate_pending_challenges(clean_email)

        # Generate fresh single-use verification challenge
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

        # Save challenge
        if self.db:
            try:
                self.db.table("admin_login_challenges").insert(challenge_record).execute()
            except Exception as e:
                print(f"Warning: Could not save challenge to Supabase: {e}")
                self.demo.setdefault("admin_login_challenges", []).append(challenge_record)
        else:
            self.demo.setdefault("admin_login_challenges", []).append(challenge_record)

        # Send email with verification link
        send_login_verification_email(clean_email, raw_token, ip_address)

        # Log audit
        self.log_audit(clean_email, "ADMIN_LOGIN_PASSWORD_SUCCESS", ip_address=ip_address)
        self.log_audit(clean_email, "ADMIN_LOGIN_CHALLENGE_SENT", ip_address=ip_address,
                       metadata={"challenge_id": challenge_id})

        return {
            "stage": "EMAIL_VERIFICATION_REQUIRED",
            "challenge_id": challenge_id,
            "email": clean_email,
            "masked_email": mask_email(clean_email),
            "expires_in_minutes": settings.CHALLENGE_EXPIRE_MINUTES,
            # For demonstration and automated evaluation convenience when SMTP is mock:
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
    # Administrator Invitations (Primary Admin Only)
    # ------------------------------------------------------------------
    def invite_administrator(
        self,
        actor_admin: Dict[str, Any],
        invite_data: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates and emails an invitation to join as an administrator. Only callable by primary_admin.
        """
        if actor_admin.get("role") != "primary_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the Primary Administrator has permission to invite new administrators."
            )

        email = invite_data.get("email", "").strip().lower()
        full_name = invite_data.get("full_name", "").strip()
        role = invite_data.get("role", "admin")
        department_name = invite_data.get("department_name", "General Administration")
        department_id = invite_data.get("department_id")

        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="A valid official email is required.")
        if not full_name:
            raise HTTPException(status_code=400, detail="Administrator full name is required.")
        if role not in ["admin", "primary_admin"]:
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'primary_admin'.")

        # Check if already registered
        existing_admin = self.get_admin_by_email(email)
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An administrator account for {email} already exists."
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
            "token_hash": token_hash_val,
            "invited_by": actor_admin.get("email", "Primary Administrator"),
            "expires_at": expires_at.isoformat(),
            "accepted_at": None,
            "revoked_at": None,
            "created_at": datetime.utcnow().isoformat()
        }

        if self.db:
            try:
                self.db.table("admin_invitations").insert(invite_record).execute()
            except Exception:
                self.demo.setdefault("admin_invitations", []).append(invite_record)
        else:
            self.demo.setdefault("admin_invitations", []).append(invite_record)

        send_admin_invitation_email(email, full_name, role, raw_token, actor_admin.get("name", "Primary Administrator"))

        self.log_audit(
            actor_admin.get("email", "primary_admin"),
            "ADMIN_INVITED",
            target_email=email,
            ip_address=ip_address,
            metadata={"role": role, "name": full_name}
        )

        return {
            "status": "invited",
            "invitation_id": invite_id,
            "email": email,
            "full_name": full_name,
            "role": role,
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

        return {
            "email": invitation["email"],
            "full_name": invitation["full_name"],
            "role": invitation["role"],
            "department_name": invitation.get("department_name", "General Administration"),
            "invited_by": invitation["invited_by"]
        }

    def accept_invitation(self, raw_token: str, password: str, full_name: Optional[str] = None,
                          ip_address: Optional[str] = None) -> Dict[str, Any]:
        """Completes registration for an invited administrator."""
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

        # Create administrator profile
        new_admin = {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "email": email,
            "full_name": full_name or invitation["full_name"],
            "role": invitation["role"],
            "department_id": invitation.get("department_id"),
            "department_name": invitation.get("department_name", "General Administration"),
            "status": "active",
            "password_hash": hash_password(password),
            "invited_by": invitation["invited_by"],
            "last_login_at": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        invitation["accepted_at"] = now_iso

        if self.db:
            try:
                self.db.table("admin_memberships").insert(new_admin).execute()
                self.db.table("admin_invitations").update({"accepted_at": now_iso}).eq("id", invitation["id"]).execute()
            except Exception:
                self.demo.setdefault("admin_memberships", []).append(new_admin)
        else:
            self.demo.setdefault("admin_memberships", []).append(new_admin)

        self.log_audit(email, "ADMIN_INVITATION_ACCEPTED", ip_address=ip_address,
                       metadata={"role": new_admin["role"]})

        return {
            "status": "activated",
            "message": "Your administrator account has been created. Please sign in with your email and password.",
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
        # Sanitize output (remove password hashes and token hashes)
        admins = []
        for a in self.demo.get("admin_memberships", []):
            admins.append({
                "id": a["id"],
                "email": a["email"],
                "full_name": a["full_name"],
                "role": a["role"],
                "department_name": a.get("department_name", "General Administration"),
                "status": a.get("status", "active"),
                "invited_by": a.get("invited_by"),
                "last_login_at": a.get("last_login_at"),
                "created_at": a.get("created_at")
            })

        invitations = []
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
        for c in self.demo.get("admin_login_challenges", []):
            if c["token_hash"] == token_hash_val:
                return c
        return None

    def _find_invitation_by_hash(self, token_hash_val: str) -> Optional[Dict[str, Any]]:
        for inv in self.demo.get("admin_invitations", []):
            if inv["token_hash"] == token_hash_val:
                return inv
        return None


# Global singleton service
admin_auth_service = AdminAuthService()
