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
    ContentEvent,
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
    - content: Streaming content chunks (token-level streaming)
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

    # Create queues for streaming
    # content_queue: tokens from LLM -> processor
    # output_queue: SSE events -> HTTP response
    content_queue: asyncio.Queue[str | None] = asyncio.Queue()
    output_queue: asyncio.Queue[str | None] = asyncio.Queue()

    # Track accumulated content for final result
    accumulated_content: list[str] = []

    # Event to signal when content streaming is done
    content_done = asyncio.Event()

    async def run_graph_and_emit():
        """Run LangGraph and emit SSE events to output queue."""
        try:
            async for event in run_graph(
                user_query=user_query,
                user_id=user_id,
                organization_id=organization_id,
                thread_id=stream_id,
                conversation_history=conversation_history,
                selected_model=selected_model,
                context_mode=context_mode,
                enabled_accounts=enabled_accounts or [],
                content_queue=content_queue,
                output_queue=output_queue,
            ):
                # Check for LangGraph interrupt events (tool approval required)
                if "__interrupt__" in event:
                    interrupt_data_list = event["__interrupt__"]
                    for interrupt_item in interrupt_data_list:
                        interrupt_value = getattr(interrupt_item, 'value', interrupt_item)
                        if isinstance(interrupt_value, dict) and interrupt_value.get("type") == "tool_approval_required":
                            tool_args = interrupt_value.get("tool_args", {})
                            tool_input_str = json.dumps(tool_args) if isinstance(tool_args, dict) else str(tool_args)
                            # Debug: Log what's being sent in the SSE event
                            print(f"[processor] Emitting tool_approval_required event")
                            print(f"[processor] tool_name: {interrupt_value.get('tool_name')}")
                            print(f"[processor] tool_args: {tool_args}")
                            print(f"[processor] tool_input_str: {tool_input_str}")
                            await output_queue.put(format_sse(ToolApprovalRequiredEvent(
                                approval_id=interrupt_value.get("approval_id", ""),
                                tool_name=interrupt_value.get("tool_name", ""),
                                tool_input=tool_input_str,
                                parameter_schema=interrupt_value.get("param_schema"),
                            ).model_dump(mode='json')))
                    continue

                # Process each node's state update
                for node_name, state_update in event.items():
                    _update_metrics(metrics, node_name, state_update)
                    sse_events = _convert_state_to_sse(node_name, state_update)
                    for sse_event in sse_events:
                        await output_queue.put(format_sse(sse_event))
                        if sse_event.get("type") == "result":
                            set_pending_result(stream_id, sse_event.get("content"))

        except Exception as e:
            import traceback
            traceback.print_exc()
            metrics.status = "error"
            metrics.error_message = str(e)[:500]
            await output_queue.put(format_sse(ErrorEvent(content=str(e)).model_dump(mode='json')))
            set_pending_result(stream_id, None, error=str(e))
        finally:
            # Signal content queue consumer to stop
            await content_queue.put(None)
            # Wait for content task to finish processing all chunks
            await content_done.wait()
            # Now signal output queue consumer to stop
            await output_queue.put(None)

    async def stream_content_chunks():
        """Read content chunks from LLM and emit as SSE events."""
        try:
            while True:
                try:
                    chunk = await content_queue.get()
                    if chunk is None:  # Stop signal
                        break
                    accumulated_content.append(chunk)
                    await output_queue.put(format_sse(ContentEvent(content=chunk).model_dump(mode='json')))
                except Exception:
                    break
        finally:
            content_done.set()

    # Start content streaming task first
    content_task = asyncio.create_task(stream_content_chunks())
    # Then start graph task
    graph_task = asyncio.create_task(run_graph_and_emit())

    try:
        # Yield SSE events from output queue as they arrive
        while True:
            try:
                sse_event = await asyncio.wait_for(output_queue.get(), timeout=0.1)
                if sse_event is None:  # Stop signal
                    break
                yield sse_event
            except asyncio.TimeoutError:
                # Check if tasks are done
                if graph_task.done() and content_task.done():
                    # Drain remaining items
                    while not output_queue.empty():
                        item = await output_queue.get()
                        if item is not None:
                            yield item
                    break
                continue

    except Exception as e:
        import traceback
        traceback.print_exc()
        metrics.status = "error"
        metrics.error_message = str(e)[:500]
        yield format_sse(ErrorEvent(content=str(e)).model_dump(mode='json'))
        set_pending_result(stream_id, None, error=str(e))

    finally:
        # Ensure tasks are cancelled/completed
        if not graph_task.done():
            graph_task.cancel()
        if not content_task.done():
            content_task.cancel()

        # Wait for tasks to complete
        try:
            await asyncio.gather(graph_task, content_task, return_exceptions=True)
        except Exception:
            pass

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
        # Only emit if NOT already streamed via output_queue
        thinking = state_update.get("thinking")
        thinking_streamed = state_update.get("thinking_streamed", False)
        if thinking and not thinking_streamed:
            events.append(ThinkingEvent(content=thinking).model_dump(mode='json'))

        # Check for partial response (text before tool calls)
        # Only emit as ContentEvent if NOT already streamed via content_queue
        partial_response = state_update.get("partial_response")
        content_streamed = state_update.get("content_streamed", False)
        if partial_response and not content_streamed:
            # Emit as content event for inline rendering
            events.append(ContentEvent(content=partial_response).model_dump(mode='json'))

        # Check for tool calls
        tool_calls = state_update.get("tool_calls", [])
        for tc in tool_calls:
            if tc.get("result") is None:  # Pending tool call
                # Format tool args as JSON string for frontend
                tool_args = tc.get("args", {})
                args_json = json.dumps(tool_args)
                tool_name = tc.get("name", "unknown")
                events.append({
                    "type": "tool",
                    "name": tool_name,  # Frontend uses 'name' for deduplication with pending approvals
                    "tool": tool_name,  # Frontend also expects 'tool' field
                    "input_preview": args_json[:200] if len(args_json) > 200 else args_json,
                    "input_full": args_json,
                    "is_dangerous": tc.get("is_dangerous", False),
                    "approved": tc.get("approval_status") == "approved",
                })

        # Check for final response
        # Only emit if NOT already streamed via content_queue
        response = state_update.get("response")
        if response and not content_streamed:
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
                    # Emit tool event first (so frontend can pair with tool_result)
                    tool_args = tc.get("args", {})
                    args_json = json.dumps(tool_args)
                    events.append({
                        "type": "tool",
                        "name": tc.get("name", "unknown"),
                        "tool": tc.get("name", "unknown"),  # Frontend expects 'tool' field too
                        "input_preview": args_json[:200] if len(args_json) > 200 else args_json,
                        "input_full": args_json,
                        "is_dangerous": tc.get("is_dangerous", False),
                        "approved": True,  # Already approved and executed
                    })

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
                        "name": tc.get("name", "unknown"),
                        "result": result_str,  # Full result for rendering
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
    print(f"[resume_gen] Starting resume for stream_id={stream_id}, approved={approved}", flush=True)
    try:
        approval_result = {
            "approved": approved,
            "modified_params": modified_params,
        }

        print(f"[resume_gen] Calling resume_graph...", flush=True)
        async for event in resume_graph(
            thread_id=stream_id,
            approval_result=approval_result,
        ):
            print(f"[resume_gen] Got event keys: {list(event.keys())}", flush=True)

            # Check for LangGraph interrupt events (another tool approval required)
            if "__interrupt__" in event:
                print(f"[resume_gen] Got __interrupt__ - checking for tool approval", flush=True)
                interrupt_data_list = event["__interrupt__"]
                for interrupt_item in interrupt_data_list:
                    interrupt_value = getattr(interrupt_item, 'value', interrupt_item)
                    if isinstance(interrupt_value, dict) and interrupt_value.get("type") == "tool_approval_required":
                        tool_args = interrupt_value.get("tool_args", {})
                        tool_input_str = json.dumps(tool_args) if isinstance(tool_args, dict) else str(tool_args)
                        print(f"[resume_gen] Emitting tool_approval_required for {interrupt_value.get('tool_name')}", flush=True)
                        yield format_sse(ToolApprovalRequiredEvent(
                            approval_id=interrupt_value.get("approval_id", ""),
                            tool_name=interrupt_value.get("tool_name", ""),
                            tool_input=tool_input_str,
                            parameter_schema=interrupt_value.get("param_schema"),
                        ).model_dump(mode='json'))
                continue

            for node_name, state_update in event.items():
                print(f"[resume_gen] Processing node: {node_name}", flush=True)
                # Skip special keys
                if node_name.startswith("__"):
                    print(f"[resume_gen] Skipping special key: {node_name}", flush=True)
                    continue
                sse_events = _convert_state_to_sse(node_name, state_update)
                print(f"[resume_gen] Generated {len(sse_events)} SSE events for {node_name}", flush=True)
                for sse_event in sse_events:
                    print(f"[resume_gen] Yielding SSE event type: {sse_event.get('type')}", flush=True)
                    yield format_sse(sse_event)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[resume_gen] Error: {e}", flush=True)
        yield format_sse(ErrorEvent(content=str(e)).model_dump(mode='json'))

    finally:
        print(f"[resume_gen] Done, yielding DoneEvent", flush=True)
        yield format_sse(DoneEvent().model_dump(mode='json'))


