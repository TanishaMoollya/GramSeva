"""
Analytics & Reporting API Router
"""
from fastapi import APIRouter
from fastapi.responses import Response
from backend.app.services.complaint_service import complaint_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def get_analytics_summary():
    """
    Returns aggregated metrics and charts dataset for Recharts dashboard.
    """
    return complaint_service.get_analytics()


@router.get("/export-csv")
def export_complaints_csv():
    """
    Exports all grievances as a downloadable CSV file.
    """
    csv_content = complaint_service.export_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=gramseva_complaints_export.csv"
        }
    )
