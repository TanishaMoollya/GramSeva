"""
Pydantic Schemas for Complaints, Departments, Status History, and Attachments
"""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
import re

ComplaintStatus = Literal['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected']
ComplaintPriority = Literal['Low', 'Medium', 'High', 'Critical']
ComplaintSource = Literal['web', 'whatsapp']
AttachmentType = Literal['complaint', 'resolution']

VALID_CATEGORIES = [
    "Streetlight issues",
    "Garbage collection",
    "Potholes and road damage",
    "Water supply",
    "Drainage and sanitation",
    "Other public issues"
]


class ComplaintBase(BaseModel):
    citizen_name: str = Field(..., min_length=2, max_length=100, description="Full name of the citizen")
    citizen_phone: str = Field(..., description="Indian phone number e.g. +919876543210")
    category: str = Field(..., description="Complaint category from allowed list")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed complaint description")
    village_name: str = Field(..., min_length=2, max_length=100, description="Name of village / Gram Panchayat")
    ward_number: str = Field(..., min_length=1, max_length=20, description="Ward or block number")
    address: str = Field(..., min_length=3, max_length=300, description="Specific location or landmark")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)

    @field_validator("citizen_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r'[\s\-]', '', v)
        # Handle 10-digit Indian numbers or with +91
        if re.match(r'^\+91[6-9]\d{9}$', clean):
            return clean
        elif re.match(r'^[6-9]\d{9}$', clean):
            return f"+91{clean}"
        elif re.match(r'^0[6-9]\d{9}$', clean):
            return f"+91{clean[1:]}"
        elif re.match(r'^\+?\d{10,15}$', clean):
            return clean if clean.startswith('+') else f"+{clean}"
        raise ValueError("Invalid phone number format. Please provide a valid 10-digit mobile number.")


class ComplaintCreate(ComplaintBase):
    source: ComplaintSource = 'web'
    image_url: Optional[str] = None


class StatusHistoryItem(BaseModel):
    id: Optional[str] = None
    complaint_id: Optional[str] = None
    previous_status: Optional[ComplaintStatus] = None
    new_status: ComplaintStatus
    remarks: Optional[str] = None
    proof_url: Optional[str] = None
    updated_by_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AttachmentItem(BaseModel):
    id: Optional[str] = None
    complaint_id: Optional[str] = None
    file_name: str
    file_url: str
    file_type: str
    attachment_type: AttachmentType = 'complaint'
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class AISuggestion(BaseModel):
    category: str
    priority: ComplaintPriority
    department: str
    summary: str
    confidence: float = 0.90


class ComplaintResponse(ComplaintBase):
    id: str
    tracking_id: str
    source: ComplaintSource
    status: ComplaintStatus
    priority: ComplaintPriority
    
    # AI Suggestions
    ai_category: Optional[str] = None
    ai_priority: Optional[ComplaintPriority] = None
    ai_department: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_reviewed: bool = False
    ai_overridden: bool = False
    
    # Assignment & Resolution
    assigned_department_id: Optional[str] = None
    assigned_department_name: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    resolution_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    resolved_at: Optional[datetime] = None
    
    # Relationships
    status_history: List[StatusHistoryItem] = []
    attachments: List[AttachmentItem] = []
    
    # Timestamps
    created_at: datetime
    updated_at: datetime


class StatusUpdateRequest(BaseModel):
    status: ComplaintStatus
    remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    proof_url: Optional[str] = None
    updated_by_name: str = "Panchayat Administrator"
    notify_citizen: bool = True


class AssignmentRequest(BaseModel):
    department_id: str
    department_name: str
    officer_name: Optional[str] = None
    notes: Optional[str] = None
    assigned_by_name: str = "Panchayat Administrator"
    notify_citizen: bool = True


class AIOverrideRequest(BaseModel):
    category: Optional[str] = None
    priority: Optional[ComplaintPriority] = None
    department: Optional[str] = None
    summary: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
