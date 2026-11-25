"""
GramSeva File & Image Upload Service
Supports Cloudinary Media Storage with fallback to local static storage.
"""
import os
import uuid
import logging
from typing import Dict, Any, Optional
from fastapi import UploadFile, HTTPException

from backend.app.config import settings

logger = logging.getLogger(__name__)

# Base directory for local upload storage
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class UploadService:
    def __init__(self):
        self.upload_dir = UPLOAD_DIR

    async def upload_image(self, file: UploadFile, folder: str = "gramseva_complaints") -> Dict[str, Any]:
        """
        Uploads an image file:
        1. If Cloudinary credentials are configured, uploads directly to Cloudinary.
        2. Otherwise, saves to local uploads folder and returns static server URL.
        """
        if not file:
            raise HTTPException(status_code=400, detail="No file uploaded.")

        # Read file bytes
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Max 10MB limit
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit (10MB).")

        filename = file.filename or "photo.jpg"
        ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
        content_type = file.content_type or f"image/{ext}"

        # 1. Check Cloudinary Configuration
        cloud_name = settings.CLOUDINARY_CLOUD_NAME or os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
        api_key = settings.CLOUDINARY_API_KEY or os.environ.get("CLOUDINARY_API_KEY", "").strip()
        api_secret = settings.CLOUDINARY_API_SECRET or os.environ.get("CLOUDINARY_API_SECRET", "").strip()
        preset = settings.CLOUDINARY_UPLOAD_PRESET or os.environ.get("CLOUDINARY_UPLOAD_PRESET", "").strip()

        if cloud_name:
            try:
                import requests
                upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
                data = {"folder": folder}
                if preset:
                    data["upload_preset"] = preset

                auth = (api_key, api_secret) if (api_key and api_secret) else None
                files = {"file": (filename, content, content_type)}

                res = requests.post(upload_url, data=data, files=files, auth=auth, timeout=25)
                if res.status_code == 200:
                    resp_json = res.json()
                    secure_url = resp_json.get("secure_url") or resp_json.get("url")
                    logger.info(f"Cloudinary upload succeeded: {secure_url}")
                    return {
                        "url": secure_url,
                        "public_id": resp_json.get("public_id"),
                        "format": resp_json.get("format", ext),
                        "provider": "cloudinary",
                        "size": len(content)
                    }
                else:
                    logger.warning(f"Cloudinary returned HTTP {res.status_code}: {res.text}. Falling back to local storage.")
            except Exception as ce:
                logger.warning(f"Cloudinary upload exception: {ce}. Falling back to local storage.")

        # 2. Local File Storage Fallback
        safe_name = f"{uuid.uuid4().hex[:12]}_{filename.replace(' ', '_')}"
        dest_path = os.path.join(self.upload_dir, safe_name)
        with open(dest_path, "wb") as f:
            f.write(content)

        # Build public access URL
        # Uses PORT from settings (default 8000)
        base_url = f"http://localhost:{settings.PORT}"
        file_url = f"{base_url}/uploads/{safe_name}"

        logger.info(f"Local upload saved: {file_url}")
        return {
            "url": file_url,
            "filename": safe_name,
            "format": ext,
            "provider": "local",
            "size": len(content)
        }


upload_service = UploadService()
