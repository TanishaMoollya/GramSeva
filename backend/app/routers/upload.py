"""
Image & File Upload Router
Enables citizens to upload complaint photos and officers to upload resolution proof.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status

from backend.app.services.upload_service import upload_service

router = APIRouter(prefix="/api/upload", tags=["Media Upload"])


@router.post("", summary="Upload Complaint or Resolution Photo")
async def upload_image(
    file: UploadFile = File(..., description="Image file to upload (JPEG, PNG, WEBP)"),
    folder: Optional[str] = Form("gramseva_complaints")
) -> Dict[str, Any]:
    """
    Accepts multipart image upload.
    Stores via Cloudinary (if configured) or local secure static storage.
    Returns the public image URL.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        # Allow common image formats
        allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".heic"]
        if not any(file.filename.lower().endswith(ext) for ext in allowed_exts if file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files (JPEG, PNG, WEBP) are supported."
            )

    try:
        result = await upload_service.upload_image(file, folder=folder or "gramseva_complaints")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )
