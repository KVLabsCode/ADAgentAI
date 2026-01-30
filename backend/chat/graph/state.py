"""LangGraph state schema for ad platform chat.

Defines the shared state that flows through the graph nodes.
Uses TypedDict with Annotated fields for proper state management.
"""

from typing import TypedDict, Annotated, Optional, Sequence
from operator import add
from langchain_core.messages import BaseMessage


def merge_dicts(left: dict, right: dict) -> dict:
    """Merge two dicts, with right taking precedence."""
    return {**left, **right}


def merge_tool_calls(left: list, right: list) -> list:
    """Merge tool_calls lists by updating existing entries by ID.

    When a tool_call with the same 'id' exists in both lists,
    the right (newer) entry takes precedence. New entries are appended.

    This prevents duplicate tool calls when tool_executor updates a pending call.
    """
    if not left:
        return list(right) if right else []
    if not right:
        return list(left)

    # Build a dict of existing tool calls by id
    merged = {tc.get("id"): tc for tc in left if tc.get("id")}

    # Update/add from right list
    for tc in right:
        tc_id = tc.get("id")
        if tc_id:
            merged[tc_id] = tc  # Update or add

    return list(merged.values())


class UserContext(TypedDict, total=False):
    """User-specific context loaded at graph start."""
    user_id: str
    organization_id: Optional[str]
    # Provider entities (populated by entity loader)
    accounts: list[dict]  # [{id, name, type, identifier}]
    apps: list[dict]  # [{id, name, platform}]
    ad_units: list[dict]  # [{id, name, format}]
    # Connected networks (admob, gam, mintegral, unity, etc.)
    connected_networks: list[str]  # Network names that are connected
    # Context mode from frontend settings
    context_mode: str  # "soft" or "strict"
    enabled_accounts: list[str]  # Account IDs enabled in context settings


class RoutingResult(TypedDict, total=False):
    """Result from query classification."""
    service: str  # "admob", "admanager", "general"
    capability: str  # "inventory", "reporting", "mediation", etc.
    thinking: str  # Router's reasoning
    execution_path: str  # "reactive" | "workflow" - determines model selection


class ToolCall(TypedDict, total=False):
    """A tool call pending or completed."""
    id: str  # Unique tool call ID
    name: str  # Tool name
    args: dict  # Tool arguments
    result: Optional[str]  # Tool result (None if pending)
    is_dangerous: bool  # Whether this is a write operation
    approval_status: Optional[str]  # "pending", "approved", "denied"


class ApprovalRequest(TypedDict, total=False):
    """A tool awaiting human approval."""
    approval_id: str
    tool_name: str
    tool_args: dict
    tool_call_id: str
    # Schema info for parameter form
    param_schema: Optional[dict]


class GraphState(TypedDict, total=False):
    """Main graph state flowing through all nodes.

    Using Annotated with reducers allows parallel updates to list fields.
    Messages use 'add' reducer to append new messages.
    """
    # Core conversation
    messages: Annotated[Sequence[BaseMessage], add]

    # User input
    user_query: str

    # User context (loaded at start)
    user_context: UserContext

    # Routing (set by router node)
    routing: RoutingResult

    # Tool execution tracking
    tool_calls: Annotated[list[ToolCall], merge_tool_calls]  # Merge by ID, update existing

    # Human-in-loop approval (set when dangerous tool needs approval)
    pending_approval: Optional[ApprovalRequest]

    # Final response (set by specialist after all tools complete)
    response: Optional[str]

    # Partial response (text generated before tool calls)
    partial_response: Optional[str]

    # Agent thinking (extended thinking from Claude)
    thinking: Optional[str]

    # Error handling
    error: Optional[str]

    # Stream tracking
    stream_id: Optional[str]

    # Selected model from frontend
    selected_model: Optional[str]

    # Conversation history for context
    conversation_history: Optional[list[dict]]

    # Entity grounding (populated by entity loader)
    available_accounts: Optional[list[dict]]  # Available AdMob accounts and GAM networks
    available_apps: Optional[list[dict]]  # Available apps with IDs and names
    available_ad_units: Optional[list[dict]]  # Available ad units with IDs, names, and formats
    context_mode: Optional[str]  # "soft" or "strict" from frontend settings
    entity_system_prompt: Optional[str]  # Entity-grounded prompt section

    # Action required (populated by entity_loader when user needs to take action)
    action_required: Optional[dict]  # {action_type, message, deep_link, blocking, metadata}

    # Token tracking for metrics (set by specialist)
    token_usage: Optional[dict]  # {"input_tokens": N, "output_tokens": N}
    model: Optional[str]  # Model name used for the response

    # Streaming flags (set by specialist when content/thinking already streamed)
    # Prevents duplicate events in processor
    thinking_streamed: Optional[bool]
    content_streamed: Optional[bool]

    # Tool retrieval (set by tool_retriever node)
    retrieved_tools: Optional[list[str]]  # Tool names from semantic search

    # NOTE: Don't store tool objects in state - they can't be serialized by checkpointer.
    # MCP caching in loader.py handles tool reuse instead.

    # Verification (set by verifier node)
    verification_status: Optional[str]  # "complete" or "incomplete"
    verification_explanation: Optional[str]  # Why verification passed/failed
    verification_retry_hint: Optional[str]  # Hint for retry if incomplete
    verification_retry_count: Optional[int]  # Number of verification retries

    # Backflow control (set by specialist to trigger re-routing or entity refresh)
    needs_entity_refresh: Optional[bool]  # Go back to entity_loader (after creating app/ad unit)
    needs_reroute: Optional[str]  # Go back to router with this new query (topic change)
    backflow_reason: Optional[str]  # Reason for backflow (for tracing/debugging)
