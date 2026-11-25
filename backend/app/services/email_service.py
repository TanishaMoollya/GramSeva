"""
GramSeva Email Service
Handles secure, branded email notifications for login verification,
administrator invitations, and password resets.
Supports standard SMTP delivery with seamless local development logger fallback.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional
import os

from backend.app.config import settings

# In-memory record of recent dispatched emails for testing and debugging
_EMAIL_OUTBOX = []


def get_email_outbox():
    return _EMAIL_OUTBOX


def clear_email_outbox():
    _EMAIL_OUTBOX.clear()


def _get_base_template(content_html: str, title: str) -> str:
    """Standard responsive HTML wrapper with GramSeva government branding."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #334155;
    }}
    .wrapper {{
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    }}
    .header {{
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0;
      font-size: 13px;
      color: #cbd5e1;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }}
    .body-content {{
      padding: 32px 28px;
      font-size: 15px;
      line-height: 1.6;
      color: #1e293b;
    }}
    .btn-container {{
      text-align: center;
      margin: 28px 0;
    }}
    .btn {{
      display: inline-block;
      padding: 14px 32px;
      background-color: #1e3a8a;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.35);
    }}
    .info-card {{
      background: #f8fafc;
      border-left: 4px solid #d97706;
      padding: 14px 16px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 13px;
      color: #475569;
    }}
    .footer {{
      background: #f1f5f9;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }}
    .link-alt {{
      word-break: break-all;
      font-size: 12px;
      color: #2563eb;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>GramSeva</h1>
      <p>Panchayat Grievance Management & CRM</p>
    </div>
    <div class="body-content">
      {content_html}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">Official Communication from GramSeva Public Administration System</p>
      <p style="margin: 0;">Designed for Digital India & Rural Governance &bull; Harohalli Gram Panchayat</p>
    </div>
  </div>
</body>
</html>"""


def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
    """
    Sends email via SMTP if configured, or logs to development logger and local outbox.
    """
    msg_record = {
        "to": to_email,
        "subject": subject,
        "html": html_content,
        "text": text_content or "",
        "sent_at": datetime.utcnow().isoformat()
    }
    _EMAIL_OUTBOX.append(msg_record)

    # If SMTP is configured, attempt live delivery
    if settings.is_smtp_configured:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            if settings.SMTP_PORT == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(msg["From"], [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                    if settings.SMTP_USE_TLS:
                        server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(msg["From"], [to_email], msg.as_string())
            print(f"📧 [REAL EMAIL DISPATCHED] Subject: '{subject}' to {to_email} via SMTP")
            return True
        except Exception as e:
            print(f"⚠️ [SMTP ERROR] Could not send email via SMTP ({e}). Falling back to local logging.")

    # Development / Fallback logger
    print("\n" + "=" * 65)
    print(f"📧 [GRAMSEVA DEV EMAIL DISPATCH]")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("-" * 65)
    if text_content:
        print(text_content.strip())
    print("=" * 65 + "\n")
    return True


def send_login_verification_email(to_email: str, raw_token: str, ip_address: Optional[str] = None) -> bool:
    """
    Sends the 10-minute single-use email verification link required for every admin login.
    """
    verify_url = f"{settings.FRONTEND_URL}/admin/verify?token={raw_token}"
    subject = "Verify Your GramSeva Administrator Login"

    content_html = f"""
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Complete Your Administrator Sign In</h2>
      <p>Hello Administrator,</p>
      <p>A sign-in attempt was initiated for your GramSeva account (<strong>{to_email}</strong>).</p>
      
      <div class="info-card">
        <strong>Security Challenge Details:</strong><br>
        &bull; <strong>Origin IP:</strong> {ip_address or 'Local / Loopback Session'}<br>
        &bull; <strong>Timestamp:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br>
        &bull; <strong>Validity:</strong> 10 minutes (Single Use Only)
      </div>

      <p>To finalize your authentication and open the CRM Dashboard, click the button below:</p>

      <div class="btn-container">
        <a href="{verify_url}" class="btn">Verify & Sign In to Dashboard</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Or copy and paste this verification URL into your browser:<br>
        <a href="{verify_url}" class="link-alt">{verify_url}</a>
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        <strong>Didn't attempt this sign-in?</strong> If you did not enter your password on the GramSeva portal, someone may have compromised your password. Please reset your credentials immediately or contact your Primary Administrator.
      </div>
    """

    text_content = f"""
Verify Your GramSeva Administrator Login

Hello Administrator,
A sign-in attempt was initiated for your account: {to_email}.
IP: {ip_address or 'Local Session'}

Click the link below to verify your login (valid for 10 minutes):
{verify_url}

If you did not attempt this login, contact your Primary Administrator immediately.
"""
    return send_email(to_email, subject, _get_base_template(content_html, subject), text_content)


def send_officer_verification_email(
    to_email: str,
    full_name: str,
    department_name: str,
    employee_id: str,
    raw_token: str
) -> bool:
    """
    Sends email confirmation link to a newly registered Department Officer.
    """
    verify_url = f"{settings.FRONTEND_URL}/admin/verify-officer?token={raw_token}"
    subject = f"Verify Your GramSeva Department Officer Email ({department_name})"

    content_html = f"""
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Verify Your Official Email Address</h2>
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>Thank you for registering as a Department Officer on the <strong>GramSeva</strong> Public Grievance Management Platform.</p>
      
      <div class="info-card">
        <strong>Officer Registration Details:</strong><br>
        &bull; <strong>Department:</strong> {department_name}<br>
        &bull; <strong>Employee ID:</strong> {employee_id}<br>
        &bull; <strong>Official Email:</strong> {to_email}<br>
        &bull; <strong>Process:</strong> Email Verification &rarr; Panchayat Officer Approval
      </div>

      <p>To confirm ownership of this email address and submit your profile for Panchayat Officer approval, click below:</p>

      <div class="btn-container">
        <a href="{verify_url}" class="btn">Verify Official Email Address</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Or open this link directly in your browser:<br>
        <a href="{verify_url}" class="link-alt">{verify_url}</a>
      </p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        Once verified, the Main Admin (Panchayat Development Officer) will approve your departmental access credentials.
      </p>
    """

    text_content = f"""
Verify Your GramSeva Department Officer Email

Dear {full_name},
Thank you for registering as a Department Officer for {department_name} (Employee ID: {employee_id}).

Click the link below to verify your email address:
{verify_url}

After verification, your account will be activated once approved by the Panchayat Development Officer.
"""
    return send_email(to_email, subject, _get_base_template(content_html, subject), text_content)


def send_admin_invitation_email(
    to_email: str,
    full_name: str,
    role: str,
    raw_token: str,
    invited_by: str,
    department_name: Optional[str] = None,
    employee_id: Optional[str] = None
) -> bool:
    """
    Sends the 24-hour invitation link to a newly invited administrator or department officer.
    """
    accept_url = f"{settings.FRONTEND_URL}/admin/accept-invitation?token={raw_token}"
    if role == "primary_admin":
        role_display = "Primary Administrator (Panchayat Officer)"
        subject = "Invitation to Join GramSeva as Primary Administrator"
    elif role == "department_officer":
        dept_str = f" ({department_name})" if department_name else ""
        role_display = f"Department Officer{dept_str}"
        subject = f"Official Invitation: Join GramSeva as Department Officer{dept_str}"
    else:
        role_display = f"Administrator ({department_name or 'General Administration'})"
        subject = "Invitation to Join GramSeva Administrator Portal"

    dept_detail_html = f"&bull; <strong>Department:</strong> {department_name}<br>" if department_name else ""
    emp_detail_html = f"&bull; <strong>Employee ID:</strong> {employee_id}<br>" if employee_id else ""

    content_html = f"""
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">You're Invited to GramSeva Official Portal</h2>
      <p>Dear <strong>{full_name}</strong>,</p>
      <p>You have been officially invited by <strong>{invited_by}</strong> to join the GramSeva Public Administration System as an authorized <strong>{role_display}</strong>.</p>
      
      <div class="info-card">
        <strong>Official Authorization Details:</strong><br>
        &bull; <strong>Assigned Role:</strong> {role_display}<br>
        {dept_detail_html}
        {emp_detail_html}
        &bull; <strong>Official Email:</strong> {to_email}<br>
        &bull; <strong>Link Validity:</strong> 24 hours
      </div>

      <p>To activate your official profile and set up your permanent secure password, please click below:</p>

      <div class="btn-container">
        <a href="{accept_url}" class="btn">Accept Invitation & Set Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Alternatively, open this link directly in your browser:<br>
        <a href="{accept_url}" class="link-alt">{accept_url}</a>
      </p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        This official invitation is intended solely for {to_email}. Once you set your password, you can sign in directly to manage assigned departmental grievances.
      </p>
    """

    text_content = f"""
Invitation to Join GramSeva Portal

Dear {full_name},
You have been invited by {invited_by} to join GramSeva as a {role_display}.

Click the link below to accept the invitation and set up your secure password (expires in 24 hours):
{accept_url}
"""
    return send_email(to_email, subject, _get_base_template(content_html, subject), text_content)


def send_password_reset_email(to_email: str, raw_token: str) -> bool:
    """
    Sends the 15-minute password recovery link.
    """
    reset_url = f"{settings.FRONTEND_URL}/admin/reset-password?token={raw_token}"
    subject = "Reset Your GramSeva Administrator Password"

    content_html = f"""
      <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Password Reset Request</h2>
      <p>Hello Administrator,</p>
      <p>We received a request to reset the password for your GramSeva administrative account (<strong>{to_email}</strong>).</p>

      <div class="info-card">
        <strong>Security Notice:</strong><br>
        This link is valid for <strong>15 minutes</strong> and will expire automatically after single use.
      </div>

      <p>Click the button below to choose a new, strong password:</p>

      <div class="btn-container">
        <a href="{reset_url}" class="btn">Reset Administrator Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Direct URL:<br>
        <a href="{reset_url}" class="link-alt">{reset_url}</a>
      </p>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        If you did not request this password reset, please ignore this email. Your current password remains secure.
      </p>
    """

    text_content = f"""
Reset Your GramSeva Administrator Password

Hello Administrator,
We received a password reset request for {to_email}.

Click the link below to reset your password (valid for 15 minutes):
{reset_url}

If you did not request this, please ignore this message.
"""
    return send_email(to_email, subject, _get_base_template(content_html, subject), text_content)

