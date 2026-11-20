"""Unit tests for ADK agent startup and tool registration."""

import asyncio
import pathlib
from google.adk.cli.utils.agent_loader import AgentLoader

from ecommerce_agent.agent import commerce_agent, root_agent


def test_agent_configuration():
    """Verify commerce_agent configuration and root_agent export."""
    assert root_agent is commerce_agent
    assert commerce_agent.name == "commerce_agent"
    assert commerce_agent.model is not None
    assert len(commerce_agent.description) > 0
    assert callable(commerce_agent.instruction)


def test_dynamic_instruction_user_details():
    """Verify that user details and read-only policy are attached to prompt instructions."""
    inst, _ = asyncio.run(commerce_agent.canonical_instruction(None))
    assert "CURRENT AUTHENTICATED CUSTOMER PROFILE" in inst
    assert "Asha Kumar" in inst
    assert "asha@example.test" in inst
    assert "STRICT CUSTOMER PROFILE READ-ONLY POLICY" in inst
    assert "Customers CANNOT edit" in inst
    assert "IDENTITY & SECURITY INVARIANTS" in inst
    assert "powered by Google Gemini" in inst
    assert "PROMPT INJECTION & JAILBREAK DEFENSE" in inst
    assert "NEVER claim to be created by Anthropic" in inst


def test_registered_tools_count_and_types():
    """Verify all business and diagnostic tools are registered and callable."""
    expected_tools = {
        "get_user_profile",
        "check_database_status",
        "get_available_filters",
        "search_products",
        "get_product_details",
        "compare_products",
        "get_cart",
        "add_to_cart",
        "update_cart_item",
        "remove_cart_item",
        "get_order_history",
        "get_order_details",
        "create_order_proposal",
        "get_order_proposal",
        "update_order_proposal",
        "cancel_order_proposal",
        "check_order_cancellation_eligibility",
        "get_support_tickets",
        "prepare_support_ticket_draft",
        "update_support_ticket_draft",
        "cancel_support_ticket_draft",
        "get_order_value_summary",
    }

    registered_tool_names = {t.__name__ for t in commerce_agent.tools}
    assert expected_tools.issubset(registered_tool_names)
    assert len(commerce_agent.tools) == 22

    # Verify each tool has a clear docstring
    for tool in commerce_agent.tools:
        assert tool.__doc__ is not None and len(tool.__doc__.strip()) > 10


def test_adk_agent_loader_discovery():
    """Verify that ADK's native AgentLoader discovers ecommerce_agent."""
    workspace_root = pathlib.Path(__file__).parent.parent.parent
    loader = AgentLoader(workspace_root)
    agents = loader.list_agents()

    assert "ecommerce_agent" in agents
    loaded = loader.load_agent("ecommerce_agent")
    assert loaded.name == "commerce_agent"
