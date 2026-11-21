"""
Tests for AI Grievance Classification
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_ai_classification_water():
    resp = client.post(
        "/api/ai/classify",
        json={
            "description": "There has been no water supply in our ward for three days and main tap is leaking.",
            "category": "Water supply"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "Water supply"
    assert data["department"] == "Water Supply"
    assert data["priority"] in ["High", "Critical", "Medium"]
    assert len(data["summary"]) > 0


def test_ai_classification_streetlight():
    resp = client.post(
        "/api/ai/classify",
        json={
            "description": "Streetlight pole short-circuited and sparks are flying near school playground.",
            "category": "Streetlight issues"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "Streetlight issues"
    assert data["department"] == "Electricity"
    assert data["priority"] in ["High", "Critical"]
