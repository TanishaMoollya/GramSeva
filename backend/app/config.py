"""
GramSeva Configuration Module
Loads and validates environment variables using Pydantic Settings.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "GramSeva API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Demonstration Mode (True by default for smooth academic review without external keys)
    DEMO_MODE: bool = True

    # Supabase PostgreSQL
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Google Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Meta WhatsApp Cloud API
    WHATSAPP_API_VERSION: str = "v20.0"
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "gramseva_webhook_secret_token_2026"
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""

    # Admin Authentication & Security
    FRONTEND_URL: str = "http://localhost:3000"
    PRIMARY_ADMIN_EMAIL: str = "admin@gramseva.gov.in"
    PRIMARY_ADMIN_NAME: str = "Panchayat Development Officer (PDO)"
    PRIMARY_ADMIN_DEFAULT_PASSWORD: str = "GramSeva@2026Secure!"
    JWT_SECRET_KEY: str = "gramseva_super_secret_jwt_key_for_admin_sessions_2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CHALLENGE_EXPIRE_MINUTES: int = 10
    INVITATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    # SMTP Configuration (Optional: falls back to dev logging and debug audit)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "GramSeva Security <noreply@gramseva.gov.in>"
    SMTP_USE_TLS: bool = True

    @property
    def is_smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and (self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_ANON_KEY))

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip() != "")

    @property
    def is_whatsapp_configured(self) -> bool:
        return bool(self.WHATSAPP_PHONE_NUMBER_ID and self.WHATSAPP_ACCESS_TOKEN)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
