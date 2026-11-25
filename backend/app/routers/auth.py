"""
GramSeva Administrator Authentication & Management Router
Enforces the mandatory two-stage authentication policy on every login.
Provides invitation management, account lifecycle, password recovery, and audit logs.
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Request, HTTPException, status

from backend.app.services.admin_auth_service import admin_auth_service
from backend.app.dependencies import get_current_verified_admin, require_primary_admin

router = APIRouter(prefix="/api/auth", tags=["Administrator Authentication"])


# --- Schemas ---

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)
    role: Optional[str] = None
    captcha_id: Optional[str] = None
    captcha_code: Optional[str] = None


class RegisterOfficerRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    employee_id: str = Field(..., min_length=3)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    department_id: str
    department_name: str
    department_code: str


class VerifyChallengeRequest(BaseModel):
    token: str = Field(..., min_length=10)


class ResendChallengeRequest(BaseModel):
    email: str = Field(..., min_length=3)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=3)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8)


class InviteAdminRequest(BaseModel):
    email: str = Field(..., min_length=3)
    full_name: str = Field(..., min_length=2)
    role: str = "department_officer"
    department_name: Optional[str] = "Sanitation"
    department_id: Optional[str] = None
    department_code: Optional[str] = None
    employee_id: Optional[str] = None


class AcceptInvitationRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


# --- Endpoints ---

@router.get("/captcha", summary="Generate High-Contrast Government CAPTCHA Code")
def get_captcha():
    """
    Generates a fresh 5-character government-portal-style CAPTCHA for login verification.
    """
    from backend.app.services.admin_auth_service import create_captcha
    return create_captcha()


@router.post("/login", summary="Three-Role Authentication Handler")
def login(req: LoginRequest, request: Request):
    """
    Role-aware authentication endpoint:
    - Main Admin (Panchayat Officer) -> Authenticates password & triggers fresh email verification challenge
    - Department Officer -> Authenticates credentials, validates verified email & Main Admin approval, returns direct JWT
    - WhatsApp CRM Manager -> Authenticates credentials & returns direct JWT
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")
    return admin_auth_service.initiate_login(
        email=req.email,
        password=req.password,
        expected_role=req.role,
        captcha_id=req.captcha_id,
        captcha_code=req.captcha_code,
        ip_address=client_ip,
        user_agent=user_agent
    )


@router.post("/verify-challenge", summary="Stage B: Email Verification Challenge Consumption")
def verify_challenge(req: VerifyChallengeRequest, request: Request):
    """
    Validates and consumes the single-use email verification link.
    Returns the verified administrative JWT access session.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.verify_login_challenge(
        raw_token=req.token,
        ip_address=client_ip
    )


@router.post("/resend-challenge", summary="Resend Fresh Login Verification Challenge")
def resend_challenge(req: ResendChallengeRequest, request: Request):
    """
    Dispatches a fresh verification challenge link after rate-limiting cooldown.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.resend_login_challenge(
        email=req.email,
        ip_address=client_ip
    )


@router.get("/me", summary="Get Current Verified Administrator Profile")
def get_me(admin: Dict[str, Any] = Depends(get_current_verified_admin)):
    """
    Returns the authenticated administrator's verified credentials and role.
    """
    return {
        "authenticated": True,
        "verified": True,
        "user": admin
    }


@router.post("/forgot-password", summary="Request Password Reset Link")
def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Initiates a 15-minute password reset link for the given email address.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.request_password_reset(
        email=req.email,
        ip_address=client_ip
    )


@router.post("/reset-password", summary="Execute Password Reset")
def reset_password(req: ResetPasswordRequest, request: Request):
    """
    Validates the password reset token and sets a new password.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.execute_password_reset(
        raw_token=req.token,
        new_password=req.password,
        ip_address=client_ip
    )


@router.get("/invitation", summary="Validate Admin Invitation Token")
def validate_invitation(token: str):
    """
    Validates an invitation link and returns the invitation context for UI display.
    """
    return admin_auth_service.validate_invitation_token(token)


@router.post("/accept-invitation", summary="Accept Administrator Invitation")
def accept_invitation(req: AcceptInvitationRequest, request: Request):
    """
    Accepts the invitation, validates password strength, and registers the administrator.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.accept_invitation(
        raw_token=req.token,
        password=req.password,
        full_name=req.full_name,
        ip_address=client_ip
    )


# --- Primary Administrator Management Endpoints ---

@router.get("/administrators", summary="List Administrators and Invitations (Primary Admin Only)")
def list_administrators(admin: Dict[str, Any] = Depends(require_primary_admin)):
    """
    Lists all administrator accounts and pending invitations.
    """
    return admin_auth_service.list_administrators(admin)


@router.post("/invite-admin", summary="Invite New Administrator (Primary Admin Only)")
def invite_admin(
    req: InviteAdminRequest,
    request: Request,
    admin: Dict[str, Any] = Depends(require_primary_admin)
):
    """
    Sends an invitation email to add an administrator.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.invite_administrator(
        actor_admin=admin,
        invite_data=req.model_dump(),
        ip_address=client_ip
    )


@router.post("/administrators/{admin_id}/suspend", summary="Suspend Administrator Account (Primary Admin Only)")
def suspend_admin(
    admin_id: str,
    request: Request,
    admin: Dict[str, Any] = Depends(require_primary_admin)
):
    """
    Suspends an administrator from logging in.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.suspend_administrator(
        actor_admin=admin,
        target_admin_id=admin_id,
        ip_address=client_ip
    )


@router.post("/administrators/{admin_id}/reactivate", summary="Reactivate Administrator Account (Primary Admin Only)")
def reactivate_admin(
    admin_id: str,
    request: Request,
    admin: Dict[str, Any] = Depends(require_primary_admin)
):
    """
    Reactivates a suspended administrator account.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.reactivate_administrator(
        actor_admin=admin,
        target_admin_id=admin_id,
        ip_address=client_ip
    )


@router.delete("/invitations/{invitation_id}", summary="Revoke Administrator Invitation (Primary Admin Only)")
def revoke_invitation(
    invitation_id: str,
    request: Request,
    admin: Dict[str, Any] = Depends(require_primary_admin)
):
    """
    Revokes a pending administrator invitation.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.revoke_invitation(
        actor_admin=admin,
        invitation_id=invitation_id,
        ip_address=client_ip
    )


@router.get("/audit-logs", summary="Get Security Audit Logs (Primary Admin Only)")
def get_audit_logs(
    limit: int = 50,
    admin: Dict[str, Any] = Depends(require_primary_admin)
):
    """
    Returns security audit log entries.
    """
    return admin_auth_service.get_audit_logs(admin, limit=limit)


# --- Department Officer Registration & Management Endpoints ---

@router.post("/register-officer", summary="Department Officer Employee Registration")
def register_officer(req: RegisterOfficerRequest, request: Request):
    """
    Self-service registration for Department Officers.
    Issues email verification link and puts profile into 'pending_approval' status.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.register_department_officer(
        full_name=req.full_name,
        employee_id=req.employee_id,
        email=req.email,
        password=req.password,
        department_id=req.department_id,
        department_name=req.department_name,
        department_code=req.department_code,
        ip_address=client_ip
    )


@router.get("/verify-officer-email", summary="Verify Department Officer Official Email")
def verify_officer_email(token: str, request: Request):
    """
    Consumes email verification token for Department Officer.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.verify_officer_email(token, ip_address=client_ip)


@router.get("/department-officers", summary="List All Department Officers (Main Admin Only)")
def get_department_officers(admin: Dict[str, Any] = Depends(require_primary_admin)):
    """
    Lists registered Department Officers across all departments.
    """
    return admin_auth_service.list_department_officers(admin)


@router.post("/department-officers/{officer_id}/approve", summary="Approve Department Officer (Main Admin Only)")
def approve_officer(officer_id: str, request: Request, admin: Dict[str, Any] = Depends(require_primary_admin)):
    """
    Main Admin action to approve a verified Department Officer.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.approve_department_officer(admin, officer_id, ip_address=client_ip)


@router.post("/department-officers/{officer_id}/deactivate", summary="Deactivate / Toggle Officer Account (Main Admin Only)")
def deactivate_officer(officer_id: str, request: Request, admin: Dict[str, Any] = Depends(require_primary_admin)):
    """
    Main Admin action to suspend or reactivate a Department Officer.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return admin_auth_service.deactivate_department_officer(admin, officer_id, ip_address=client_ip)
