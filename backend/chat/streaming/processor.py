"""Streaming chat processor - main SSE response generator.

ARCHITECTURE NOTE:
CrewAI's @before_tool_call hooks run synchronously and block the thread.
To avoid deadlock (hook blocks -> queue never drains -> approval never sent),
we run CrewAI in a SEPARATE THREAD with its own event loop.

This allows:
- Main asyncio loop: drains queue, sends SSE events to frontend
- Background thread: runs CrewAI (may block in hooks)
- Result: approval UI appears while tool waits for user response
"""

import uuid
import asyncio
import queue as thread_queue
from typing import Optional, AsyncGenerator
from concurrent.futures import ThreadPoolExecutor

from crewai.types.streaming import StreamChunkType

from .events import (
    format_sse,
    RoutingEvent,
    AgentEvent,
    ThinkingEvent,
    ResultEvent,
    ErrorEvent,
    DoneEvent,
)
from .state import (
    get_event_queue,
    push_event,
    start_stream,
    end_stream,
    clear_event_queue,
)
from ..routing import classify_query
from ..crew import get_crew_for_query
from ..approval.handlers import clear_pre_approved_tools, clear_blocked_tools
from ..utils.parsing import extract_thought

# Thread pool for running CrewAI (allows hooks to block without deadlock)
_crew_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="crew-")


async def stream_chat_response(
    user_query: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_history: Optional[list] = None,
    selected_model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream a chat response using CrewAI with real-time interleaved events.

    This generator yields SSE-formatted events including:
    - routing: Which specialist is handling the query
    - agent: Agent transitions
    - thought: Agent thinking/reasoning
    - tool: Tool calls (with approval workflow for dangerous tools)
    - tool_result: Tool execution results
    - tool_approval_required: Dangerous tool awaiting user approval
    - tool_denied: Tool execution was denied
    - result: Final response
    - error: Error messages
    - done: Stream complete

    Args:
        user_query: The user's message
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        conversation_history: Previous conversation for context
        selected_model: LLM model to use (e.g., "anthropic/claude-sonnet-4-20250514")

    IMPORTANT: CrewAI runs in a background thread to prevent hook blocking
    from deadlocking the SSE event stream.
    """
    # Generate unique stream ID for this request
    stream_id = str(uuid.uuid4())[:8]
    event_queue = get_event_queue()

    # Clear any stale state and activate streaming
    clear_event_queue()
    clear_pre_approved_tools()
    clear_blocked_tools()
    start_stream(stream_id)

    try:
        # Build conversation context for routing
        context = _build_routing_context(conversation_history)

        # Classify the query with reasoning
        service, capability, routing_thinking = classify_query(user_query, context)

        # Emit routing event
        yield format_sse(RoutingEvent(
            service=service,
            capability=capability,
            thinking=routing_thinking if routing_thinking else None
        ).model_dump(mode='json'))


        # Emit agent event
        agent_name = f"{service.title()} {capability.title()} Specialist"
        yield format_sse(AgentEvent(agent=agent_name).model_dump(mode='json'))

        # Build crew with conversation history and selected model
        crew = get_crew_for_query(user_query, service, capability, user_id, organization_id, conversation_history, selected_model)

        # Run CrewAI in background thread (hooks may block, this prevents deadlock)
        result_queue = thread_queue.Queue()

        def run_crew_sync():
            """Run CrewAI in its own event loop in a background thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # Start streaming kickoff
                streaming = loop.run_until_complete(crew.akickoff(inputs={'user_query': user_query}))

                # Consume all stream chunks
                # NOTE: Thinking extraction is handled by @after_llm_call hook (llm_hooks.py)
                # This just consumes chunks for progress logging
                async def consume_stream():
                    chunk_count = 0

                    try:
                        async for chunk in streaming:
                            chunk_count += 1

                    except Exception:
                        pass  # Silently handle stream consumption errors

                    return chunk_count

                chunk_count = loop.run_until_complete(consume_stream())

                # Get final result
                result = streaming.result
                result_text = str(result.raw) if result and result.raw else None
                result_queue.put(('success', result_text))

            except Exception as e:
                import traceback
                traceback.print_exc()
                result_queue.put(('error', str(e)))
            finally:
                loop.close()

        # Submit to thread pool
        future = _crew_executor.submit(run_crew_sync)

        # Main loop: drain queue while CrewAI runs
        # This loop can run because we're in the main asyncio event loop,
        # not blocked by hooks (they run in the background thread)
        poll_interval = 0.1  # 100ms
        idle_count = 0
        max_idle = 300  # 30 seconds of no events after crew finishes

        while True:
            # Drain all queued events
            events_found = False
            while True:
                try:
                    event = event_queue.get_nowait()
                    events_found = True
                    idle_count = 0
                    yield format_sse(event)
                except:
                    break

            # Check if CrewAI finished
            try:
                status, result = result_queue.get_nowait()

                # Drain any remaining events
                while True:
                    try:
                        event = event_queue.get_nowait()
                        yield format_sse(event)
                    except:
                        break

                # Handle result
                if status == 'success' and result:
                    yield format_sse(ResultEvent(content=result).model_dump(mode='json'))
                elif status == 'error':
                    yield format_sse(ErrorEvent(content=result).model_dump(mode='json'))

                break  # Exit main loop

            except thread_queue.Empty:
                pass  # CrewAI still running

            # Increment idle counter if no events
            if not events_found:
                idle_count += 1

            # Safety timeout (shouldn't hit this normally)
            if idle_count > max_idle and future.done():
                break

            # Yield control and wait
            await asyncio.sleep(poll_interval)

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield format_sse(ErrorEvent(content=str(e)).model_dump(mode='json'))

    finally:
        end_stream(stream_id)
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
