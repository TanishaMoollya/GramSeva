"""
Departments API Router
"""
from typing import List
from fastapi import APIRouter
from backend.app.database import get_demo_store, get_db
from backend.app.models.complaint import DepartmentResponse

router = APIRouter(prefix="/api/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentResponse])
def get_departments():
    """
    Returns list of Gram Panchayat departments (Sanitation, Public Works, Water Supply, Electricity, General Administration).
    """
    sb = get_db()
    if sb:
        try:
            res = sb.table("departments").select("*").eq("is_active", True).execute()
            if res.data:
                return res.data
        except Exception:
            pass

    store = get_demo_store()
    return store["departments"]
