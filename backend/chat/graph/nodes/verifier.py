"""Verifier Node - Quality gate for tool results.

Compares tool results against the original user intent to ensure
the response actually answers the question. Routes back to specialist
for retry if incomplete.

Responsibilities:
1. Compare tool result against original intent
2. Detect missing prerequisites (e.g., create without required IDs)
3. Force retrieval before write operations
4. Route back to specialist for retry on incomplete results
"""

import json
from typing import Literal

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_anthropic import ChatAnthropic
from langsmith import traceable

from ..state import GraphState


# Verification prompt - designed to be strict and catch incomplete results
VERIFIER_PROMPT = """You are a verification agent for an ad monetization platform.
Your job is to check if tool results actually answer the user's original question.

Be strict - if the result doesn't directly answer the question, mark it INCOMPLETE.

Common issues to catch:
1. **Missing data**: Tool returned empty results when data was expected
2. **Wrong scope**: Tool returned data for wrong account/app/time period
3. **Partial results**: Only some of the requested information was returned
4. **Error responses**: API returned an error that wasn't handled
5. **Missing prerequisites**: Write operation attempted without required entity IDs

When checking results:
- For reporting queries: Verify the time range and metrics match the request
- For inventory queries: Verify all requested entities are present
- For write operations: Verify the operation succeeded with expected output
- For multi-step operations: Verify all steps completed

Output format:
If complete and correct:
COMPLETE: [Brief explanation of why the result answers the question]

If incomplete or incorrect:
INCOMPLETE: [Specific explanation of what's missing or wrong]
RETRY_HINT: [What the specialist should do differently]
"""


def _format_tool_results(tool_calls: list[dict]) -> str:
    """Format tool results for verification."""
    if not tool_calls:
        return "No tool calls were made."

    formatted = []
    for tc in tool_calls:
        name = tc.get("name", "unknown")
        result = tc.get("result")
        args = tc.get("args", {})

        formatted.append(f"Tool: {name}")
        formatted.append(f"Args: {json.dumps(args, indent=2)}")
        if result:
            # Truncate very long results
            result_str = str(result)
            if len(result_str) > 2000:
                result_str = result_str[:2000] + "... [truncated]"
            formatted.append(f"Result: {result_str}")
        else:
            formatted.append("Result: [pending or failed]")
        formatted.append("")

    return "\n".join(formatted)


def _extract_verification_status(response: str) -> tuple[str, str, str | None]:
    """Extract verification status from LLM response.

    Returns:
        Tuple of (status, explanation, retry_hint)
        status is "complete" or "incomplete"
    """
    response_upper = response.upper()

    if "COMPLETE:" in response_upper and "INCOMPLETE:" not in response_upper:
        # Extract explanation after COMPLETE:
        idx = response_upper.index("COMPLETE:")
        explanation = response[idx + 9:].strip()
        # Remove RETRY_HINT if accidentally included
        if "RETRY_HINT:" in explanation.upper():
            explanation = explanation[:explanation.upper().index("RETRY_HINT:")].strip()
        return "complete", explanation, None

    elif "INCOMPLETE:" in response_upper:
        # Extract explanation and retry hint
        idx = response_upper.index("INCOMPLETE:")
        rest = response[idx + 11:].strip()

        explanation = rest
        retry_hint = None

        if "RETRY_HINT:" in rest.upper():
            hint_idx = rest.upper().index("RETRY_HINT:")
            explanation = rest[:hint_idx].strip()
            retry_hint = rest[hint_idx + 11:].strip()

        return "incomplete", explanation, retry_hint

    # Default to complete if can't parse
    return "complete", response, None


@traceable(name="verifier_node", run_type="chain")
async def verifier_node(state: GraphState) -> dict:
    """Verify tool results against original intent.

    Args:
        state: Current graph state with tool results

    Returns:
        State update with verification_status and optional retry_hint
    """
    print("[verifier] Starting verification...", flush=True)

    # Get original query
    user_query = state.get("user_query", "")
    if not user_query:
        messages = state.get("messages", [])
        if messages:
            user_query = messages[0].content if hasattr(messages[0], "content") else str(messages[0])

    # Get tool results
    tool_calls = state.get("tool_calls", [])
    completed_calls = [tc for tc in tool_calls if tc.get("result") is not None]

    if not completed_calls:
        print("[verifier] No completed tool calls, skipping verification", flush=True)
        return {"verification_status": "complete"}

    # Format results for verification
    tool_results_str = _format_tool_results(completed_calls)

    # Get routing context for better verification
    routing = state.get("routing", {})
    service = routing.get("service", "unknown")
    capability = routing.get("capability", "unknown")

    # Build verification prompt
    verification_prompt = f"""
Original User Query: {user_query}

Service Context: {service} / {capability}

Tool Execution Results:
{tool_results_str}

Verify: Does this result fully answer the user's question?
Consider the service context when evaluating completeness.
"""

    # Always use Haiku for verification to save costs
    verification_model = "claude-3-5-haiku-20241022"

    print(f"[verifier] Using model: {verification_model}", flush=True)

    try:
        llm = ChatAnthropic(
            model=verification_model,
            max_tokens=500,
            temperature=0,
        )

        response = await llm.ainvoke([
            SystemMessage(content=VERIFIER_PROMPT),
            HumanMessage(content=verification_prompt),
        ])

        response_text = response.content if hasattr(response, "content") else str(response)
        print(f"[verifier] Raw response: {response_text[:200]}...", flush=True)

        # Parse verification result
        status, explanation, retry_hint = _extract_verification_status(response_text)

        print(f"[verifier] Status: {status}", flush=True)
        if status == "incomplete":
            print(f"[verifier] Explanation: {explanation}", flush=True)
            print(f"[verifier] Retry hint: {retry_hint}", flush=True)

        result = {
            "verification_status": status,
            "verification_explanation": explanation,
        }

        if retry_hint:
            result["verification_retry_hint"] = retry_hint

        return result

    except Exception as e:
        print(f"[verifier] Error during verification: {e}", flush=True)
        # On error, assume complete to avoid blocking
        return {"verification_status": "complete"}


def should_retry_after_verification(state: GraphState) -> Literal["specialist", "synthesizer"]:
    """Conditional edge: determine next step after verification.

    Args:
        state: Current graph state

    Returns:
        "specialist" to retry, "synthesizer" to proceed to final response
    """
    status = state.get("verification_status", "complete")
    retry_count = state.get("verification_retry_count", 0)

    # Max 2 retries to prevent infinite loops
    if status == "incomplete" and retry_count < 2:
        print(f"[verifier] Routing to specialist for retry (attempt {retry_count + 1})", flush=True)
        return "specialist"

    print("[verifier] Routing to synthesizer", flush=True)
    return "synthesizer"
