"""LangGraph builder - constructs the StateGraph for ad platform chat.

This module wires up all nodes into a compilable graph with:
- Conditional routing based on state
- PostgresSaver checkpointer for state persistence
- Interrupt handling for tool approvals
"""

import os
import asyncio
from typing import Literal, TYPE_CHECKING

if TYPE_CHECKING:
    pass

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langsmith import traceable

from .state import GraphState
from .nodes.router import router_node
from .nodes.entity_loader import entity_loader_node
from .nodes.specialist import specialist_node
from .nodes.tool_executor import tool_executor_node


# Database URL for checkpointer
DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _should_continue_after_specialist(state: GraphState) -> Literal["tool_executor", "end"]:
    """Determine next step after specialist node.

    If there are pending tool calls, route to tool_executor.
    If we have a response (no tool calls), we're done.
    """
    tool_calls = state.get("tool_calls", [])
    pending_tools = [tc for tc in tool_calls if tc.get("result") is None]

    if pending_tools:
        return "tool_executor"
    return "end"


def _should_continue_after_tool_executor(state: GraphState) -> Literal["specialist", "end"]:
    """Determine next step after tool execution.

    After executing tools, return to specialist for:
    - Processing tool results
    - Potentially calling more tools
    - Generating final response

    If there's an error, end the graph.
    """
    if state.get("error"):
        return "end"

    # Check if all tools are executed
    tool_calls = state.get("tool_calls", [])
    pending_tools = [tc for tc in tool_calls if tc.get("result") is None]

    if pending_tools:
        # Still have pending tools (should not happen normally)
        return "specialist"

    # All tools done, return to specialist for response synthesis
    return "specialist"


def _handle_routing_result(state: GraphState) -> Literal["entity_loader", "end"]:
    """Route based on query classification.

    If routing succeeded, continue to entity loader.
    If there's an error (e.g., couldn't classify), end early.
    """
    if state.get("error"):
        return "end"

    routing = state.get("routing", {})
    if not routing.get("service"):
        return "end"

    return "entity_loader"


def build_graph() -> StateGraph:
    """Build the ad platform chat StateGraph.

    Graph structure:
        START
          │
          ▼
        router ──────────────────┐
          │                      │ (error)
          ▼                      ▼
    entity_loader               END
          │
          ▼
      specialist ◄───────────────┐
          │                      │
          ├──► tool_executor ────┘
          │
          ▼
         END

    Returns:
        Uncompiled StateGraph ready for compilation with checkpointer
    """
    # Create the graph with our state schema
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("router", router_node)
    graph.add_node("entity_loader", entity_loader_node)
    graph.add_node("specialist", specialist_node)
    graph.add_node("tool_executor", tool_executor_node)

    # Add edges
    # START -> router
    graph.add_edge(START, "router")

    # router -> entity_loader OR end (conditional)
    graph.add_conditional_edges(
        "router",
        _handle_routing_result,
        {
            "entity_loader": "entity_loader",
            "end": END,
        }
    )

    # entity_loader -> specialist
    graph.add_edge("entity_loader", "specialist")

    # specialist -> tool_executor OR end (conditional)
    graph.add_conditional_edges(
        "specialist",
        _should_continue_after_specialist,
        {
            "tool_executor": "tool_executor",
            "end": END,
        }
    )

    # tool_executor -> specialist OR end (conditional)
    graph.add_conditional_edges(
        "tool_executor",
        _should_continue_after_tool_executor,
        {
            "specialist": "specialist",
            "end": END,
        }
    )

    return graph


def get_checkpointer_context():
    """Get PostgresSaver checkpointer context manager.

    Uses Neon Postgres for storing conversation state,
    enabling resumption after tool approvals.

    Returns:
        Async context manager for AsyncPostgresSaver
    """
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set")

    return AsyncPostgresSaver.from_conn_string(DATABASE_URL)


@traceable(
    name="run_graph",
    run_type="chain",
)
async def run_graph(
    user_query: str,
    user_id: str,
    organization_id: str | None = None,
    thread_id: str | None = None,
    conversation_history: list[dict] | None = None,
    selected_model: str | None = None,
    context_mode: str = "soft",
    enabled_accounts: list[str] | None = None,
    content_queue: "asyncio.Queue[str | None] | None" = None,
    output_queue: "asyncio.Queue[str | None] | None" = None,
):
    """Run the graph for a user query.

    Args:
        user_query: The user's message
        user_id: User ID for entity loading
        organization_id: Optional org ID for org-scoped operations
        thread_id: Thread ID for state persistence (creates new if None)
        conversation_history: Previous messages for context
        selected_model: Model preference from frontend
        context_mode: Entity grounding mode ("soft" or "strict")
        enabled_accounts: Account IDs enabled for context (empty = all)
        content_queue: Optional asyncio.Queue for streaming content chunks
        output_queue: Optional asyncio.Queue for SSE events (thinking, etc.)

    Yields:
        State updates as the graph executes (for streaming)
    """
    import uuid
    from langsmith import get_current_run_tree

    print(f"[run_graph] Starting with query: {user_query[:50]}...", flush=True)

    # Generate thread ID if not provided
    if not thread_id:
        thread_id = str(uuid.uuid4())

    print(f"[run_graph] Thread ID: {thread_id}", flush=True)

    # Add metadata to current LangSmith run for observability
    run_tree = get_current_run_tree()
    if run_tree:
        run_tree.add_metadata({
            "user_id": user_id,
            "organization_id": organization_id,
            "thread_id": thread_id,
            "model": selected_model,
            "context_mode": context_mode,
            "enabled_accounts_count": len(enabled_accounts or []),
            "history_length": len(conversation_history or []),
        })

    # Initial state with context settings for entity grounding
    initial_state = {
        "user_query": user_query,
        "user_context": {
            "user_id": user_id,
            "organization_id": organization_id,
            "context_mode": context_mode,
            "enabled_accounts": enabled_accounts or [],
        },
        "stream_id": thread_id,
        "selected_model": selected_model,
        "conversation_history": conversation_history or [],
    }

    # Config with thread ID for checkpointing and queues for streaming
    config = {
        "configurable": {
            "thread_id": thread_id,
            "content_queue": content_queue,  # For token-level streaming
            "output_queue": output_queue,  # For SSE events (thinking, etc.)
        },
        "recursion_limit": 25,  # Prevent infinite loops
    }

    print(f"[run_graph] Building graph...", flush=True)
    # Build graph and use checkpointer context manager
    graph = build_graph()
    print(f"[run_graph] Graph built, getting checkpointer context...", flush=True)

    async with get_checkpointer_context() as checkpointer:
        print(f"[run_graph] Inside checkpointer context, setting up tables...", flush=True)
        # Setup tables on first use
        await checkpointer.setup()
        print(f"[run_graph] Tables setup complete, compiling graph...", flush=True)

        # Compile with checkpointer
        compiled_graph = graph.compile(checkpointer=checkpointer)
        print(f"[run_graph] Graph compiled, starting astream...", flush=True)

        # Stream graph execution
        event_count = 0
        async for event in compiled_graph.astream(
            initial_state,
            config=config,
            stream_mode="updates",  # Get state updates per node
        ):
            event_count += 1
            print(f"[run_graph] Got event #{event_count}: keys={list(event.keys())}", flush=True)
            yield event

        print(f"[run_graph] Finished streaming, total events: {event_count}", flush=True)


async def resume_graph(
    thread_id: str,
    approval_result: dict,
):
    """Resume a graph after tool approval.

    When a dangerous tool triggers interrupt(), the graph pauses.
    After user approves/denies, call this to resume.

    Args:
        thread_id: The thread ID to resume
        approval_result: Dict with {approved: bool, modified_params: dict | None}

    Yields:
        State updates as the graph continues
    """
    from langgraph.types import Command

    print(f"[resume_graph] Starting for thread_id={thread_id}, approved={approval_result.get('approved')}", flush=True)

    config = {
        "configurable": {
            "thread_id": thread_id,
        },
        "recursion_limit": 25,
    }

    # Build graph and use checkpointer context manager
    graph = build_graph()
    print(f"[resume_graph] Graph built, getting checkpointer...", flush=True)
    async with get_checkpointer_context() as checkpointer:
        # Setup tables on first use (idempotent)
        await checkpointer.setup()
        print(f"[resume_graph] Checkpointer ready, compiling graph...", flush=True)

        # Compile with checkpointer
        compiled_graph = graph.compile(checkpointer=checkpointer)

        # Resume with Command(resume=...) to properly continue from interrupt()
        # The interrupt() in tool_executor will receive approval_result
        resume_command = Command(resume=approval_result)
        print(f"[resume_graph] Calling astream with Command(resume=...)...", flush=True)

        event_count = 0
        async for event in compiled_graph.astream(
            resume_command,
            config=config,
            stream_mode="updates",
        ):
            event_count += 1
            print(f"[resume_graph] Got event #{event_count}: keys={list(event.keys())}", flush=True)
            yield event

        print(f"[resume_graph] Finished, yielded {event_count} events", flush=True)
