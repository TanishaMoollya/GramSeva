"""
GramSeva — AI-Powered Public Grievance Management System
FastAPI Backend Application Entrypoint
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.config import settings
from backend.app.routers import complaints, departments, analytics, whatsapp, ai, auth, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 65)
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} is starting up...")
    print(f"📡 Environment: {settings.APP_ENV} | Debug: {settings.DEBUG}")
    print(f"💾 Supabase: {'Connected' if settings.is_supabase_configured else 'Demo Repository Mode'}")
    print(f"🧠 Gemini AI: {'Configured' if settings.is_gemini_configured else 'Active Heuristic Fallback'}")
    print(f"📱 WhatsApp: {'Live Meta Cloud API' if settings.is_whatsapp_configured else 'Demo Interactive Simulator'}")
    print("=" * 65)
    yield
    print("🛑 GramSeva Backend shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Public Grievance Redressal and CRM System for Indian Gram Panchayats.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(departments.router)
app.include_router(analytics.router)
app.include_router(whatsapp.router)
app.include_router(ai.router)
app.include_router(upload.router)

# Mount Local Uploads Static Directory (served from backend/uploads where upload_service persists files)
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
upload_dir = os.path.join(backend_dir, "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/", tags=["Root"])
def root():
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Public Grievance Management System for Gram Panchayats",
        "documentation": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "demo_mode": settings.DEMO_MODE,
        "supabase_configured": settings.is_supabase_configured,
        "gemini_ai_configured": settings.is_gemini_configured,
        "whatsapp_configured": settings.is_whatsapp_configured
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
