"""
Comprehensive Test Suite for GramSeva Administrator Authentication System
Tests 2-stage verification on every login, single-use hashed challenges,
primary admin privilege enforcement, invitation workflows, suspension, and password resets.
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.database import get_demo_store
from backend.app.services.security import hash_token, hash_password, mask_email
from backend.app.services.email_service import get_email_outbox, clear_email_outbox
from backend.app.services.admin_auth_service import admin_auth_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state():
    """Resets test state and email outbox before each test."""
    clear_email_outbox()
    store = get_demo_store()
    store["admin_login_challenges"] = []
    store["admin_invitations"] = []
    store["admin_password_resets"] = []
    store["admin_audit_logs"] = []
    # Ensure default primary admin exists and is active
    admin = admin_auth_service.get_admin_by_email(settings.PRIMARY_ADMIN_EMAIL)
    if admin:
        admin["status"] = "active"
        admin["password_hash"] = hash_password(settings.PRIMARY_ADMIN_DEFAULT_PASSWORD)


def test_login_stage_a_success_issues_challenge_not_token():
    """Stage A: Valid password sends email verification challenge; does not issue access token."""
    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert data["stage"] == "EMAIL_VERIFICATION_REQUIRED"
    assert "challenge_id" in data
    assert "access_token" not in data  # Mandatory requirement: NO token yet!
    assert data["masked_email"] == mask_email(settings.PRIMARY_ADMIN_EMAIL)

    # Verify email was dispatched
    outbox = get_email_outbox()
    assert len(outbox) >= 1
    assert "Verify Your GramSeva Administrator Login" in outbox[-1]["subject"]


def test_login_stage_a_invalid_password():
    """Stage A: Incorrect password returns 401."""
    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": "WrongPassword@999"
    })
    assert res.status_code == 401
    assert "Invalid administrative" in res.json()["detail"]


def test_login_stage_a_suspended_admin():
    """Stage A: Suspended administrator is rejected with 403."""
    admin = admin_auth_service.get_admin_by_email(settings.PRIMARY_ADMIN_EMAIL)
    admin["status"] = "suspended"

    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()


def test_login_stage_b_verification_success_issues_token():
    """Stage B: Valid challenge token grants verified administrator JWT session."""
    # Stage A
    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    assert res.status_code == 200
    dev_url = res.json().get("dev_verification_url")
    token = dev_url.split("token=")[1]

    # Stage B: verify token
    res2 = client.post("/api/auth/verify-challenge", json={"token": token})
    assert res2.status_code == 200
    auth_data = res2.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["role"] == "primary_admin"
    assert auth_data["user"]["email"] == settings.PRIMARY_ADMIN_EMAIL

    # Use access token to call protected endpoint
    me_res = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {auth_data['access_token']}"
    })
    assert me_res.status_code == 200
    assert me_res.json()["authenticated"] is True
    assert me_res.json()["user"]["role"] == "primary_admin"


def test_login_stage_b_replay_attack_rejected():
    """Single-use enforcement: verification link cannot be used more than once."""
    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    token = res.json().get("dev_verification_url").split("token=")[1]

    # First consumption succeeds
    first_verify = client.post("/api/auth/verify-challenge", json={"token": token})
    assert first_verify.status_code == 200

    # Second consumption fails
    second_verify = client.post("/api/auth/verify-challenge", json={"token": token})
    assert second_verify.status_code == 400
    assert "already been used" in second_verify.json()["detail"].lower()


def test_login_stage_b_expired_token_rejected():
    """Tokens older than 10 minutes are expired and rejected."""
    res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    token = res.json().get("dev_verification_url").split("token=")[1]

    # Manually backdate challenge expiry in store
    token_hash = hash_token(token)
    store = get_demo_store()
    for c in store["admin_login_challenges"]:
        if c["token_hash"] == token_hash:
            c["expires_at"] = (datetime.utcnow() - timedelta(minutes=1)).isoformat()

    verify_res = client.post("/api/auth/verify-challenge", json={"token": token})
    assert verify_res.status_code == 400
    assert "expired" in verify_res.json()["detail"].lower()


def test_invitation_workflow_and_rbac():
    """Primary administrator can invite a new admin, and invitee can accept."""
    # 1. Log in as Primary Admin
    login_res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    token = login_res.json().get("dev_verification_url").split("token=")[1]
    admin_session = client.post("/api/auth/verify-challenge", json={"token": token}).json()
    auth_header = {"Authorization": f"Bearer {admin_session['access_token']}"}

    # 2. Invite new admin
    invite_res = client.post("/api/auth/invite-admin", json={
        "email": "officer.water@gramseva.gov.in",
        "full_name": "Kavitha Reddy",
        "role": "admin",
        "department_name": "Water Supply"
    }, headers=auth_header)
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    assert invite_data["status"] == "invited"
    invite_token = invite_data["dev_invite_url"].split("token=")[1]

    # 3. Invitee validates token
    val_res = client.get(f"/api/auth/invitation?token={invite_token}")
    assert val_res.status_code == 200
    assert val_res.json()["full_name"] == "Kavitha Reddy"

    # 4. Invitee accepts invitation & sets strong password
    accept_res = client.post("/api/auth/accept-invitation", json={
        "token": invite_token,
        "password": "WaterSupply#2026Secure!"
    })
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "activated"

    # 5. Invitee can now initiate login using their new password (department_officer receives direct JWT)
    inv_login = client.post("/api/auth/login", json={
        "email": "officer.water@gramseva.gov.in",
        "password": "WaterSupply#2026Secure!"
    })
    assert inv_login.status_code == 200
    assert inv_login.json()["stage"] == "AUTHENTICATED"
    assert "access_token" in inv_login.json()
    assert inv_login.json()["role"] == "department_officer"


def test_primary_admin_cannot_suspend_self():
    """A Primary Admin cannot suspend their own account."""
    login_res = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    token = login_res.json().get("dev_verification_url").split("token=")[1]
    admin_session = client.post("/api/auth/verify-challenge", json={"token": token}).json()
    auth_header = {"Authorization": f"Bearer {admin_session['access_token']}"}

    admin_id = admin_session["user"]["id"]
    res = client.post(f"/api/auth/administrators/{admin_id}/suspend", headers=auth_header)
    assert res.status_code == 400
    assert "cannot suspend their own account" in res.json()["detail"].lower()


def test_password_reset_flow():
    """Password reset request and execution flow."""
    # 1. Request reset
    req_res = client.post("/api/auth/forgot-password", json={
        "email": settings.PRIMARY_ADMIN_EMAIL
    })
    assert req_res.status_code == 200
    reset_token = req_res.json().get("dev_reset_url").split("token=")[1]

    # 2. Reset with weak password fails (lacks uppercase and symbol)
    weak_res = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "weakpassword123"
    })
    assert weak_res.status_code == 400
    assert "uppercase" in weak_res.json()["detail"].lower()

    # 3. Reset with strong password succeeds
    strong_res = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "NewAdminPass#2026!"
    })
    assert strong_res.status_code == 200

    # 4. Old password fails
    old_login = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": "WrongOldPassword"
    })
    assert old_login.status_code == 401

    # 5. New password succeeds
    new_login = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": "NewAdminPass#2026!"
    })
    assert new_login.status_code == 200


def test_captcha_generation():
    """Verify CAPTCHA endpoint generates id, base64 image, and length."""
    res = client.get("/api/auth/captcha")
    assert res.status_code == 200
    data = res.json()
    assert "captcha_id" in data
    assert "captcha_image" in data
    assert data["captcha_image"].startswith("data:image/svg+xml;utf8,")
    assert data["length"] == 5


def test_department_officer_registration_approval_and_login_flow():
    """
    Complete lifecycle test for Department Officer:
    1. Self-service registration
    2. Email verification
    3. Login blocked prior to Main Admin approval
    4. Main Admin approves officer
    5. Department Officer successfully logs in with direct session
    """
    # 1. Register new PWD officer
    reg_payload = {
        "full_name": "Ramesh Kumar PWD",
        "employee_id": "PWD-TEST-999",
        "email": "ramesh.pwd.test@gramseva.gov.in",
        "password": "SecurePassword#2026",
        "department_id": "d0000002-0000-0000-0000-000000000002",
        "department_name": "Public Works",
        "department_code": "PWD"
    }
    reg_res = client.post("/api/auth/register-officer", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["status"] == "pending_verification"
    officer_id = reg_data["officer_id"]
    verification_url = reg_data.get("dev_verification_url")
    assert verification_url is not None
    token = verification_url.split("token=")[1]

    # Attempt login before verifying email -> rejected
    pre_verify_login = client.post("/api/auth/login", json={
        "email": "PWD-TEST-999",
        "password": "SecurePassword#2026",
        "role": "department_officer"
    })
    assert pre_verify_login.status_code == 403
    assert "not yet verified" in pre_verify_login.json()["detail"].lower()

    # 2. Officer clicks email verification link
    ver_res = client.get(f"/api/auth/verify-officer-email?token={token}")
    assert ver_res.status_code == 200
    assert ver_res.json()["is_email_verified"] is True

    # Attempt login after email verification but BEFORE Main Admin approval -> 403
    pre_approval_login = client.post("/api/auth/login", json={
        "email": "PWD-TEST-999",
        "password": "SecurePassword#2026",
        "role": "department_officer"
    })
    assert pre_approval_login.status_code == 403
    assert "awaiting approval" in pre_approval_login.json()["detail"].lower()

    # 3. Main Admin logs in and approves officer
    admin_login = client.post("/api/auth/login", json={
        "email": settings.PRIMARY_ADMIN_EMAIL,
        "password": settings.PRIMARY_ADMIN_DEFAULT_PASSWORD
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json().get("dev_verification_url").split("token=")[1]
    admin_session = client.post("/api/auth/verify-challenge", json={"token": admin_token}).json()
    admin_headers = {"Authorization": f"Bearer {admin_session['access_token']}"}

    # Verify officer is in list of department officers
    officers_res = client.get("/api/auth/department-officers", headers=admin_headers)
    assert officers_res.status_code == 200
    officer_list = officers_res.json()
    matching = [o for o in officer_list if o["id"] == officer_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "pending_approval"

    # Main Admin approves
    approve_res = client.post(f"/api/auth/department-officers/{officer_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "active"

    # 4. Department Officer logs in with Employee ID
    officer_login = client.post("/api/auth/login", json={
        "email": "PWD-TEST-999",
        "password": "SecurePassword#2026",
        "role": "department_officer"
    })
    assert officer_login.status_code == 200
    officer_auth = officer_login.json()
    assert "access_token" in officer_auth
    assert officer_auth["user"]["role"] == "department_officer"
    assert officer_auth["user"]["department_code"] == "PWD"

