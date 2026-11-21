"""
Meta WhatsApp Cloud API Webhook & Interactive Simulator Router
"""
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Response, Query, HTTPException, status
from backend.app.config import settings
from backend.app.models.whatsapp import (
    WhatsAppSimulationRequest,
    WhatsAppSimulationResponse
)
from backend.app.services.whatsapp_service import whatsapp_service
from backend.app.database import get_demo_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Integration"])


@router.get("/webhook")
def verify_meta_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge")
):
    """
    Meta WhatsApp Cloud API Webhook Verification.
    Used by Meta's developer dashboard to verify server ownership.
    """
    logger.info(f"Webhook verification challenge received with token: {hub_verify_token}")
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("Meta Webhook verification succeeded!")
        return Response(content=hub_challenge, media_type="text/plain")
    
    logger.warning("Meta Webhook verification failed: token mismatch.")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/webhook")
async def receive_meta_webhook(payload: Dict[str, Any]):
    """
    Meta WhatsApp Cloud API incoming message handler.
    Processes citizen grievance intake, responds with conversational bot,
    and creates complaint records in Supabase.
    """
    try:
        # Parse Meta WhatsApp payload structure
        entry_list = payload.get("entry", [])
        for entry in entry_list:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])
                
                for msg in messages:
                    sender = msg.get("from")
                    if not sender:
                        continue
                    
                    sender_phone = f"+{sender}" if not sender.startswith("+") else sender
                    wamid = msg.get("id")
                    
                    body = ""
                    media_url = None
                    msg_type = msg.get("type", "text")
                    
                    if msg_type == "text":
                        body = msg.get("text", {}).get("body", "")
                    elif msg_type == "interactive":
                        # Button or list response
                        interactive = msg.get("interactive", {})
                        if interactive.get("type") == "button_reply":
                            body = interactive.get("button_reply", {}).get("id") or interactive.get("button_reply", {}).get("title", "")
                        elif interactive.get("type") == "list_reply":
                            body = interactive.get("list_reply", {}).get("id") or interactive.get("list_reply", {}).get("title", "")
                    elif msg_type == "image":
                        media_url = msg.get("image", {}).get("url") or "https://images.unsplash.com/photo-1584467735871-8e85353a8413"
                        body = msg.get("image", {}).get("caption", "Attached Photo")
                    
                    if body or media_url:
                        # Process through State Machine
                        reply_text, step, data, tid = await whatsapp_service.process_incoming_message(
                            phone_number=sender_phone,
                            message_body=body,
                            media_url=media_url,
                            wamid=wamid
                        )
                        # Send reply back to citizen on WhatsApp
                        if reply_text and step != "ALREADY_PROCESSED":
                            await whatsapp_service.send_whatsapp_message(sender_phone, reply_text)

        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/simulate", response_model=WhatsAppSimulationResponse)
async def simulate_whatsapp_chat(req: WhatsAppSimulationRequest):
    """
    Interactive WhatsApp Chatbot Simulator.
    Allows testing the complete WhatsApp chatbot workflow from the web UI
    without needing live Meta credentials or ngrok tunnel!
    """
    reply, step, data, tid = await whatsapp_service.process_incoming_message(
        phone_number=req.phone_number,
        message_body=req.message_text,
        media_url=req.media_url
    )

    return WhatsAppSimulationResponse(
        phone_number=req.phone_number,
        bot_reply=reply,
        current_step=step,
        collected_data=data,
        complaint_created=bool(tid is not None),
        tracking_id=tid
    )


@router.get("/conversations")
def get_whatsapp_conversations():
    """
    Returns active WhatsApp conversation sessions and states.
    """
    store = get_demo_store()
    return list(store["whatsapp_conversations"].values())


@router.get("/messages")
def get_whatsapp_messages():
    """
    Returns WhatsApp incoming and outgoing message audit trail.
    """
    store = get_demo_store()
    return store["whatsapp_messages"]
