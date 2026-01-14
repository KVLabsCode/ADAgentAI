"""Tool executor node - executes tools with interrupt() for dangerous operations.

Uses LangGraph's interrupt() mechanism for human-in-loop approval.
When a dangerous tool is detected, execution pauses and waits for user approval.
"""

import json
from typing import Any
from langgraph.types import interrupt
from langchain_core.messages import ToolMessage
from langsmith import traceable


def _serialize_result(result: Any) -> str:
    """Serialize tool result to JSON string.

    Handles various result types including LangGraph ToolMessage content.
    """
    if result is None:
        return "null"

    if isinstance(result, str):
        return result

    if isinstance(result, (dict, list)):
        try:
            return json.dumps(result, ensure_ascii=False, default=str)
        except (TypeError, ValueError):
            return str(result)

    # For other types, try JSON first, fall back to str
    try:
        return json.dumps(result, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        return str(result)

from ..state import GraphState, ToolCall, ApprovalRequest
from ..validators import (
    validate_entity_references,
    build_validation_error_response,
    build_detailed_validation_error,
)
from ...approval.models import DANGEROUS_TOOLS, is_dangerous_tool
from ...approval.schema_extractor import get_tool_schema_by_mcp_name
from ...approval.handlers import create_pending_approval
from ...tools import execute_tool


def _is_tool_dangerous(tool_name: str) -> bool:
    """Check if a tool requires human approval.

    Checks against the list of dangerous tools (write/delete operations).
    """
    return is_dangerous_tool(tool_name)


def _get_pending_tool_calls(state: GraphState) -> list[ToolCall]:
    """Get tool calls that haven't been executed yet."""
    tool_calls = state.get("tool_calls", [])
    return [tc for tc in tool_calls if tc.get("result") is None]


def _create_approval_request(tool_call: ToolCall) -> ApprovalRequest:
    """Create an approval request for a dangerous tool.

    This stores the approval in the file-based system so the /chat/approve-tool
    endpoint can find and resolve it when the user clicks approve/deny.
    """
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})

    # Debug: Log the tool args to verify they contain LLM's chosen values
    print(f"[tool_executor] Creating approval request for {tool_name}")
    print(f"[tool_executor] tool_args from LLM: {tool_args}")

    # Store approval in file-based system (shared with /chat/approve-tool endpoint)
    # This is critical - without this, the approval endpoint returns 404
    tool_input_str = json.dumps(tool_args)
    approval_id = create_pending_approval(tool_name, tool_input_str)
    print(f"[tool_executor] Stored pending approval: {approval_id}")

    # Extract schema for parameter form
    param_schema = None
    try:
        param_schema = get_tool_schema_by_mcp_name(tool_name)
        print(f"[tool_executor] Schema for {tool_name}: {param_schema is not None}")
    except Exception as e:
        print(f"[tool_executor] Schema extraction failed for {tool_name}: {e}")

    return {
        "approval_id": approval_id,
        "tool_name": tool_call.get("name", ""),
        "tool_args": tool_call.get("args", {}),
        "tool_call_id": tool_call.get("id", ""),
        "param_schema": param_schema,
    }


@traceable(name="tool_executor_node", run_type="tool")
async def tool_executor_node(state: GraphState) -> dict:
    """Execute pending tool calls, with interrupt() for dangerous tools.

    For each pending tool call:
    1. Check if it's a dangerous tool (write operation)
    2. If dangerous: interrupt() and wait for approval
    3. If approved or safe: execute the tool
    4. Return results

    Args:
        state: Current graph state with tool_calls

    Returns:
        Updated state with tool results or pending_approval
    """
    pending_calls = _get_pending_tool_calls(state)

    if not pending_calls:
        return {}

    # Process first pending tool call
    # (Processing one at a time for proper approval flow)
    tool_call = pending_calls[0]
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})
    tool_id = tool_call.get("id", "")

    print(f"[tool_executor] Processing tool: {tool_name}")
    is_dangerous = _is_tool_dangerous(tool_name)
    print(f"[tool_executor] Is dangerous: {is_dangerous}")

    # Check if dangerous
    if is_dangerous:
        # Check if already approved
        approval_status = tool_call.get("approval_status")

        if approval_status == "approved":
            # Already approved, proceed with execution
            pass
        elif approval_status == "denied":
            # User denied - return denial message
            return {
                "tool_calls": [{
                    **tool_call,
                    "result": f"Tool '{tool_name}' was denied by user.",
                }],
                "messages": [
                    ToolMessage(
                        content=f"Tool execution denied by user.",
                        tool_call_id=tool_id,
                    )
                ],
            }
        else:
            # Needs approval - create request and interrupt
            print(f"[tool_executor] Tool requires approval, creating interrupt...")
            approval_request = _create_approval_request(tool_call)
            print(f"[tool_executor] Approval request created: {approval_request.get('approval_id')}")

            # Mark tool as dangerous and pending
            updated_call = {
                **tool_call,
                "is_dangerous": True,
                "approval_status": "pending",
            }

            # Use LangGraph interrupt() to pause execution
            # This will save state and return control to the caller
            # The caller (streaming processor) will emit approval_required event
            # When user responds, execution resumes from this checkpoint
            print(f"[tool_executor] Calling interrupt()...")
            interrupt_result = interrupt({
                "type": "tool_approval_required",
                "approval_id": approval_request["approval_id"],
                "tool_name": tool_name,
                "tool_args": tool_args,
                "param_schema": approval_request.get("param_schema"),
            })

            # After interrupt resumes, check the result
            if isinstance(interrupt_result, dict):
                if interrupt_result.get("approved"):
                    # User approved - update args if modified
                    modified_args = interrupt_result.get("modified_args")
                    if modified_args:
                        tool_args = modified_args
                        updated_call["args"] = modified_args
                    updated_call["approval_status"] = "approved"
                else:
                    # User denied
                    updated_call["approval_status"] = "denied"
                    updated_call["result"] = "Denied by user"
                    return {
                        "tool_calls": [updated_call],
                        "messages": [
                            ToolMessage(
                                content="Tool execution denied by user.",
                                tool_call_id=tool_id,
                            )
                        ],
                    }

    # Validate entity references before execution
    available_accounts = state.get("available_accounts", [])
    available_apps = state.get("available_apps", [])
    context_mode = state.get("context_mode", "soft")

    is_valid, error_message, validation_errors = validate_entity_references(
        tool_name=tool_name,
        tool_input=tool_args,
        available_accounts=available_accounts,
        available_apps=available_apps,
        context_mode=context_mode,
    )

    if not is_valid:
        # Strict mode - validation failed, return detailed error with alternatives
        if validation_errors:
            # Use detailed error builder with friendly names
            error_response = build_detailed_validation_error(tool_name, validation_errors)
        else:
            # Fallback to simple error
            error_response = build_validation_error_response(tool_name, error_message or "Unknown validation error")

        # Build user-friendly error message
        error_content = error_response["message"]
        if error_response.get("valid_alternatives"):
            alternatives = error_response["valid_alternatives"][:5]
            error_content += "\n\nAvailable options:\n" + "\n".join(f"  • {alt}" for alt in alternatives)

        updated_call = {
            **tool_call,
            "result": error_content,
            "validation_error": True,
            "validation_details": error_response,  # Full error details for debugging
        }
        return {
            "tool_calls": [updated_call],
            "messages": [
                ToolMessage(
                    content=error_content,
                    tool_call_id=tool_id,
                )
            ],
        }

    # Get service and user_id from state for tool execution
    routing = state.get("routing", {})
    service = routing.get("service", "admob")
    user_context = state.get("user_context", {})
    user_id = user_context.get("user_id")

    # Execute the tool
    try:
        result = await _execute_tool(tool_name, tool_args, service, user_id)

        # Serialize result to JSON (not Python str representation)
        result_str = _serialize_result(result)

        # Update tool call with result
        updated_call = {
            **tool_call,
            "result": result_str,
            "approval_status": "approved" if _is_tool_dangerous(tool_name) else None,
        }

        return {
            "tool_calls": [updated_call],
            "messages": [
                ToolMessage(
                    content=result_str,
                    tool_call_id=tool_id,
                )
            ],
        }

    except Exception as e:
        error_result = f"Error executing {tool_name}: {str(e)}"
        updated_call = {
            **tool_call,
            "result": error_result,
        }
        return {
            "tool_calls": [updated_call],
            "messages": [
                ToolMessage(
                    content=error_result,
                    tool_call_id=tool_id,
                )
            ],
        }


async def _execute_tool(
    tool_name: str,
    tool_args: dict,
    service: str = "admob",
    user_id: str | None = None,
) -> Any:
    """Execute a tool by name with given arguments.

    Uses the execute_tool function which keeps the MCP client context
    open during tool execution.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        service: Service name for loading tools ("admob", "admanager")
        user_id: User ID for OAuth tokens

    Returns:
        Tool execution result
    """
    print(f"[tool_executor] Executing {tool_name} with args: {tool_args}")
    result = await execute_tool(
        tool_name=tool_name,
        tool_args=tool_args,
        service=service,
        user_id=user_id,
    )
    print(f"[tool_executor] Result: {result}")
    return result


def should_continue_after_tools(state: GraphState) -> str:
    """Determine next step after tool execution.

    Returns:
        "specialist" - Go back to specialist for more processing
        "end" - We have a final response, end the graph
    """
    # If there's an error, end
    if state.get("error"):
        return "end"

    # If there's a final response, end
    if state.get("response"):
        return "end"

    # If there are still pending tools, continue with specialist
    pending = _get_pending_tool_calls(state)
    if pending:
        return "specialist"

    # Check if specialist needs to process tool results
    tool_calls = state.get("tool_calls", [])
    if tool_calls:
        # Has completed tool calls - go back to specialist to process results
        return "specialist"

    return "end"
