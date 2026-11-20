"""REST API endpoints for conversation session management, history listing, and message retrieval."""

import uuid
from typing import Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ecommerce_agent.services.auth import resolve_user_id_from_request

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


class ConversationSummary(BaseModel):
    id: str
    title: str
    updated_at: float | None = None
    message_count: int = 0
    preview: str = ""


class ChatMessageItem(BaseModel):
    id: str
    role: str
    text: str
    timestamp: float | None = None
    feedback: str | None = None


# Persistent in-memory feedback registry
_MESSAGE_FEEDBACK_STORE: dict[str, str] = {}


class MessageFeedbackRequest(BaseModel):
    feedback: str = Field(..., pattern="^(up|down)$")


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)


class CreateConversationRequest(BaseModel):
    session_id: str | None = Field(None, description="Optional custom session ID; generates UUID if omitted")


def _extract_text_from_event(event: Any) -> str:
    """Extracts text content from an ADK Event object."""
    if not hasattr(event, "content") or not event.content:
        return ""
    parts = getattr(event.content, "parts", None) or []
    texts = []
    for p in parts:
        txt = getattr(p, "text", None)
        if txt:
            texts.append(txt)
    return "".join(texts).strip()


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(request: Request) -> list[ConversationSummary]:
    """Lists saved conversation sessions for the authenticated customer."""
    user_id = str(resolve_user_id_from_request(request))
    session_service = getattr(request.app.state, "session_service", None)
    if not session_service:
        return []

    try:
        res = await session_service.list_sessions(
            app_name="ecommerce_agent",
            user_id=user_id,
        )
        sessions = getattr(res, "sessions", []) or []
        summaries: list[ConversationSummary] = []

        for s in sessions:
            sid = getattr(s, "id", "")
            events = getattr(s, "events", []) or []
            updated_at = getattr(s, "last_update_time", None)

            # Determine title & preview from first user message
            title = "New Conversation"
            preview = ""
            for evt in events:
                role = getattr(getattr(evt, "content", None), "role", "")
                txt = _extract_text_from_event(evt)
                if role == "user" and txt:
                    title = txt[:60] + ("..." if len(txt) > 60 else "")
                    preview = txt[:120]
                    break
                elif txt and not preview:
                    preview = txt[:120]

            summaries.append(
                ConversationSummary(
                    id=sid,
                    title=title,
                    updated_at=updated_at,
                    message_count=len(events),
                    preview=preview,
                )
            )

        # Sort newest updated first
        summaries.sort(key=lambda x: x.updated_at or 0, reverse=True)
        return summaries
    except Exception as e:
        # Graceful return if no sessions found
        return []


@router.post("", response_model=ConversationSummary)
async def create_conversation(req: CreateConversationRequest, request: Request) -> ConversationSummary:
    """Initializes a new conversation session for the customer."""
    user_id = str(resolve_user_id_from_request(request))
    session_service = getattr(request.app.state, "session_service", None)
    if not session_service:
        raise HTTPException(status_code=500, detail="ADK session service not initialized.")

    sid = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"
    try:
        session = await session_service.create_session(
            app_name="ecommerce_agent",
            user_id=user_id,
            session_id=sid,
        )
        return ConversationSummary(
            id=sid,
            title="New Conversation",
            updated_at=getattr(session, "last_update_time", None),
            message_count=0,
            preview="",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation session: {str(e)}")


@router.get("/{session_id}/messages", response_model=list[ChatMessageItem])
async def get_conversation_messages(session_id: str, request: Request) -> list[ChatMessageItem]:
    """Retrieves formatted chat history for a session so the user can resume where they left off."""
    user_id = str(resolve_user_id_from_request(request))
    session_service = getattr(request.app.state, "session_service", None)
    if not session_service:
        return []

    try:
        session = await session_service.get_session(
            app_name="ecommerce_agent",
            user_id=user_id,
            session_id=session_id,
        )
        if not session:
            raise HTTPException(status_code=404, detail=f"Conversation session '{session_id}' not found.")

        events = getattr(session, "events", []) or []
        messages: list[ChatMessageItem] = []

        for idx, evt in enumerate(events):
            txt = _extract_text_from_event(evt)
            if not txt:
                continue
            role = getattr(getattr(evt, "content", None), "role", "model")
            eid = getattr(evt, "id", None) or f"msg_{session_id}_{idx}"
            ts = getattr(evt, "timestamp", None)
            fb = _MESSAGE_FEEDBACK_STORE.get(f"{session_id}:{eid}")
            messages.append(
                ChatMessageItem(
                    id=str(eid),
                    role="model" if role == "model" else "user",
                    text=txt,
                    timestamp=ts,
                    feedback=fb,
                )
            )

        return messages
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load messages: {str(e)}")


@router.delete("/{session_id}")
async def delete_conversation(session_id: str, request: Request) -> dict[str, Any]:
    """Deletes a conversation session from the SQLite session store."""
    user_id = str(resolve_user_id_from_request(request))
    session_service = getattr(request.app.state, "session_service", None)
    if not session_service:
        raise HTTPException(status_code=500, detail="ADK session service not initialized.")

    try:
        await session_service.delete_session(
            app_name="ecommerce_agent",
            user_id=user_id,
            session_id=session_id,
        )
        return {"success": True, "message": f"Conversation session '{session_id}' deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.post("/{session_id}/messages/{message_id}/feedback")
async def record_message_feedback(
    session_id: str,
    message_id: str,
    req: MessageFeedbackRequest,
    request: Request,
) -> dict[str, Any]:
    """Records thumbs-up or thumbs-down customer feedback for an assistant response."""
    key = f"{session_id}:{message_id}"
    _MESSAGE_FEEDBACK_STORE[key] = req.feedback
    return {
        "success": True,
        "session_id": session_id,
        "message_id": message_id,
        "feedback": req.feedback,
    }
