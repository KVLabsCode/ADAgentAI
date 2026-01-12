"""Streaming chat processor - main SSE response generator using LangGraph.

ARCHITECTURE NOTE:
LangGraph's interrupt() mechanism pauses graph execution when dangerous tools
need approval. The graph state is persisted via PostgresSaver, allowing:
- Graph pauses when interrupt() is called in tool_executor
- Frontend shows approval UI
- User approves/denies via API
- resume_graph() continues execution with approval result

Key benefits of this approach:
- No thread pools or background threads needed
- State is persisted in Postgres (survives server restarts)
- Async all the way through
"""

import json
import uuid
import asyncio
import time
from typing import Optional, AsyncGenerator
from dataclasses import dataclass, field

from .events import (
    format_sse,
    RoutingEvent,
    AgentEvent,
    ThinkingEvent,
    ResultEvent,
    ErrorEvent,
    DoneEvent,
    ToolApprovalRequiredEvent,
    ToolDeniedEvent,
)
from .state import (
    start_stream,
    end_stream,
    create_pending_result,
    set_pending_result,
    clear_current_stream,
)
from ..graph import run_graph, resume_graph
from ..observability import RunMetrics, save_run_summary, calculate_cost


@dataclass
class StreamMetrics:
    """Collect metrics during stream execution."""
    stream_id: str
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    service: Optional[str] = None
    capability: Optional[str] = None
    model: Optional[str] = None
    tool_count: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    status: str = "success"
    error_message: Optional[str] = None
    start_time: float = field(default_factory=time.time)

    def add_tokens(self, input_tokens: int = 0, output_tokens: int = 0):
        """Add token counts from an LLM response."""
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens

    def latency_ms(self) -> int:
        """Get elapsed time in milliseconds."""
        return int((time.time() - self.start_time) * 1000)

    def total_cost(self) -> float:
        """Calculate total cost based on model and tokens."""
        if not self.model:
            return 0.0
        return calculate_cost(self.model, self.input_tokens, self.output_tokens)

    async def save(self):
        """Save metrics to database via API."""
        metrics = RunMetrics(
            user_id=self.user_id or "anonymous",
            organization_id=self.organization_id,
            langsmith_run_id=self.stream_id,  # Use stream_id as run ID
            thread_id=self.stream_id,
            input_tokens=self.input_tokens,
            output_tokens=self.output_tokens,
            total_tokens=self.input_tokens + self.output_tokens,
            tool_calls=self.tool_count,
            latency_ms=self.latency_ms(),
            status=self.status,
            error_message=self.error_message,
            service=self.service,
            capability=self.capability,
            model=self.model,
            total_cost=self.total_cost(),
        )
        await save_run_summary(metrics)


async def stream_chat_response(
    user_query: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_history: Optional[list] = None,
    selected_model: Optional[str] = None,
    context_mode: str = "soft",
    enabled_accounts: Optional[list] = None,
) -> AsyncGenerator[str, None]:
    """Stream a chat response using LangGraph with real-time interleaved events.

    This generator yields SSE-formatted events including:
    - routing: Which specialist is handling the query
    - agent: Agent transitions
    - thinking: Agent thinking/reasoning (from router)
    - tool: Tool calls (with approval workflow for dangerous tools)
    - tool_result: Tool execution results
    - tool_approval_required: Dangerous tool awaiting user approval
    - tool_denied: Tool execution was denied
    - result: Final response
    - error: Error messages
    - done: Stream complete
    - stream_id: Included in first event for reconnection

    Args:
        user_query: The user's message
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        conversation_history: Previous conversation for context
        selected_model: LLM model to use (e.g., "anthropic/claude-sonnet-4-20250514")
        context_mode: Entity grounding mode ("soft" or "strict")
        enabled_accounts: List of account IDs enabled for context (empty = all)

    LangGraph handles interrupt/resume for tool approvals automatically
    via PostgresSaver state persistence.
    """
    # Generate unique stream ID for this request
    stream_id = str(uuid.uuid4())[:8]

    # Initialize metrics tracker
    metrics = StreamMetrics(
        stream_id=stream_id,
        user_id=user_id,
        organization_id=organization_id,
        model=selected_model,
    )

    # Activate streaming state
    start_stream(stream_id)
    create_pending_result(stream_id)

    # Send stream_id to frontend for potential reconnection
    yield format_sse({"type": "stream_id", "stream_id": stream_id})

    try:
        # Run the LangGraph and stream state updates
        async for event in run_graph(
            user_query=user_query,
            user_id=user_id,
            organization_id=organization_id,
            thread_id=stream_id,
            conversation_history=conversation_history,
            selected_model=selected_model,
            context_mode=context_mode,
            enabled_accounts=enabled_accounts or [],
        ):
            # Process each node's state update
            for node_name, state_update in event.items():
                # Extract metrics from state updates
                _update_metrics(metrics, node_name, state_update)

                sse_events = _convert_state_to_sse(node_name, state_update)
                for sse_event in sse_events:
                    yield format_sse(sse_event)

                    # Store result for potential reconnection
                    if sse_event.get("type") == "result":
                        set_pending_result(stream_id, sse_event.get("content"))

    except Exception as e:
        import traceback
        traceback.print_exc()
        metrics.status = "error"
        metrics.error_message = str(e)[:500]
        yield format_sse(ErrorEvent(content=str(e)).model_dump(mode='json'))
        set_pending_result(stream_id, None, error=str(e))

    finally:
        end_stream(stream_id)
        clear_current_stream()

        # Save metrics to database (fire and forget)
        try:
            await metrics.save()
        except Exception as e:
            print(f"[metrics] Failed to save run summary: {e}")

        yield format_sse(DoneEvent().model_dump(mode='json'))


def _update_metrics(metrics: StreamMetrics, node_name: str, state_update: dict):
    """Extract metrics from state updates."""
    if node_name == "router":
        routing = state_update.get("routing", {})
        if routing:
            metrics.service = routing.get("service")
            metrics.capability = routing.get("capability")

    elif node_name == "specialist":
        # Count tool calls
        tool_calls = state_update.get("tool_calls", [])
        metrics.tool_count += len(tool_calls)

        # Extract token usage if available
        token_usage = state_update.get("token_usage", {})
        if token_usage:
            metrics.add_tokens(
                input_tokens=token_usage.get("input_tokens", 0),
                output_tokens=token_usage.get("output_tokens", 0),
            )

        # Update model if specified in state
        if state_update.get("model"):
            metrics.model = state_update.get("model")

    elif node_name == "tool_executor":
        # Count completed tool executions
        tool_calls = state_update.get("tool_calls", [])
        for tc in tool_calls:
            if tc.get("result") is not None:
                # Tool was executed
                pass


def _convert_state_to_sse(node_name: str, state_update: dict) -> list[dict]:
    """Convert LangGraph state update to SSE events.

    Each node produces different events:
    - router: routing event with service/capability
    - entity_loader: (no visible event, just loads context)
    - specialist: agent, thinking, tool calls, or result
    - tool_executor: tool_result, tool_approval_required, or tool_denied

    Args:
        node_name: Name of the node that produced this update
        state_update: The state changes from this node

    Returns:
        List of SSE event dicts to send to frontend
    """
    events = []

    if node_name == "router":
        # Emit routing event
        routing = state_update.get("routing", {})
        if routing:
            events.append(RoutingEvent(
                service=routing.get("service", "general"),
                capability=routing.get("capability", "general"),
                thinking=routing.get("thinking"),
            ).model_dump(mode='json'))

            # Emit agent event
            service = routing.get("service", "general")
            capability = routing.get("capability", "general")
            agent_name = f"{service.title()} {capability.title()} Specialist"
            events.append(AgentEvent(agent=agent_name).model_dump(mode='json'))

    elif node_name == "entity_loader":
        # Entity loader is transparent to the user
        pass

    elif node_name == "specialist":
        # Check for thinking content (extended thinking from Claude)
        thinking = state_update.get("thinking")
        if thinking:
            events.append(ThinkingEvent(content=thinking).model_dump(mode='json'))

        # Check for tool calls
        tool_calls = state_update.get("tool_calls", [])
        for tc in tool_calls:
            if tc.get("result") is None:  # Pending tool call
                # Format tool args as JSON string for frontend
                tool_args = tc.get("args", {})
                args_json = json.dumps(tool_args)
                events.append({
                    "type": "tool",
                    "tool": tc.get("name"),  # Frontend expects 'tool'
                    "input_preview": args_json[:200] if len(args_json) > 200 else args_json,
                    "input_full": args_json,
                    "is_dangerous": tc.get("is_dangerous", False),
                    "approved": tc.get("approval_status") == "approved",
                })

        # Check for final response
        response = state_update.get("response")
        if response:
            events.append(ResultEvent(content=response).model_dump(mode='json'))

        # Check for error
        error = state_update.get("error")
        if error:
            events.append(ErrorEvent(content=error).model_dump(mode='json'))

    elif node_name == "tool_executor":
        # Check for approval required (interrupt happened)
        pending_approval = state_update.get("pending_approval")
        if pending_approval:
            events.append(ToolApprovalRequiredEvent(
                approval_id=pending_approval.get("approval_id", ""),
                tool_name=pending_approval.get("tool_name", ""),
                tool_input=str(pending_approval.get("tool_args", {})),
                parameter_schema=pending_approval.get("param_schema"),
            ).model_dump(mode='json'))

        # Check for tool results
        tool_calls = state_update.get("tool_calls", [])
        for tc in tool_calls:
            result = tc.get("result")
            if result is not None:
                # Check if denied
                if tc.get("approval_status") == "denied":
                    events.append(ToolDeniedEvent(
                        tool_name=tc.get("name", "unknown"),
                    ).model_dump(mode='json'))
                else:
                    # Format result for frontend
                    result_str = result if isinstance(result, str) else json.dumps(result)
                    # Determine data type
                    data_type = "text"
                    if isinstance(result, (dict, list)):
                        data_type = "json_list" if isinstance(result, list) else "json"
                    elif isinstance(result, str):
                        try:
                            json.loads(result)
                            data_type = "json"
                        except (json.JSONDecodeError, TypeError):
                            pass

                    events.append({
                        "type": "tool_result",
                        "preview": result_str[:500] if len(result_str) > 500 else result_str,
                        "full": result_str,
                        "data_type": data_type,
                    })

        # Check for error
        error = state_update.get("error")
        if error:
            events.append(ErrorEvent(content=error).model_dump(mode='json'))

    return events


async def stream_resume_response(
    stream_id: str,
    approved: bool,
    modified_params: Optional[dict] = None,
) -> AsyncGenerator[str, None]:
    """Resume a paused graph after tool approval.

    When a dangerous tool triggers interrupt(), the graph pauses and
    waits for user approval. This function resumes the graph.

    Args:
        stream_id: The stream/thread ID to resume
        approved: Whether the user approved the tool execution
        modified_params: Optional modified parameters from user

    Yields:
        SSE events from the resumed graph execution
    """
    try:
        approval_result = {
            "approved": approved,
            "modified_params": modified_params,
        }

        async for event in resume_graph(
            thread_id=stream_id,
            approval_result=approval_result,
        ):
            for node_name, state_update in event.items():
                sse_events = _convert_state_to_sse(node_name, state_update)
                for sse_event in sse_events:
                    yield format_sse(sse_event)

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield format_sse(ErrorEvent(content=str(e)).model_dump(mode='json'))

    finally:
        yield format_sse(DoneEvent().model_dump(mode='json'))


def _build_routing_context(conversation_history: Optional[list]) -> str:
    """Build context string for routing from conversation history."""
    if not conversation_history:
        return ""

    recent = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
    context_parts = []

    for msg in recent:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")[:200]
        context_parts.append(f"{role}: {content}")

    return "\n".join(context_parts)
