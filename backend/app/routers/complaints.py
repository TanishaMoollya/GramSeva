"""
Complaint and Grievance Management API Router
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status, Depends

from backend.app.dependencies import get_optional_admin
from backend.app.models.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    StatusUpdateRequest,
    AssignmentRequest,
    AIOverrideRequest,
    AttachmentItem
)
from backend.app.services.complaint_service import complaint_service

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def submit_complaint(complaint: ComplaintCreate):
    """
    Submit a citizen grievance via Web portal.
    Triggers Google Gemini AI classification and saves to Supabase.
    """
    try:
        created = await complaint_service.create_complaint(complaint)
        return created
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit complaint: {str(e)}"
        )


@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    search: Optional[str] = Query(None, description="Search by ID, name, or phone"),
    category: Optional[str] = Query(None, description="Filter by category"),
    department: Optional[str] = Query(None, description="Filter by assigned department"),
    status: Optional[str] = Query(None, description="Filter by status"),
    source: Optional[str] = Query(None, description="Filter by source (web/whatsapp)"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    sort_by: str = Query("newest", description="Sort by: newest, oldest, priority"),
    current_admin: Optional[Dict[str, Any]] = Depends(get_optional_admin)
):
    """
    List, search, filter and sort grievances for the Admin CRM.
    Enforces strict Department Officer isolation: officers see ONLY their department's grievances.
    """
    # Strict Department Officer Isolation
    if current_admin and current_admin.get("role") == "department_officer":
        officer_dept = current_admin.get("department_name")
        if officer_dept:
            department = officer_dept

    return complaint_service.get_complaints(
        search=search,
        category=category,
        department=department,
        status=status,
        source=source,
        priority=priority,
        sort_by=sort_by
    )


@router.get("/track/{tracking_id}", response_model=ComplaintResponse)
def track_complaint(
    tracking_id: str,
    phone: Optional[str] = Query(None, description="Citizen registered mobile number for verification")
):
    """
    Public citizen tracking endpoint.
    Retrieves real-time status timeline, assigned department, notes and resolution proof.
    """
    try:
        complaint = complaint_service.track_complaint(tracking_id, phone)
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No grievance found with Tracking ID: {tracking_id}"
            )
        return complaint
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: str):
    """
    Get full grievance details including AI analysis, status history and photo proof.
    """
    comp = complaint_service.get_complaint_by_id(complaint_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint not found with ID {complaint_id}"
        )
    return comp


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: str,
    req: StatusUpdateRequest,
    current_admin: Optional[Dict[str, Any]] = Depends(get_optional_admin)
):
    """
    Admin CRM action: Update status (Submitted -> Under Review -> Assigned -> In Progress -> Resolved / Rejected).
    Triggers automated WhatsApp notification to citizen if enabled.
    Department Officers are strictly restricted to updating complaints assigned to their department.
    """
    try:
        # Strict Department Officer Check
        if current_admin and current_admin.get("role") == "department_officer":
            existing = complaint_service.get_complaint_by_id(complaint_id)
            if existing:
                officer_dept = current_admin.get("department_name")
                if existing.assigned_department_name and existing.assigned_department_name != officer_dept:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied: This grievance belongs to the {existing.assigned_department_name} department."
                    )

        updated = await complaint_service.update_status(complaint_id, req)
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{complaint_id}/assign", response_model=ComplaintResponse)
async def assign_department(complaint_id: str, req: AssignmentRequest):
    """
    Admin CRM action: Assign grievance to responsible department and field officer.
    """
    try:
        updated = await complaint_service.assign_department(complaint_id, req)
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{complaint_id}/ai-override", response_model=ComplaintResponse)
def override_ai_recommendation(complaint_id: str, req: AIOverrideRequest):
    """
    Admin review & override of AI classification (category, priority, department, summary).
    """
    try:
        updated = complaint_service.override_ai_suggestion(complaint_id, req)
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
