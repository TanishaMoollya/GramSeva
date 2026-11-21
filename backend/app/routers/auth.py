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
    role: str = "admin"
    department_name: Optional[str] = "General Administration"
    department_id: Optional[str] = None


class AcceptInvitationRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


# --- Endpoints ---

@router.post("/login", summary="Stage A: Password Authentication & Email Challenge Issuance")
def login(req: LoginRequest, request: Request):
    """
    Validates administrative password and initiates a single-use 10-minute email verification challenge.
    Does NOT issue an access token.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")
    return admin_auth_service.initiate_login(
        email=req.email,
        password=req.password,
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
