"""
Unit and integration tests for Complaint Management API
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_list_departments():
    response = client.get("/api/departments")
    assert response.status_code == 200
    depts = response.json()
    assert len(depts) >= 5
    dept_names = [d["name"] for d in depts]
    assert "Sanitation" in dept_names
    assert "Water Supply" in dept_names
    assert "Electricity" in dept_names


def test_submit_complaint_and_track():
    payload = {
        "citizen_name": "Suresh Gowda",
        "citizen_phone": "+919876543210",
        "category": "Streetlight issues",
        "description": "Streetlight pole broken near temple entrance, dangerous exposed wire.",
        "village_name": "Harohalli",
        "ward_number": "Ward 2",
        "address": "Near Anjaneya Temple",
        "latitude": 12.6582,
        "longitude": 77.4521,
        "source": "web"
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["tracking_id"].startswith("GS-")
    assert data["status"] == "Submitted"
    assert data["citizen_name"] == "Suresh Gowda"
    assert data["ai_category"] is not None
    assert data["ai_priority"] is not None
    assert len(data["status_history"]) >= 1

    tracking_id = data["tracking_id"]
    complaint_id = data["id"]

    # Test tracking lookup
    track_resp = client.get(f"/api/complaints/track/{tracking_id}?phone=+919876543210")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["tracking_id"] == tracking_id

    # Test Admin Department Assignment
    assign_resp = client.patch(
        f"/api/complaints/{complaint_id}/assign",
        json={
            "department_id": "d0000004-0000-0000-0000-000000000004",
            "department_name": "Electricity",
            "officer_name": "Venkatesh Murthy",
            "notes": "Urgent wire inspection required",
            "notify_citizen": False
        }
    )
    assert assign_resp.status_code == 200
    assign_data = assign_resp.json()
    assert assign_data["assigned_department_name"] == "Electricity"
    assert assign_data["status"] == "Assigned"

    # Test Admin Status Update
    status_resp = client.patch(
        f"/api/complaints/{complaint_id}/status",
        json={
            "status": "In Progress",
            "remarks": "Lineman dispatched to replace broken pole.",
            "notify_citizen": False
        }
    )
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "In Progress"
    assert len(status_data["status_history"]) >= 3


def test_analytics_summary():
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "category_distribution" in data
    assert "monthly_trends" in data
    assert data["total_complaints"] >= 6
