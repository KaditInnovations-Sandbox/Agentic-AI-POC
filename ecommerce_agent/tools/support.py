"""ADK Customer Support Tools for Shopity."""

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories import orders_repo, support_repo
from ecommerce_agent.services.auth import get_current_user_id
from ecommerce_agent.services.ticket_drafts import (
    cancel_ticket_draft,
    create_ticket_draft,
    update_ticket_draft,
)


async def get_support_tickets() -> dict:
    """Retrieves all previously submitted customer support tickets for the current customer.

    Returns:
        dict: List of submitted support tickets, ticket numbers, statuses, and subjects.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            tickets = await support_repo.get_support_tickets(session, user_id=user_id)
            return {"status": "success", "data": [t.model_dump() for t in tickets]}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve support tickets: {str(e)}"}


async def prepare_support_ticket_draft(
    subject: str,
    description: str,
    order_id: int | None = None,
) -> dict:
    """Prepares an unsubmitted preview draft of a customer support ticket for customer review.

    SAFETY & INTEGRITY:
    - Creates a preview draft with an assigned Draft ID in session state.
    - Does NOT write an active ticket to the PostgreSQL database.
    - Does NOT accept unverified LLM boolean confirmations.
    - Shows the exact complaint details to the user for review.

    Args:
        subject: Brief title or summary of the issue.
        description: Detailed description of the complaint or question.
        order_id: Optional ID of the order associated with the issue.

    Returns:
        dict: Draft ID, draft details, and notification that final submission requires approval.
    """
    try:
        user_id = get_current_user_id()

        # If order_id is provided, verify it belongs to this customer
        if order_id is not None:
            async with get_db_session() as session:
                order = await orders_repo.get_order_details(
                    session, user_id=user_id, order_id=order_id
                )
                if not order:
                    return {
                        "status": "error",
                        "message": f"Order ID {order_id} was not found or does not belong to your account.",
                    }

        draft = create_ticket_draft(
            user_id=user_id,
            subject=subject.strip(),
            description=description.strip(),
            order_id=order_id,
        )
        return {
            "status": "success",
            "message": "Support ticket draft created. Please review the details below before submission.",
            "data": draft,
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to prepare ticket draft: {str(e)}"}


async def update_support_ticket_draft(
    draft_id: str,
    subject: str | None = None,
    description: str | None = None,
) -> dict:
    """Updates the subject or description of an existing pending support ticket draft.

    Use this tool whenever the customer asks to revise, change, or clarify their complaint
    or issue details on an existing preview draft rather than creating a duplicate new draft.

    Args:
        draft_id: The ID of the existing draft (e.g. DFT-XXXX).
        subject: Optional updated subject/title.
        description: Optional updated description text.

    Returns:
        dict: Updated draft details for customer review.
    """
    try:
        user_id = get_current_user_id()
        draft = update_ticket_draft(
            draft_id=draft_id,
            user_id=user_id,
            subject=subject.strip() if subject else None,
            description=description.strip() if description else None,
        )
        if not draft:
            return {
                "status": "error",
                "message": f"Draft '{draft_id}' was not found or is no longer pending.",
            }
        return {
            "status": "success",
            "message": f"Support ticket draft {draft_id} updated. Please review the revised details below.",
            "data": draft,
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to update ticket draft: {str(e)}"}


async def cancel_support_ticket_draft(draft_id: str) -> dict:
    """Cancels/discards an existing pending support ticket draft.

    Use this tool whenever the customer says they want to cancel, discard, or withdraw
    a pending complaint draft before it is submitted.

    Args:
        draft_id: The ID of the draft to cancel.

    Returns:
        dict: Cancellation confirmation.
    """
    try:
        user_id = get_current_user_id()
        ok = cancel_ticket_draft(draft_id=draft_id, user_id=user_id)
        if not ok:
            return {
                "status": "error",
                "message": f"Draft '{draft_id}' was not found or does not belong to your account.",
            }
        return {
            "status": "success",
            "message": f"Support ticket draft {draft_id} has been discarded.",
            "draft_id": draft_id,
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to cancel ticket draft: {str(e)}"}
