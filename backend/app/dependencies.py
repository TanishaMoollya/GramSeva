"""
GramSeva FastApi Dependencies & RBAC Protection
Ensures that protected administrative endpoints strictly require an active,
email-verified administrator JWT session.
"""
from typing import Dict, Any, Optional
from fastapi import Depends, HTTPException, status, Header, Request

from backend.app.services.security import decode_access_token
from backend.app.services.admin_auth_service import admin_auth_service


def get_current_verified_admin(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Dict[str, Any]:
    """
    Extracts, verifies, and decodes the Bearer token from the request.
    Verifies that the session belongs to an active, email-verified administrator.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Administrative authorization header is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Must be 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not payload.get("verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification challenge has not been satisfied for this session."
        )

    # Verify status in membership registry
    admin = admin_auth_service.get_admin_by_email(payload.get("email", ""))
    if not admin or admin.get("status") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative account is suspended or no longer exists."
        )

    return payload


def require_primary_admin(
    admin: Dict[str, Any] = Depends(get_current_verified_admin)
) -> Dict[str, Any]:
    """
    Guarantees that only a Primary / Main Administrator (Panchayat Officer) can perform
    system-wide administrative management such as officer approvals and audit logs.
    """
    if admin.get("role") not in ["primary_admin", "main_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Requires Main Admin (Panchayat Officer) privileges."
        )
    return admin


def require_department_officer(
    admin: Dict[str, Any] = Depends(get_current_verified_admin)
) -> Dict[str, Any]:
    """
    Ensures the user is an authorized Department Officer or Main Admin.
    """
    if admin.get("role") not in ["department_officer", "primary_admin", "main_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Requires Department Officer privileges."
        )
    return admin


def get_optional_admin(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[Dict[str, Any]]:
    """
    Extracts admin claims if present, otherwise returns None.
    """
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            payload = decode_access_token(parts[1])
            if payload and payload.get("verified"):
                return payload
    except Exception:
        pass
    return None
