"""
Pydantic Schemas for Meta WhatsApp Cloud API & Simulation Mode
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class WhatsAppSimulationRequest(BaseModel):
    phone_number: str = Field(..., description="Citizen's phone number e.g. +919845123456")
    message_text: str = Field(..., description="Message sent by citizen e.g. 'Hi', '1', 'Water pipe burst'")
    media_url: Optional[str] = None


class WhatsAppSimulationResponse(BaseModel):
    phone_number: str
    bot_reply: str
    current_step: str
    collected_data: Dict[str, Any]
    complaint_created: Optional[bool] = False
    tracking_id: Optional[str] = None


# Meta Webhook Models
class MetaMessageText(BaseModel):
    body: str


class MetaMessage(BaseModel):
    from_: str = Field(..., alias="from")
    id: str
    timestamp: str
    type: str = "text"
    text: Optional[MetaMessageText] = None
    image: Optional[Dict[str, Any]] = None
    interactive: Optional[Dict[str, Any]] = None


class MetaValue(BaseModel):
    messaging_product: str = "whatsapp"
    metadata: Dict[str, Any] = {}
    contacts: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[MetaMessage]] = None


class MetaChange(BaseModel):
    value: MetaValue
    field: str


class MetaEntry(BaseModel):
    id: str
    changes: List[MetaChange]


class MetaWebhookPayload(BaseModel):
    object: str = "whatsapp_business_account"
    entry: List[MetaEntry]
