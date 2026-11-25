"""
Pytest configuration and global fixtures for backend tests.
Ensures tests run in isolated demo mode without external Supabase/Meta/SMTP network dependencies.
"""
import pytest
from unittest.mock import patch
from backend.app.config import settings
from backend.app.services.admin_auth_service import admin_auth_service


@pytest.fixture(autouse=True, scope="session")
def configure_test_environment():
    """Ensure predictable test environment."""
    with patch("backend.app.database.get_db", return_value=None), \
         patch("backend.app.services.complaint_service.get_db", return_value=None), \
         patch.object(admin_auth_service, "db", None), \
         patch.object(settings, "SMTP_USER", None), \
         patch.object(settings, "WHATSAPP_VERIFY_TOKEN", "gramseva_webhook_secret_token_2026"):
        yield
