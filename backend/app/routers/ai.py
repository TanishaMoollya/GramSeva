"""
AI Classification Testing API Router
"""
from pydantic import BaseModel, Field
from fastapi import APIRouter
from backend.app.services.gemini_service import classify_complaint_ai
from backend.app.models.complaint import AISuggestion

router = APIRouter(prefix="/api/ai", tags=["AI Classification"])


class AIClassificationRequest(BaseModel):
    description: str = Field(..., min_length=5, description="Complaint text to analyze")
    category: str = Field("Other public issues", description="Citizen selected category")


@router.post("/classify", response_model=AISuggestion)
async def test_ai_classification(req: AIClassificationRequest):
    """
    Test Google Gemini classification on any grievance text.
    Returns category, priority, responsible department and summary.
    """
    res = await classify_complaint_ai(req.description, req.category)
    return AISuggestion(**res)
