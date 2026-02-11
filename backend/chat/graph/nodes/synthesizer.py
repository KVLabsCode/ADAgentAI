"""Synthesizer Node - Final response generation.

Merges all tool results into a coherent, human-readable response
with formatting, insights, and suggested next steps.

Responsibilities:
1. Merge tool results into coherent response
2. Format data appropriately (tables, bullets, markdown)
3. Extract key insights from the data
4. Suggest relevant next steps
5. Stream response chunks via SSE events
"""

import json
import asyncio
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langsmith import traceable

from .llm import get_llm

from ..state import GraphState


# Synthesizer prompt - focused on clarity and actionability
SYNTHESIZER_PROMPT = """You are a helpful assistant specializing in ad monetization.
Your job is to synthesize tool results into a clear, actionable response.

Guidelines:
1. **Direct Answer First**: Start with a direct answer to the user's question
2. **Format Data Clearly**: Use tables for comparisons, bullets for lists
3. **Highlight Insights**: Point out notable patterns, anomalies, or opportunities
4. **Suggest Next Steps**: When relevant, suggest what the user might do next
5. **Be Concise**: Don't repeat raw data unnecessarily; summarize intelligently

Formatting rules:
- Use markdown formatting (tables, bullets, bold, code blocks)
- For revenue/metrics: Include comparisons and trends when data allows
- For inventory: Show hierarchies clearly (Account → App → Ad Unit)
- For errors: Explain what went wrong and how to fix it
- Keep responses focused - don't pad with unnecessary context

If tool results contain errors:
- Explain the error in user-friendly terms
- Suggest how to resolve the issue
- Don't expose raw error messages or stack traces

Tone: Professional but friendly. You're a helpful expert, not a robot.
"""


def _format_tool_results_for_synthesis(tool_calls: list[dict]) -> str:
    """Format tool results for synthesis prompt."""
    if not tool_calls:
        return "No tool results available."

    formatted = []
    for tc in tool_calls:
        name = tc.get("name", "unknown")
        result = tc.get("result")

        if result is None:
            continue

        # Try to parse JSON results for better formatting
        try:
            if isinstance(result, str):
                parsed = json.loads(result)
                result_str = json.dumps(parsed, indent=2)
            else:
                result_str = json.dumps(result, indent=2)
        except (json.JSONDecodeError, TypeError):
            result_str = str(result)

        # Truncate very long results
        if len(result_str) > 5000:
            result_str = result_str[:5000] + "\n... [truncated for brevity]"

        formatted.append(f"=== {name} ===")
        formatted.append(result_str)
        formatted.append("")

    return "\n".join(formatted)


def _get_context_summary(state: GraphState) -> str:
    """Build context summary for synthesis."""
    routing = state.get("routing", {})
    user_context = state.get("user_context", {})

    parts = []

    if routing.get("service"):
        parts.append(f"Service: {routing['service']}")
    if routing.get("capability"):
        parts.append(f"Capability: {routing['capability']}")

    accounts = user_context.get("accounts", [])
    if accounts:
        parts.append(f"Available accounts: {len(accounts)}")

    return " | ".join(parts) if parts else "General query"


async def _stream_synthesis(
    llm,
    messages: list,
    output_queue: Optional[asyncio.Queue] = None,
) -> str:
    """Stream synthesis response, optionally to a queue.

    Args:
        llm: LLM instance
        messages: Messages to send
        output_queue: Optional queue for SSE events

    Returns:
        Complete response text
    """
    chunks = []

    async for chunk in llm.astream(messages):
        content = ""
        if hasattr(chunk, "content"):
            if isinstance(chunk.content, str):
                content = chunk.content
            elif isinstance(chunk.content, list) and chunk.content:
                # Handle content blocks
                for block in chunk.content:
                    if hasattr(block, "text"):
                        content += block.text

        if content:
            chunks.append(content)

            # Stream to queue if provided
            if output_queue:
                await output_queue.put({
                    "type": "result",
                    "content": content,
                })

    return "".join(chunks)


@traceable(name="synthesizer_node", run_type="chain")
async def synthesizer_node(state: GraphState) -> dict:
    """Synthesize final response from tool results.

    Args:
        state: Current graph state with tool results

    Returns:
        State update with final response and messages
    """
    print("[synthesizer] Starting synthesis...", flush=True)

    # Get original query
    user_query = state.get("user_query", "")
    if not user_query:
        messages = state.get("messages", [])
        if messages:
            user_query = messages[0].content if hasattr(messages[0], "content") else str(messages[0])

    # Get tool results
    tool_calls = state.get("tool_calls", [])
    completed_calls = [tc for tc in tool_calls if tc.get("result") is not None]

    # If no tool results, check for partial response
    if not completed_calls:
        partial = state.get("partial_response")
        if partial:
            print("[synthesizer] No tools executed, using partial response", flush=True)
            return {
                "response": partial,
                "messages": [AIMessage(content=partial)],
            }

        # No tools and no partial - generate a basic response
        print("[synthesizer] No data available, generating basic response", flush=True)
        return {
            "response": "I couldn't find the information you requested. Please try rephrasing your question or check if your providers are connected in Settings.",
            "messages": [AIMessage(content="I couldn't find the information you requested. Please try rephrasing your question or check if your providers are connected in Settings.")],
        }

    # Format results for synthesis
    tool_results_str = _format_tool_results_for_synthesis(completed_calls)
    context_summary = _get_context_summary(state)

    # Check for verification hints
    retry_hint = state.get("verification_retry_hint")
    verification_note = ""
    if retry_hint:
        verification_note = f"\n\nNote: Previous attempt was incomplete. Focus on: {retry_hint}"

    # Build synthesis prompt
    synthesis_prompt = f"""
User Query: {user_query}

Context: {context_summary}

Tool Results:
{tool_results_str}
{verification_note}

Provide a clear, formatted response that answers the user's question.
Include insights and next steps where appropriate.
"""

    print(f"[synthesizer] Generating response", flush=True)

    try:
        llm = get_llm(role="sonnet", max_tokens=2000, temperature=0.3)

        # Get output queue from config for streaming
        config = state.get("_config", {})
        configurable = config.get("configurable", {}) if config else {}
        output_queue = configurable.get("output_queue")

        if output_queue:
            # Stream response
            response_text = await _stream_synthesis(
                llm,
                [
                    SystemMessage(content=SYNTHESIZER_PROMPT),
                    HumanMessage(content=synthesis_prompt),
                ],
                output_queue,
            )
        else:
            # Non-streaming response
            response = await llm.ainvoke([
                SystemMessage(content=SYNTHESIZER_PROMPT),
                HumanMessage(content=synthesis_prompt),
            ])
            response_text = response.content if hasattr(response, "content") else str(response)

        print(f"[synthesizer] Generated response ({len(response_text)} chars)", flush=True)

        return {
            "response": response_text,
            "messages": [AIMessage(content=response_text)],
            "content_streamed": True,  # Mark as streamed to prevent duplicate SSE events
        }

    except Exception as e:
        print(f"[synthesizer] Error during synthesis: {e}", flush=True)

        # Fallback: return raw tool results formatted nicely
        fallback = f"Here are the results I found:\n\n{tool_results_str}"

        return {
            "response": fallback,
            "messages": [AIMessage(content=fallback)],
            "error": str(e),
        }


def format_revenue_table(data: list[dict]) -> str:
    """Helper to format revenue data as a markdown table.

    Args:
        data: List of revenue data dicts with date, revenue, impressions, etc.

    Returns:
        Markdown table string
    """
    if not data:
        return "No revenue data available."

    # Detect columns from first item
    columns = list(data[0].keys())

    # Build header
    header = "| " + " | ".join(columns) + " |"
    separator = "| " + " | ".join(["---"] * len(columns)) + " |"

    # Build rows
    rows = []
    for item in data:
        row = "| " + " | ".join(str(item.get(col, "")) for col in columns) + " |"
        rows.append(row)

    return "\n".join([header, separator] + rows)


def format_entity_list(entities: list[dict], entity_type: str) -> str:
    """Helper to format entity list with IDs and names.

    Args:
        entities: List of entity dicts
        entity_type: Type name for display (e.g., "Ad Unit", "App")

    Returns:
        Formatted list string
    """
    if not entities:
        return f"No {entity_type.lower()}s found."

    lines = [f"**{entity_type}s ({len(entities)}):**"]

    for entity in entities:
        name = entity.get("name") or entity.get("displayName") or "Unnamed"
        entity_id = entity.get("id") or entity.get("adUnitId") or "Unknown ID"
        status = entity.get("state") or entity.get("status", "")

        line = f"- {name}"
        if status:
            line += f" ({status})"
        line += f" `{entity_id}`"

        lines.append(line)

    return "\n".join(lines)
