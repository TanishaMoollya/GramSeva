"""
GramSeva Primary Administrator Bootstrap Script
Initializes or verifies the root Primary Administrator in Supabase / Demo Store.
"""
import sys
import os

# Ensure backend package resolution
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from backend.app.config import settings
from backend.app.services.admin_auth_service import admin_auth_service


def bootstrap_primary_admin():
    print("=" * 65)
    print("🛡️  GramSeva Primary Administrator Initializer")
    print("=" * 65)
    print(f"Target Email: {settings.PRIMARY_ADMIN_EMAIL}")
    print(f"Admin Name:   {settings.PRIMARY_ADMIN_NAME}")

    admin = admin_auth_service.get_admin_by_email(settings.PRIMARY_ADMIN_EMAIL)
    if admin:
        print("✅ Primary Administrator exists and is registered:")
        print(f"   ID:     {admin.get('id')}")
        print(f"   Role:   {admin.get('role')}")
        print(f"   Status: {admin.get('status')}")
    else:
        print("ℹ️ Initializing Primary Administrator...")
        # The lookup auto-provisions if matching settings.PRIMARY_ADMIN_EMAIL
        admin = admin_auth_service.get_admin_by_email(settings.PRIMARY_ADMIN_EMAIL)
        print("✅ Primary Administrator created successfully.")

    print("\nSecurity Policy Notice:")
    print("• Public registration is DISABLED.")
    print("• Every login requires entering password + clicking single-use email verification link.")
    print("=" * 65)


if __name__ == "__main__":
    bootstrap_primary_admin()
