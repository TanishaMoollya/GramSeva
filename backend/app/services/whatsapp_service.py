"""
Meta WhatsApp Cloud API & State Machine Service for GramSeva.
Handles incoming webhooks, conversational grievance intake,
status updates, tracking commands, and demo simulation.
"""
import re
import uuid
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

from backend.app.config import settings
from backend.app.database import get_db, get_demo_store, get_next_tracking_id
from backend.app.services.gemini_service import classify_complaint_ai

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    "1": "Streetlight issues",
    "2": "Garbage collection",
    "3": "Potholes and road damage",
    "4": "Water supply",
    "5": "Drainage and sanitation",
    "6": "Other public issues"
}

CATEGORY_MENU_TEXT = (
    "Please select the grievance category by replying with the number (1-6):\n"
    "1️⃣ Streetlight issues\n"
    "2️⃣ Garbage collection\n"
    "3️⃣ Potholes and road damage\n"
    "4️⃣ Water supply\n"
    "5️⃣ Drainage and sanitation\n"
    "6️⃣ Other public issues"
)


class WhatsAppService:
    def __init__(self):
        self.processed_wamids = set()

    async def send_whatsapp_message(self, recipient_phone: str, text: str) -> bool:
        """
        Sends an outbound WhatsApp message via Meta Cloud API if configured,
        or logs to demo store.
        """
        # Clean phone number (strip '+' for Meta API)
        clean_phone = re.sub(r'\D', '', recipient_phone)
        
        # Log to demo store
        store = get_demo_store()
        store["whatsapp_messages"].append({
            "phone_number": recipient_phone,
            "direction": "outbound",
            "message_body": text,
            "created_at": datetime.utcnow().isoformat()
        })

        if not settings.is_whatsapp_configured:
            logger.info(f"[WHATSAPP DEMO OUTBOUND to {recipient_phone}]: {text}")
            return True

        url = f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {"body": text}
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in [200, 201]:
                    logger.info(f"Meta WhatsApp message sent successfully to {recipient_phone}")
                    return True
                else:
                    logger.error(f"Meta WhatsApp API error: {resp.status_code} {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send Meta WhatsApp message: {e}")
            return False

    async def send_status_notification(
        self, 
        recipient_phone: str, 
        tracking_id: str, 
        new_status: str, 
        department_name: Optional[str] = None, 
        remarks: Optional[str] = None
    ) -> bool:
        """
        Sends official grievance status update notification to citizen WhatsApp.
        """
        dept_str = f" to the {department_name} Department" if department_name else ""
        remarks_str = f"\n📝 Remarks: {remarks}" if remarks else ""

        notification_text = (
            f"🏛️ *GramSeva Grievance Update*\n\n"
            f"Dear Citizen, your complaint *{tracking_id}* has been updated{dept_str}.\n\n"
            f"📌 *Current Status:* {new_status}"
            f"{remarks_str}\n\n"
            f"Track real-time progress on GramSeva Citizen Portal or reply with `TRACK {tracking_id}`."
        )

        # Store notification record
        store = get_demo_store()
        store["notifications"].append({
            "recipient_phone": recipient_phone,
            "channel": "whatsapp",
            "message_body": notification_text,
            "status": "sent",
            "sent_at": datetime.utcnow().isoformat()
        })

        return await self.send_whatsapp_message(recipient_phone, notification_text)

    def _get_conversation(self, phone_number: str) -> Dict[str, Any]:
        store = get_demo_store()
        if phone_number not in store["whatsapp_conversations"]:
            store["whatsapp_conversations"][phone_number] = {
                "phone_number": phone_number,
                "current_step": "WELCOME",
                "collected_data": {},
                "last_interaction_at": datetime.utcnow().isoformat()
            }
        return store["whatsapp_conversations"][phone_number]

    def _update_conversation(self, phone_number: str, step: str, data: Optional[Dict[str, Any]] = None):
        store = get_demo_store()
        conv = self._get_conversation(phone_number)
        conv["current_step"] = step
        if data:
            conv["collected_data"].update(data)
        conv["last_interaction_at"] = datetime.utcnow().isoformat()

    def _reset_conversation(self, phone_number: str):
        store = get_demo_store()
        store["whatsapp_conversations"][phone_number] = {
            "phone_number": phone_number,
            "current_step": "WELCOME",
            "collected_data": {},
            "last_interaction_at": datetime.utcnow().isoformat()
        }

    async def process_incoming_message(
        self,
        phone_number: str,
        message_body: str,
        media_url: Optional[str] = None,
        wamid: Optional[str] = None
    ) -> Tuple[str, str, Dict[str, Any], Optional[str]]:
        """
        State machine driving the WhatsApp intake flow.
        Returns: (bot_reply, current_step, collected_data, generated_tracking_id)
        """
        # Protect against duplicate webhook deliveries
        if wamid:
            if wamid in self.processed_wamids:
                logger.info(f"Duplicate WhatsApp webhook event skipped: {wamid}")
                return "Duplicate message ignored", "ALREADY_PROCESSED", {}, None
            self.processed_wamids.add(wamid)

        # Record incoming message
        store = get_demo_store()
        store["whatsapp_messages"].append({
            "wamid": wamid,
            "phone_number": phone_number,
            "direction": "inbound",
            "message_body": message_body,
            "media_url": media_url,
            "created_at": datetime.utcnow().isoformat()
        })

        raw_text = message_body.strip()
        text_upper = raw_text.upper()

        # Universal Commands
        if text_upper in ["RESET", "RESTART", "MENU", "CANCEL"]:
            self._reset_conversation(phone_number)
            reply = (
                "🔄 *GramSeva Session Reset*\n\n"
                "Namaskara! Welcome to *GramSeva* — AI-Powered Panchayat Grievance Redressal Portal.\n\n"
                "How can we assist you today?\n"
                "Reply with:\n"
                "• *1* — Register a New Complaint\n"
                "• *TRACK <ID>* — Track Complaint (e.g. `TRACK GS-2026-1001`)\n"
                "• *HELP* — Show Assistance Menu"
            )
            return reply, "WELCOME", {}, None

        if text_upper.startswith("TRACK"):
            parts = raw_text.split()
            if len(parts) > 1:
                target_id = parts[1].strip().upper()
                return await self._handle_tracking_lookup(target_id, phone_number)
            else:
                return (
                    "🔍 To track your complaint, please reply with `TRACK <COMPLAINT_ID>`.\n"
                    "Example: `TRACK GS-2026-1001`",
                    "AWAITING_TRACKING_ID",
                    {},
                    None
                )

        if text_upper == "HELP":
            reply = (
                "ℹ️ *GramSeva WhatsApp Help Desk*\n\n"
                "You can register civic issues or track your submitted complaints anytime.\n\n"
                "Commands:\n"
                "• Send *Hi* or *1* to start complaint registration\n"
                "• Send *TRACK <ID>* to check status (e.g. `TRACK GS-2026-1001`)\n"
                "• Send *RESET* to restart this session\n\n"
                "Grievance Categories:\n"
                "1. Streetlight issues\n2. Garbage collection\n3. Potholes & road damage\n"
                "4. Water supply\n5. Drainage & sanitation\n6. Other public issues"
            )
            return reply, "HELP", {}, None

        # State Machine Transitions
        conv = self._get_conversation(phone_number)
        step = conv["current_step"]
        data = conv["collected_data"]

        # STEP 1: WELCOME
        if step == "WELCOME":
            if raw_text.lower() in ["1", "register", "complaint", "hi", "hello", "namaskara", "namaste", "start"]:
                self._update_conversation(phone_number, "SELECT_CATEGORY")
                reply = (
                    "🏛️ *Welcome to GramSeva Citizen Portal*\n\n"
                    "We are here to resolve village civic grievances quickly and transparently.\n\n"
                    f"{CATEGORY_MENU_TEXT}"
                )
                return reply, "SELECT_CATEGORY", data, None
            else:
                reply = (
                    "Namaskara! Welcome to *GramSeva*.\n\n"
                    "Reply with:\n"
                    "• *1* or *Hi* — Register a New Complaint\n"
                    "• *TRACK <ID>* — Check Status\n"
                    "• *HELP* — Information & Guidance"
                )
                return reply, "WELCOME", data, None

        # STEP 2: SELECT CATEGORY
        if step == "SELECT_CATEGORY":
            selected_cat = CATEGORY_MAP.get(raw_text)
            if not selected_cat:
                for k, v in CATEGORY_MAP.items():
                    if v.lower() in raw_text.lower():
                        selected_cat = v
                        break

            if not selected_cat:
                return (
                    f"⚠️ Please enter a valid number (1-6) from the list below:\n\n{CATEGORY_MENU_TEXT}",
                    "SELECT_CATEGORY",
                    data,
                    None
                )

            self._update_conversation(phone_number, "ENTER_DESCRIPTION", {"category": selected_cat})
            reply = (
                f"✅ Category chosen: *{selected_cat}*\n\n"
                "Please describe the problem in detail (e.g., location specifics, duration, danger, or severity):"
            )
            return reply, "ENTER_DESCRIPTION", conv["collected_data"], None

        # STEP 3: ENTER DESCRIPTION
        if step == "ENTER_DESCRIPTION":
            if len(raw_text) < 8:
                return (
                    "⚠️ Please provide a slightly more descriptive explanation (at least 8 characters) so the Panchayat can take prompt action.",
                    "ENTER_DESCRIPTION",
                    data,
                    None
                )

            self._update_conversation(phone_number, "ENTER_LOCATION", {"description": raw_text})
            reply = (
                "📍 *Location Details*\n\n"
                "Please reply with your *Village Name, Ward Number, and Landmark/Street Address*.\n"
                "Example: `Harohalli, Ward 3, Near Primary School`"
            )
            return reply, "ENTER_LOCATION", conv["collected_data"], None

        # STEP 4: ENTER LOCATION
        if step == "ENTER_LOCATION":
            parts = [p.strip() for p in raw_text.split(",")]
            village = parts[0] if len(parts) > 0 else "Harohalli Panchayat"
            ward = parts[1] if len(parts) > 1 else "Ward 1"
            address = ", ".join(parts[2:]) if len(parts) > 2 else raw_text

            self._update_conversation(phone_number, "ENTER_NAME", {
                "village_name": village,
                "ward_number": ward,
                "address": address
            })
            reply = (
                "👤 Please enter your *Full Name* for the complaint record:"
            )
            return reply, "ENTER_NAME", conv["collected_data"], None

        # STEP 5: ENTER CITIZEN NAME
        if step == "ENTER_NAME":
            citizen_name = raw_text.strip()
            if len(citizen_name) < 2:
                return ("⚠️ Please enter a valid name.", "ENTER_NAME", data, None)

            self._update_conversation(phone_number, "ATTACH_PHOTO", {"citizen_name": citizen_name})
            reply = (
                "📷 *Optional Photo*\n\n"
                "If you have a photo of the grievance, please send it now, or send a photo link.\n"
                "Alternatively, reply with *SKIP* to proceed without a photo."
            )
            return reply, "ATTACH_PHOTO", conv["collected_data"], None

        # STEP 6: ATTACH PHOTO
        if step == "ATTACH_PHOTO":
            photo_url = None
            if media_url:
                photo_url = media_url
            elif raw_text.lower() not in ["skip", "no", "none"]:
                if raw_text.startswith("http://") or raw_text.startswith("https://"):
                    photo_url = raw_text

            self._update_conversation(phone_number, "CONFIRM_SUBMISSION", {"photo_url": photo_url})
            d = conv["collected_data"]

            summary_box = (
                "📋 *Please Review Your Complaint Summary:*\n"
                "──────────────────────────\n"
                f"• *Citizen:* {d.get('citizen_name')}\n"
                f"• *Phone:* {phone_number}\n"
                f"• *Category:* {d.get('category')}\n"
                f"• *Description:* {d.get('description')}\n"
                f"• *Village:* {d.get('village_name')}\n"
                f"• *Ward:* {d.get('ward_number')}\n"
                f"• *Address:* {d.get('address')}\n"
                f"• *Photo:* {'Attached' if d.get('photo_url') else 'None'}\n"
                "──────────────────────────\n\n"
                "Reply *YES* to submit this grievance to the Gram Panchayat, or *NO* to cancel."
            )
            return summary_box, "CONFIRM_SUBMISSION", conv["collected_data"], None

        # STEP 7: CONFIRM SUBMISSION
        if step == "CONFIRM_SUBMISSION":
            if text_upper in ["YES", "Y", "CONFIRM", "SUBMIT"]:
                d = conv["collected_data"]
                tracking_id, comp_record = await self._create_complaint_from_whatsapp(phone_number, d)
                self._reset_conversation(phone_number)

                success_msg = (
                    "🎉 *Grievance Successfully Registered!*\n\n"
                    f"Your Unique Complaint ID: *{tracking_id}*\n"
                    f"Status: *Submitted*\n"
                    f"Assigned Panchayat: *{d.get('village_name')}*\n\n"
                    "Our AI grievance engine has classified your complaint and notified the respective department.\n\n"
                    f"To track updates anytime, simply send:\n"
                    f"`TRACK {tracking_id}`\n\n"
                    "Thank you for being an active citizen of Gram Panchayat!"
                )
                return success_msg, "COMPLETED", d, tracking_id

            elif text_upper in ["NO", "N", "CANCEL"]:
                self._reset_conversation(phone_number)
                return ("❌ Complaint registration cancelled. Send *1* or *Hi* whenever you wish to start again.", "WELCOME", {}, None)
            else:
                return ("⚠️ Please reply *YES* to confirm or *NO* to cancel.", "CONFIRM_SUBMISSION", data, None)

        # Fallback
        self._reset_conversation(phone_number)
        return ("Welcome to GramSeva! Send *1* to file a complaint or *HELP* for options.", "WELCOME", {}, None)

    async def _create_complaint_from_whatsapp(self, phone: str, data: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """
        Creates a complaint record in the SAME database complaints table as the website.
        Runs Gemini AI classification.
        """
        tracking_id = get_next_tracking_id()
        complaint_id = str(uuid.uuid4())

        # Run AI classification
        ai_res = await classify_complaint_ai(data.get("description", ""), data.get("category", "Other public issues"))

        valid_priorities = {"Low", "Medium", "High", "Critical"}
        raw_prio = ai_res.get("priority")
        validated_prio = raw_prio if raw_prio in valid_priorities else "Medium"

        record = {
            "id": complaint_id,
            "tracking_id": tracking_id,
            "citizen_name": data.get("citizen_name", "WhatsApp Citizen"),
            "citizen_phone": phone,
            "category": data.get("category", "Other public issues"),
            "description": data.get("description", ""),
            "village_name": data.get("village_name", "Rural Gram Panchayat"),
            "ward_number": data.get("ward_number", "Ward 1"),
            "address": data.get("address", "Rural Location"),
            "latitude": 12.6582,
            "longitude": 77.4521,
            "source": "whatsapp",
            "status": "Submitted",
            "priority": validated_prio,
            "ai_category": ai_res.get("category"),
            "ai_priority": validated_prio,
            "ai_department": ai_res.get("department"),
            "ai_summary": ai_res.get("summary"),
            "ai_confidence": ai_res.get("confidence", 0.90),
            "ai_reviewed": False,
            "ai_overridden": False,
            "assigned_department_id": None,
            "assigned_department_name": None,
            "assigned_officer_name": None,
            "resolution_remarks": None,
            "rejection_reason": None,
            "resolved_at": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Store in Supabase or demo store
        sb = get_db()
        if sb:
            for attempt in range(5):
                try:
                    sb.table("complaints").insert(record).execute()
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    if ("23505" in err_str or "duplicate key" in err_str or "complaints_tracking_id_key" in err_str) and attempt < 4:
                        new_tid = get_next_tracking_id()
                        logger.warning(f"WhatsApp tracking ID collision, auto-incrementing to {new_tid}")
                        tracking_id = new_tid
                        record["tracking_id"] = new_tid
                        continue
                    logger.error(f"Failed to insert WhatsApp complaint into Supabase: {e}")
                    break

        store = get_demo_store()
        store["complaints"].insert(0, record)

        # Initial Status History
        history_entry = {
            "id": str(uuid.uuid4()),
            "complaint_id": complaint_id,
            "previous_status": None,
            "new_status": "Submitted",
            "remarks": "Complaint submitted via GramSeva WhatsApp Bot.",
            "proof_url": None,
            "updated_by_name": f"{data.get('citizen_name')} (WhatsApp)",
            "created_at": datetime.utcnow().isoformat()
        }
        if sb:
            try:
                sb.table("complaint_status_history").insert(history_entry).execute()
            except Exception:
                pass
        store["status_history"].append(history_entry)

        # Attachment if provided
        if data.get("photo_url"):
            att = {
                "id": str(uuid.uuid4()),
                "complaint_id": complaint_id,
                "file_name": "whatsapp_upload.jpg",
                "file_url": data.get("photo_url"),
                "file_type": "image/jpeg",
                "attachment_type": "complaint",
                "uploaded_at": datetime.utcnow().isoformat()
            }
            if sb:
                try:
                    sb.table("complaint_attachments").insert(att).execute()
                except Exception:
                    pass
            store["attachments"].append(att)

        return tracking_id, record

    async def _handle_tracking_lookup(self, target_id: str, phone: str) -> Tuple[str, str, Dict[str, Any], Optional[str]]:
        store = get_demo_store()
        complaint = next((c for c in store["complaints"] if c["tracking_id"].upper() == target_id.upper()), None)
        
        # Also check Supabase if live
        sb = get_db()
        if not complaint and sb:
            try:
                res = sb.table("complaints").select("*").eq("tracking_id", target_id).execute()
                if res.data:
                    complaint = res.data[0]
            except Exception:
                pass

        if not complaint:
            return (
                f"❌ No complaint found with ID *{target_id}*. Please verify the number and try again.",
                "WELCOME",
                {},
                None
            )

        status = complaint.get("status", "Submitted")
        dept = complaint.get("assigned_department_name") or "Under Review / Unassigned"
        remarks = complaint.get("resolution_remarks") or complaint.get("rejection_reason") or "Under executive process."

        status_icons = {
            "Submitted": "📩",
            "Under Review": "🔍",
            "Assigned": "👷",
            "In Progress": "⚙️",
            "Resolved": "✅",
            "Rejected": "❌"
        }
        icon = status_icons.get(status, "📌")

        reply = (
            f"🔍 *Grievance Status: {target_id}*\n"
            "──────────────────────────\n"
            f"• *Status:* {icon} *{status}*\n"
            f"• *Category:* {complaint.get('category')}\n"
            f"• *Village/Ward:* {complaint.get('village_name')} ({complaint.get('ward_number')})\n"
            f"• *Department:* {dept}\n"
            f"• *Latest Remarks:* {remarks}\n"
            f"• *Submitted On:* {complaint.get('created_at', '')[:10]}\n"
            "──────────────────────────\n\n"
            "View full timeline & photo proof on the GramSeva Citizen Portal."
        )
        return reply, "WELCOME", {}, None


whatsapp_service = WhatsAppService()
