"""In-session support ticket draft management.

Drafts allow customers to preview and revise support requests before
any record is submitted to the database. In Phase 1, drafts are maintained
in conversation state to avoid unverified database mutations.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

# Process-level draft registry for current session (survives turns in memory)
_DRAFT_REGISTRY: dict[str, dict[str, Any]] = {}


def create_ticket_draft(
    user_id: int,
    subject: str,
    description: str,
    order_id: int | None = None,
) -> dict[str, Any]:
    """Creates a preview draft for a support ticket.

    Does NOT create an active support_tickets row in the database.
    """
    draft_id = f"DFT-{uuid.uuid4().hex[:8].upper()}"
    draft = {
        "draft_id": draft_id,
        "user_id": user_id,
        "order_id": order_id,
        "subject": subject,
        "description": description,
        "status": "DRAFT_PENDING_APPROVAL",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notice": (
            "This is an unsubmitted draft. A support ticket has NOT yet been created. "
            "Final submission requires authenticated user confirmation."
        ),
    }
    _DRAFT_REGISTRY[draft_id] = draft
    return draft


def get_ticket_draft(draft_id: str, user_id: int) -> dict[str, Any] | None:
    """Retrieves an existing draft ensuring customer ownership."""
    draft = _DRAFT_REGISTRY.get(draft_id)
    if draft and draft["user_id"] == user_id:
        return draft
    return None


def list_user_drafts(user_id: int) -> list[dict[str, Any]]:
    """Lists all pending drafts for the specified user."""
    return [d for d in _DRAFT_REGISTRY.values() if d["user_id"] == user_id]


def update_ticket_draft(
    draft_id: str,
    user_id: int,
    subject: str | None = None,
    description: str | None = None,
) -> dict[str, Any] | None:
    """Updates the subject or description of an existing pending support draft."""
    draft = _DRAFT_REGISTRY.get(draft_id)
    if not draft or draft["user_id"] != user_id:
        return None

    if draft.get("status") != "DRAFT_PENDING_APPROVAL":
        return None

    if subject:
        draft["subject"] = subject
    if description:
        draft["description"] = description
    draft["updated_at"] = datetime.now(timezone.utc).isoformat()
    return draft


def cancel_ticket_draft(draft_id: str, user_id: int) -> bool:
    """Cancels/discards an existing pending support draft."""
    draft = _DRAFT_REGISTRY.get(draft_id)
    if not draft or draft["user_id"] != user_id:
        return False

    draft["status"] = "CANCELLED"
    return True
