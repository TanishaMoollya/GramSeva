"""
Google Gemini AI Classification Service for GramSeva.
Analyzes grievance descriptions, classifies category, determines priority,
recommends department, and generates a concise summary.
"""
import json
import logging
from typing import Dict, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CATEGORIES = [
    "Streetlight issues",
    "Garbage collection",
    "Potholes and road damage",
    "Water supply",
    "Drainage and sanitation",
    "Other public issues"
]

ALLOWED_DEPARTMENTS = [
    "Sanitation",
    "Public Works",
    "Water Supply",
    "Electricity",
    "General Administration"
]

ALLOWED_PRIORITIES = ["Low", "Medium", "High", "Critical"]


def _keyword_heuristic_classifier(description: str, fallback_category: str = "Other public issues") -> Dict[str, Any]:
    """
    Intelligent rule-based fallback when Gemini API key is not configured or network is unreachable.
    Provides reliable, deterministic categorization for academic demonstration.
    """
    text = description.lower()
    
    # Priority indicators
    priority = "Medium"
    if any(k in text for k in ["accident", "burst", "electric shock", "danger", "urgent", "immediate", "flood", "emergency", "dead animal"]):
        priority = "Critical"
    elif any(k in text for k in ["hospital", "school", "children", "unsafe", "dark", "3 days", "week", "overflow", "crater", "severe"]):
        priority = "High"
    elif any(k in text for k in ["minor", "request", "suggestion", "slow"]):
        priority = "Low"

    # Category and Department matching
    if any(k in text for k in ["light", "streetlight", "bulb", "pole", "wire", "spark", "darkness", "transformer", "electricity", "current"]):
        return {
            "category": "Streetlight issues",
            "priority": priority if priority != "Medium" else "High",
            "department": "Electricity",
            "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
            "confidence": 0.91
        }
    elif any(k in text for k in ["water", "pipe", "pipeline", "leak", "borewell", "tanker", "drinking water", "tap", "motor", "pump"]):
        return {
            "category": "Water supply",
            "priority": priority if priority != "Medium" else "High",
            "department": "Water Supply",
            "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
            "confidence": 0.94
        }
    elif any(k in text for k in ["garbage", "trash", "waste", "dustbin", "litter", "smell", "odor", "dump", "cleaning", "hygiene"]):
        return {
            "category": "Garbage collection",
            "priority": priority,
            "department": "Sanitation",
            "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
            "confidence": 0.92
        }
    elif any(k in text for k in ["pothole", "road", "tar", "asphalt", "crater", "speed breaker", "bridge", "culvert"]):
        return {
            "category": "Potholes and road damage",
            "priority": priority if priority != "Medium" else "High",
            "department": "Public Works",
            "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
            "confidence": 0.93
        }
    elif any(k in text for k in ["drain", "drainage", "gutter", "sewer", "sewage", "clogged", "overflow", "stagnant"]):
        return {
            "category": "Drainage and sanitation",
            "priority": priority,
            "department": "Sanitation",
            "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
            "confidence": 0.90
        }
    
    # Default fallback
    cat = fallback_category if fallback_category in ALLOWED_CATEGORIES else "Other public issues"
    dept_map = {
        "Streetlight issues": "Electricity",
        "Water supply": "Water Supply",
        "Garbage collection": "Sanitation",
        "Potholes and road damage": "Public Works",
        "Drainage and sanitation": "Sanitation",
        "Other public issues": "General Administration"
    }
    return {
        "category": cat,
        "priority": priority,
        "department": dept_map.get(cat, "General Administration"),
        "summary": description[:120].strip() + ("..." if len(description) > 120 else ""),
        "confidence": 0.85
    }


async def classify_complaint_ai(description: str, citizen_category: str = "Other public issues") -> Dict[str, Any]:
    """
    Uses Google Gemini API to analyze grievance text.
    Validates output and falls back cleanly if key is unconfigured or call fails.
    """
    if not settings.is_gemini_configured:
        logger.info("Gemini API key not configured; using heuristic AI classifier.")
        return _keyword_heuristic_classifier(description, citizen_category)

    try:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        system_instruction = (
            "You are an AI assistant for GramSeva, an Indian rural Gram Panchayat grievance management system. "
            "Analyze the citizen's complaint description and return a JSON object with:\n"
            f"- 'category': MUST be exactly one of: {ALLOWED_CATEGORIES}\n"
            f"- 'priority': MUST be exactly one of: {ALLOWED_PRIORITIES}\n"
            f"- 'department': MUST be exactly one of: {ALLOWED_DEPARTMENTS}\n"
            "- 'summary': A concise 1-2 sentence professional summary of the problem.\n"
            "- 'confidence': A float between 0.70 and 0.99 indicating classification certainty.\n"
            "Return valid JSON only, no markdown markers or extra text."
        )

        prompt = f"Grievance Description: \"{description}\"\nCitizen Selected Category: \"{citizen_category}\""
        
        # Resilient candidate model list with auto-failover
        candidate_models = [
            settings.GEMINI_MODEL,
            "gemini-3.5-flash-lite",
            "gemini-3.6-flash",
            "gemini-3.8-flash",
        ]
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        last_error = None
        for model_name in unique_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "response_mime_type": "application/json",
                        "temperature": 0.1
                    }
                )

                raw_text = response.text.strip()
                data = json.loads(raw_text)

                # Validate fields
                category = data.get("category")
                if category not in ALLOWED_CATEGORIES:
                    category = citizen_category if citizen_category in ALLOWED_CATEGORIES else "Other public issues"

                priority = data.get("priority")
                if priority not in ALLOWED_PRIORITIES:
                    priority = "Medium"

                department = data.get("department")
                if department not in ALLOWED_DEPARTMENTS:
                    department = "General Administration"

                summary = data.get("summary") or description[:120]
                confidence = float(data.get("confidence", 0.92))

                return {
                    "category": category,
                    "priority": priority,
                    "department": department,
                    "summary": summary,
                    "confidence": min(max(confidence, 0.5), 0.99)
                }
            except Exception as model_err:
                last_error = model_err
                logger.info(f"Gemini candidate '{model_name}' busy or unavailable ({model_err}); attempting next candidate...")

        raise last_error or RuntimeError("All candidate Gemini models failed")

    except Exception as e:
        logger.warning(f"Gemini API call failed or timed out: {e}. Falling back to heuristic classifier.")
        return _keyword_heuristic_classifier(description, citizen_category)
