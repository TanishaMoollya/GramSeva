"""
Integration tests for WhatsApp Webhook & Conversational Intake Flow
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_meta_webhook_verification():
    # Success case with correct verify token
    resp = client.get(
        "/api/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "gramseva_webhook_secret_token_2026",
            "hub.challenge": "11559955"
        }
    )
    assert resp.status_code == 200
    assert resp.text == "11559955"

    # Unauthorized case with incorrect token
    bad_resp = client.get(
        "/api/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "11559955"
        }
    )
    assert bad_resp.status_code == 403


def test_whatsapp_complete_conversation_flow():
    phone = "+919999888877"

    # Step 1: Citizen says "Hi"
    r1 = client.post("/api/whatsapp/simulate", json={"phone_number": phone, "message_text": "Hi"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["current_step"] == "SELECT_CATEGORY"
    assert "Streetlight" in d1["bot_reply"]

    # Step 2: Citizen chooses category 4 (Water supply)
    r2 = client.post("/api/whatsapp/simulate", json={"phone_number": phone, "message_text": "4"})
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["current_step"] == "ENTER_DESCRIPTION"
    assert "Water supply" in d2["bot_reply"]

    # Step 3: Citizen enters description
    r3 = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": "Borewell motor burnt out, no water in entire street for two days."
    })
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["current_step"] == "ENTER_LOCATION"

    # Step 4: Citizen enters location
    r4 = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": "Harohalli, Ward 1, Behind Primary Health Center"
    })
    assert r4.status_code == 200
    d4 = r4.json()
    assert d4["current_step"] == "ENTER_NAME"

    # Step 5: Citizen enters name
    r5 = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": "Shivanna K"
    })
    assert r5.status_code == 200
    d5 = r5.json()
    assert d5["current_step"] == "ATTACH_PHOTO"

    # Step 6: Citizen skips photo
    r6 = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": "SKIP"
    })
    assert r6.status_code == 200
    d6 = r6.json()
    assert d6["current_step"] == "CONFIRM_SUBMISSION"
    assert "Shivanna K" in d6["bot_reply"]

    # Step 7: Citizen confirms with YES
    r7 = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": "YES"
    })
    assert r7.status_code == 200
    d7 = r7.json()
    assert d7["complaint_created"] is True
    assert d7["tracking_id"].startswith("GS-")
    tracking_id = d7["tracking_id"]

    # Verify tracking via WhatsApp TRACK command
    r_track = client.post("/api/whatsapp/simulate", json={
        "phone_number": phone,
        "message_text": f"TRACK {tracking_id}"
    })
    assert r_track.status_code == 200
    assert "Submitted" in r_track.json()["bot_reply"]
