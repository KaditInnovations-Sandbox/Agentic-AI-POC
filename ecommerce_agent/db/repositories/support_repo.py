"""Customer support repository: retrieving submitted tickets."""

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ecommerce_agent.db.models import SupportTicket
from ecommerce_agent.schemas.support import SupportTicketDetail


async def get_support_tickets(
    session: AsyncSession,
    user_id: int,
) -> list[SupportTicketDetail]:
    """Retrieves all submitted support tickets for the current customer."""
    stmt = (
        select(SupportTicket)
        .where(SupportTicket.user_id == user_id)
        .order_by(desc(SupportTicket.created_at))
    )
    res = await session.execute(stmt)
    tickets = res.scalars().all()

    return [
        SupportTicketDetail(
            id=t.id,
            ticket_number=t.ticket_number,
            user_id=t.user_id,
            order_id=t.order_id,
            subject=t.subject,
            description=t.description,
            status=t.status,
            created_at=t.created_at.strftime("%Y-%m-%d %H:%M UTC"),
        )
        for t in tickets
    ]
