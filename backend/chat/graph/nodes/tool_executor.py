"""Tool executor node - executes tools with interrupt() for dangerous operations.

Uses LangGraph's interrupt() mechanism for human-in-loop approval.
When a dangerous tool is detected, execution pauses and waits for user approval.

Progress streaming: Uses LangGraph's get_stream_writer() to emit progress events
during tool execution, providing real-time feedback to the frontend.
"""

import json
from typing import Any
from langgraph.types import interrupt
from langgraph.config import get_stream_writer
from langchain_core.messages import ToolMessage
from langsmith import traceable


def _extract_content_from_blocks(blocks: list) -> Any:
    """Extract actual content from LangChain/MCP content blocks.

    MCP tools return results as list of content blocks with structure:
    [{"id": "lc_xxx", "text": "actual content", "type": "text"}, ...]

    This extracts the actual content from these blocks.
    """
    if not blocks:
        return None

    texts = []
    for block in blocks:
        if isinstance(block, dict):
            # Standard MCP content block: {id, text, type}
            if block.get("type") == "text" and "text" in block:
                text_content = block["text"]
                # The text might be a JSON string - try to parse it
                if isinstance(text_content, str):
                    try:
                        parsed = json.loads(text_content)
                        texts.append(parsed)
                    except (json.JSONDecodeError, TypeError):
                        texts.append(text_content)
                else:
                    texts.append(text_content)
            elif "content" in block:
                # Alternative format with 'content' key
                texts.append(block["content"])

    # Return based on what we extracted
    if len(texts) == 0:
        return blocks  # Fallback to original if no text blocks found
    elif len(texts) == 1:
        return texts[0]  # Single result - return directly
    else:
        return texts  # Multiple results - return as list


def _serialize_result(result: Any) -> str:
    """Serialize tool result to JSON string.

    Handles various result types including LangChain/MCP content blocks.
    MCP tools return results as list of content blocks with structure:
    [{"id": "lc_xxx", "text": "actual content", "type": "text"}, ...]

    This extracts the actual content before serializing.
    """
    if result is None:
        return "null"

    if isinstance(result, str):
        return result

    # Check for LangChain/MCP content block format
    if isinstance(result, list) and len(result) > 0:
        first_item = result[0]
        if isinstance(first_item, dict) and "type" in first_item and ("text" in first_item or "content" in first_item):
            # This is MCP content block format - extract actual content
            extracted = _extract_content_from_blocks(result)
            if extracted is not None:
                result = extracted

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
from ...approval.models import DANGEROUS_TOOLS, is_dangerous_tool as is_dangerous_tool_legacy
from ...approval.schema_extractor import get_tool_schema_by_mcp_name
from ...approval.handlers import create_pending_approval
from ...tools import execute_tool
from ...tools.registry import get_tool_registry

# Import credential error types for action_required detection
try:
    from mcp_servers.dependencies import CredentialsNotFoundError, CredentialsExpiredError
except ImportError:
    # Fallback if module not available
    class CredentialsNotFoundError(Exception):
        pass
    class CredentialsExpiredError(Exception):
        pass


def _is_tool_dangerous(tool_name: str) -> bool:
    """Check if a tool requires human approval.

    Uses the tool registry for pattern-based detection, with fallback
    to the legacy hardcoded list for backwards compatibility.

    Args:
        tool_name: MCP tool name (e.g., "admob_create_app")

    Returns:
        True if tool requires approval before execution
    """
    registry = get_tool_registry()

    # First check registry (pattern-based detection)
    if registry.tool_count > 0:
        return registry.is_dangerous(tool_name)

    # Fallback to legacy hardcoded list if registry not populated
    return is_dangerous_tool_legacy(tool_name)


async def _validate_entity_ids(
    tool_name: str,
    tool_args: dict,
    user_id: str | None,
    organization_id: str | None,
    context: str = "pre-approval",
) -> tuple[bool, str | None, list[dict]]:
    """Validate that entity IDs in tool args exist in the user's account.

    This is called BEFORE showing the approval form (pre-approval) to catch
    invalid/hallucinated IDs early. If validation fails, the LLM gets an error
    and can retry with valid IDs - the user never sees the broken approval form.

    Also called after approval as a safety net in case user modifies to invalid values.

    Args:
        tool_name: Name of the tool being executed
        tool_args: The tool arguments to validate
        user_id: User ID for entity resolution
        organization_id: Organization context
        context: "pre-approval" or "post-approval" for logging

    Returns:
        Tuple of (is_valid, error_message, invalid_entities)
    """
    from ...utils import get_resolver_for_account

    # Only validate mediation group tools
    # Support both curated names and Discovery-generated names
    MEDIATION_GROUP_TOOLS = (
        "admob_create_mediation_group",
        "admob_update_mediation_group",
        "accounts_mediationGroups_create",  # Discovery-generated
        "accounts_mediationGroups_patch",   # Discovery-generated
    )
    if tool_name not in MEDIATION_GROUP_TOOLS:
        return True, None, []

    if not user_id:
        return True, None, []

    # Get params (may be nested under 'params' key)
    params = tool_args.get("params", tool_args)
    if not isinstance(params, dict):
        return True, None, []

    # Support both 'account_id' and 'parent' field formats
    # 'parent' format: "accounts/pub-XXXXX" -> extract "pub-XXXXX"
    account_id = params.get("account_id")
    if not account_id:
        parent = params.get("parent", "")
        if parent.startswith("accounts/"):
            account_id = parent.replace("accounts/", "")
    if not account_id:
        return True, None, []

    # Get resolver
    resolver = await get_resolver_for_account(account_id, user_id, organization_id)
    if not resolver:
        return True, None, []  # Can't validate without resolver, proceed anyway

    invalid_entities = []

    # Validate ad sources - support both UI format and API format
    # UI format: separate bidding_lines and waterfall_lines arrays
    # API format: combined mediation_group_lines with cpm_mode field
    # Note: LLM sometimes sends these as JSON strings instead of arrays, so parse if needed
    def parse_lines(value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        return value if isinstance(value, list) else []

    bidding_lines = parse_lines(params.get("bidding_lines", []))
    waterfall_lines = parse_lines(params.get("waterfall_lines", []))
    mediation_group_lines = parse_lines(params.get("mediation_group_lines", []))

    # Helper to validate a line's ad_source_id
    async def validate_line(line: dict | str, field_prefix: str, index: int) -> dict | None:
        # Handle case where line is a string (just the ad_source_id) instead of dict
        if isinstance(line, str):
            ad_source_id = line
            display_name = "Unknown"
        elif isinstance(line, dict):
            ad_source_id = line.get("ad_source_id")
            display_name = line.get("display_name", "Unknown")
        else:
            # Skip unknown types
            return None

        if ad_source_id:
            resolved = await resolver.resolve_ad_source(ad_source_id)
            if not resolved["valid"]:
                return {
                    "type": "ad_source",
                    "field": f"{field_prefix}[{index}].ad_source_id",
                    "id": ad_source_id,
                    "display_name": display_name,
                }
        return None

    # Validate bidding_lines (UI format)
    for i, line in enumerate(bidding_lines):
        invalid = await validate_line(line, "bidding_lines", i)
        if invalid:
            invalid_entities.append(invalid)

    # Validate waterfall_lines (UI format)
    for i, line in enumerate(waterfall_lines):
        invalid = await validate_line(line, "waterfall_lines", i)
        if invalid:
            invalid_entities.append(invalid)

    # Validate mediation_group_lines (API format - combined list)
    for i, line in enumerate(mediation_group_lines):
        # Handle case where line is not a dict
        if isinstance(line, dict):
            cpm_mode = line.get("cpm_mode", "LIVE")
            line_type = "bidding" if cpm_mode == "LIVE" else "waterfall"
        else:
            line_type = "unknown"
        invalid = await validate_line(line, f"mediation_group_lines({line_type})", i)
        if invalid:
            invalid_entities.append(invalid)

    # Validate ad_unit_ids
    ad_unit_ids_str = params.get("ad_unit_ids", "")
    # Also check targeting.ad_unit_ids
    targeting = params.get("targeting", {})
    if isinstance(targeting, dict):
        targeting_ad_units = targeting.get("ad_unit_ids")
        if targeting_ad_units:
            if isinstance(targeting_ad_units, list):
                ad_unit_ids_str = ",".join(targeting_ad_units)
            elif isinstance(targeting_ad_units, str):
                ad_unit_ids_str = targeting_ad_units

    if ad_unit_ids_str:
        for uid in ad_unit_ids_str.split(","):
            uid = uid.strip()
            if uid:
                resolved = await resolver.resolve_ad_unit(uid)
                if not resolved["valid"]:
                    invalid_entities.append({
                        "type": "ad_unit",
                        "field": "ad_unit_ids",
                        "id": uid,
                    })

    if invalid_entities:
        # Build error message for LLM
        error_parts = [f"Entity validation failed ({context}). The following IDs are invalid:"]
        for entity in invalid_entities:
            if entity["type"] == "ad_source":
                error_parts.append(f"  - Ad Source ID '{entity['id']}' (line: {entity.get('display_name', 'Unknown')})")
            else:
                ad_unit_id = entity['id']
                # Check if it's a format error (app ID vs ad unit ID)
                if "~" in ad_unit_id and "/" not in ad_unit_id:
                    error_parts.append(f"  - '{ad_unit_id}' is an APP ID (uses ~), not an AD UNIT ID (uses /)")
                    error_parts.append(f"    Ad unit IDs have format: ca-app-pub-XXXXX/YYYYY (slash separator)")
                else:
                    error_parts.append(f"  - Ad Unit ID '{ad_unit_id}' does not exist")

        error_parts.append("")
        error_parts.append("IMPORTANT: Ad unit IDs use SLASH (/), app IDs use TILDE (~).")
        error_parts.append("Use accounts_adUnits_list to get valid ad unit IDs and retry with corrected values.")

        return False, "\n".join(error_parts), invalid_entities

    return True, None, []


def _get_pending_tool_calls(state: GraphState) -> list[ToolCall]:
    """Get tool calls that haven't been executed yet."""
    tool_calls = state.get("tool_calls", [])
    return [tc for tc in tool_calls if tc.get("result") is None]


async def _create_approval_request(
    tool_call: ToolCall,
    user_id: str | None = None,
    organization_id: str | None = None,
) -> ApprovalRequest:
    """Create an approval request for a dangerous tool.

    This stores the approval in the file-based system so the /chat/approve-tool
    endpoint can find and resolve it when the user clicks approve/deny.

    Also enriches tool args with resolved entity names for better UI display.

    Args:
        tool_call: The tool call to create approval for
        user_id: User ID for entity resolution
        organization_id: Organization context for entity resolution
    """
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})

    # Transform args to UI format for display in approval form
    # This converts mediation_group_lines to bidding_lines + waterfall_lines
    ui_tool_args = _maybe_transform_tool_args_for_ui(tool_name, tool_args)

    # Enrich with resolved entity names (ad sources, ad units, etc.)
    # This adds _ad_source_name and _ad_source_valid fields for UI display
    ui_tool_args = await _enrich_tool_args_with_names(
        tool_name, ui_tool_args, user_id, organization_id
    )

    # Store approval in file-based system (shared with /chat/approve-tool endpoint)
    tool_input_str = json.dumps(ui_tool_args)
    approval_id = create_pending_approval(tool_name, tool_input_str)

    # Extract schema for parameter form
    param_schema = None
    try:
        param_schema = get_tool_schema_by_mcp_name(tool_name)
    except Exception:
        pass  # Schema extraction failed, approval form will work without schema

    return {
        "approval_id": approval_id,
        "tool_name": tool_call.get("name", ""),
        "tool_args": ui_tool_args,  # Use UI-formatted args with resolved names
        "original_tool_args": tool_args,  # Keep original for execution
        "tool_call_id": tool_call.get("id", ""),
        "param_schema": param_schema,
    }


@traceable(name="tool_executor_node", run_type="tool")
async def tool_executor_node(state: GraphState, config: dict | None = None) -> dict:
    """Execute pending tool calls, with interrupt() for dangerous tools.

    For each pending tool call:
    1. Check if it's a dangerous tool (write operation)
    2. If dangerous: interrupt() and wait for approval
    3. If approved or safe: execute the tool
    4. Return results

    Progress streaming: Emits custom events via get_stream_writer() to provide
    real-time feedback during tool execution.

    Args:
        state: Current graph state with tool_calls
        config: LangGraph config for accessing stream writer

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

    is_dangerous = _is_tool_dangerous(tool_name)

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
                    "result": f"Tool '{tool_name}' was DENIED by user.",
                }],
                "messages": [
                    ToolMessage(
                        content=f"Tool '{tool_name}' was DENIED by user. Do NOT retry this tool. Acknowledge the denial and ask if the user wants to try something else.",
                        tool_call_id=tool_id,
                    )
                ],
            }
        else:
            # Needs approval - but first validate entities
            # This catches invalid/hallucinated IDs BEFORE showing approval to user
            user_context = state.get("user_context", {})
            user_id = user_context.get("user_id")
            organization_id = user_context.get("organization_id")

            # PRE-APPROVAL VALIDATION: Validate entities before showing approval form
            # If invalid, return error to LLM so it can retry - user never sees broken form
            entities_valid, entity_error, invalid_entities = await _validate_entity_ids(
                tool_name, tool_args, user_id, organization_id, context="pre-approval"
            )
            if not entities_valid:
                # Return error to LLM - it will retry with valid IDs
                updated_call = {
                    **tool_call,
                    "result": entity_error,
                    "validation_error": True,
                    "invalid_entities": invalid_entities,
                }
                return {
                    "tool_calls": [updated_call],
                    "messages": [
                        ToolMessage(
                            content=entity_error,
                            tool_call_id=tool_id,
                        )
                    ],
                }

            # Entities are valid - create approval request
            approval_request = await _create_approval_request(
                tool_call, user_id, organization_id
            )

            # Mark tool as dangerous and pending
            updated_call = {
                **tool_call,
                "is_dangerous": True,
                "approval_status": "pending",
            }

            # Use LangGraph interrupt() to pause execution
            # When user responds, execution resumes from this checkpoint
            interrupt_result = interrupt({
                "type": "tool_approval_required",
                "approval_id": approval_request["approval_id"],
                "tool_name": tool_name,
                "tool_args": approval_request["tool_args"],  # UI-formatted args for display
                "param_schema": approval_request.get("param_schema"),
            })

            # After interrupt resumes, check the result
            if isinstance(interrupt_result, dict):
                if interrupt_result.get("approved"):
                    # User approved - update args if modified
                    modified_args = interrupt_result.get("modified_params") or interrupt_result.get("modified_args")
                    if modified_args:
                        tool_args = modified_args
                        updated_call["args"] = modified_args
                    updated_call["approval_status"] = "approved"

                    # POST-APPROVAL VALIDATION: Safety net in case user modified to invalid values
                    entities_valid, entity_error, invalid_entities = await _validate_entity_ids(
                        tool_name, tool_args, user_id, organization_id, context="post-approval"
                    )
                    if not entities_valid:
                        updated_call["result"] = entity_error
                        updated_call["validation_error"] = True
                        updated_call["invalid_entities"] = invalid_entities
                        return {
                            "tool_calls": [updated_call],
                            "messages": [
                                ToolMessage(
                                    content=entity_error,
                                    tool_call_id=tool_id,
                                )
                            ],
                        }
                else:
                    # User denied
                    updated_call["approval_status"] = "denied"
                    updated_call["result"] = "Denied by user"
                    return {
                        "tool_calls": [updated_call],
                        "messages": [
                            ToolMessage(
                                content=f"Tool '{tool_name}' was DENIED by user. Do NOT retry this tool. Acknowledge the denial and ask if the user wants to try something else.",
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
    organization_id = user_context.get("organization_id")

    # NOTE: We rely on MCP caching in loader.py instead of passing tools through state.
    # StructuredTool objects can't be serialized by the PostgreSQL checkpointer.

    # Execute the tool
    try:
        result = await _execute_tool(
            tool_name, tool_args, service, user_id, organization_id
        )

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
        # Build actionable error message for LLM self-correction
        error_result = _build_actionable_error_message(tool_name, tool_args, e)
        updated_call = {
            **tool_call,
            "result": error_result,
        }

        # Check if this is a credential-related error and set action_required
        action_required = None
        error_str = str(e).lower()

        if isinstance(e, CredentialsNotFoundError) or ("credentials" in error_str and "not found" in error_str):
            # Determine the provider from the tool name
            provider = "admob" if tool_name.startswith("admob") else "gam" if tool_name.startswith("gam") else None
            action_required = {
                "action_type": "connect_provider",
                "message": f"Your {provider or 'ad platform'} account is not connected. Please connect it to use this feature.",
                "deep_link": "/providers",
                "blocking": True,
                "metadata": {"provider": provider, "tool_name": tool_name},
            }
        elif isinstance(e, CredentialsExpiredError) or "expired" in error_str or "reauthenticate" in error_str:
            provider = "admob" if tool_name.startswith("admob") else "gam" if tool_name.startswith("gam") else None
            action_required = {
                "action_type": "reauthenticate",
                "message": f"Your {provider or 'ad platform'} session has expired. Please reconnect your account.",
                "deep_link": "/providers",
                "blocking": True,
                "metadata": {"provider": provider, "tool_name": tool_name},
            }
        elif "rate limit" in error_str or "quota exceeded" in error_str or "too many requests" in error_str:
            action_required = {
                "action_type": "upgrade_plan",
                "message": "You've exceeded the rate limit for API calls. Please try again later or upgrade your plan.",
                "deep_link": "/billing",
                "blocking": False,  # User can retry later
                "metadata": {"tool_name": tool_name},
            }
        elif "permission" in error_str or "forbidden" in error_str or "unauthorized" in error_str:
            action_required = {
                "action_type": "grant_permissions",
                "message": "Additional permissions are required. Please reconnect your account with the necessary permissions.",
                "deep_link": "/providers",
                "blocking": True,
                "metadata": {"tool_name": tool_name},
            }

        result = {
            "tool_calls": [updated_call],
            "messages": [
                ToolMessage(
                    content=error_result,
                    tool_call_id=tool_id,
                )
            ],
        }

        if action_required:
            result["action_required"] = action_required
            # For blocking errors, set a response so the graph can end cleanly
            # without the specialist trying to retry
            if action_required.get("blocking"):
                result["response"] = action_required["message"]

        return result


def _build_actionable_error_message(tool_name: str, tool_args: dict, error: Exception) -> str:
    """Build an actionable error message that helps the LLM self-correct.

    Analyzes the error and provides specific guidance on how to fix it,
    including which tools to use to get valid values.

    Args:
        tool_name: Name of the tool that failed
        tool_args: Arguments that were passed to the tool
        error: The exception that was raised

    Returns:
        Detailed error message with actionable guidance
    """
    error_str = str(error)
    error_lower = error_str.lower()

    # Start with the basic error
    parts = [f"Error executing {tool_name}: {error_str}"]
    parts.append("")  # Empty line for readability

    # Detect error type and provide specific guidance

    # Invalid ID errors
    if any(phrase in error_lower for phrase in ["not found", "invalid", "does not exist", "no such"]):
        # Determine which entity type based on error and tool name
        if "ad_source" in error_lower or "adsource" in error_lower:
            parts.append("ISSUE: Invalid ad source ID provided.")
            parts.append("")
            parts.append("TO FIX: Use accounts_adSources_list to get valid ad source IDs for the account.")
            parts.append("Example: accounts_adSources_list(parent='accounts/pub-XXXXX')")
        elif "ad_unit" in error_lower or "adunit" in error_lower:
            parts.append("ISSUE: Invalid ad unit ID provided.")
            parts.append("")
            parts.append("TO FIX: Use accounts_adUnits_list to get valid ad unit IDs for the account.")
            parts.append("Example: accounts_adUnits_list(parent='accounts/pub-XXXXX')")
        elif "app" in error_lower:
            parts.append("ISSUE: Invalid app ID provided.")
            parts.append("")
            parts.append("TO FIX: Use accounts_apps_list to get valid app IDs for the account.")
            parts.append("Example: accounts_apps_list(parent='accounts/pub-XXXXX')")
        elif "account" in error_lower or "pub-" in error_str:
            parts.append("ISSUE: Invalid account ID provided.")
            parts.append("")
            parts.append("TO FIX: Use accounts_list to get valid account IDs.")
            parts.append("The account ID format should be 'pub-XXXXXXXXXXXXXXXX'")
        elif "mediation" in error_lower:
            parts.append("ISSUE: Invalid mediation group ID provided.")
            parts.append("")
            parts.append("TO FIX: Use accounts_mediationGroups_list to get valid mediation group IDs.")
        else:
            parts.append("ISSUE: An entity ID in your request does not exist.")
            parts.append("")
            parts.append("TO FIX: Use the appropriate list endpoint to get valid IDs:")
            parts.append("  - accounts_list - for account IDs")
            parts.append("  - accounts_apps_list - for app IDs")
            parts.append("  - accounts_adUnits_list - for ad unit IDs")
            parts.append("  - accounts_adSources_list - for ad source IDs")

    # Field/parameter errors
    elif any(phrase in error_lower for phrase in ["required", "missing", "must provide", "cannot be empty"]):
        parts.append("ISSUE: A required field is missing.")
        parts.append("")

        # Try to identify which field from the error message
        if "platform" in error_lower:
            parts.append("TO FIX: Add the 'platform' field. Valid values: 'ANDROID' or 'IOS'")
        elif "format" in error_lower or "ad_format" in error_lower:
            parts.append("TO FIX: Add the 'ad_format' field. Valid values:")
            parts.append("  BANNER, INTERSTITIAL, REWARDED, REWARDED_INTERSTITIAL, APP_OPEN, NATIVE")
        elif "ad_unit" in error_lower:
            parts.append("TO FIX: Add 'ad_unit_ids' field with valid ad unit IDs.")
            parts.append("Use accounts_adUnits_list to get valid IDs first.")
        elif "display_name" in error_lower or "name" in error_lower:
            parts.append("TO FIX: Add a 'display_name' field with a descriptive name (max 120 chars).")
        else:
            parts.append("TO FIX: Check the tool schema and provide all required fields.")
            parts.append("The error message above indicates which field is missing.")

    # Validation/constraint errors
    elif any(phrase in error_lower for phrase in ["invalid value", "invalid format", "must be", "should be", "expected"]):
        parts.append("ISSUE: A field has an invalid value format.")
        parts.append("")

        if "platform" in error_lower:
            parts.append("TO FIX: 'platform' must be exactly 'ANDROID' or 'IOS' (uppercase).")
        elif "cpm" in error_lower or "micros" in error_lower:
            parts.append("TO FIX: CPM values must be in micros (1 USD = 1,000,000 micros).")
            parts.append("Example: $1.50 = 1500000 micros")
        elif "state" in error_lower:
            parts.append("TO FIX: 'state' must be 'ENABLED' or 'DISABLED'.")
        elif "region" in error_lower or "country" in error_lower:
            parts.append("TO FIX: Region codes must be ISO 3166-1 alpha-2 (e.g., 'US', 'GB', 'DE').")
        else:
            parts.append("TO FIX: Check the format of your input values.")
            parts.append("The error message above indicates the expected format.")

    # Duplicate/conflict errors
    elif any(phrase in error_lower for phrase in ["already exists", "duplicate", "conflict"]):
        parts.append("ISSUE: This entity already exists or conflicts with an existing one.")
        parts.append("")
        parts.append("TO FIX: Either use a different name/ID, or use the update/patch endpoint instead of create.")

    # AdMob-specific errors
    elif "targeting" in error_lower:
        parts.append("ISSUE: Invalid targeting configuration.")
        parts.append("")
        parts.append("TO FIX: Ensure targeting fields are correctly structured:")
        parts.append("  - platform: 'ANDROID' or 'IOS'")
        parts.append("  - format: 'BANNER', 'INTERSTITIAL', 'REWARDED', etc.")
        parts.append("  - ad_unit_ids: List of valid ad unit IDs (use accounts_adUnits_list)")

    elif "mediation" in error_lower and "line" in error_lower:
        parts.append("ISSUE: Invalid mediation line configuration.")
        parts.append("")
        parts.append("TO FIX:")
        parts.append("  - Ensure ad_source_id is valid (use accounts_adSources_list)")
        parts.append("  - For bidding lines: cpm_mode should be 'LIVE'")
        parts.append("  - For waterfall lines: cpm_mode should be 'MANUAL' or 'ANO'")
        parts.append("  - AdMob Network (ID: 5450213213286189855) is BIDDING-ONLY")

    # JSON parsing errors
    elif any(phrase in error_lower for phrase in ["json", "parse", "decode", "syntax"]):
        parts.append("ISSUE: Invalid JSON format in request body.")
        parts.append("")
        parts.append("TO FIX: Ensure JSON strings are properly escaped and formatted.")
        parts.append("Common issues:")
        parts.append("  - Missing quotes around strings")
        parts.append("  - Trailing commas in arrays/objects")
        parts.append("  - Unescaped special characters")

    # Generic guidance if no specific pattern matched
    else:
        parts.append("TO FIX: Review the error message and adjust your request accordingly.")
        parts.append("")
        parts.append("Common debugging steps:")
        parts.append("  1. Verify all entity IDs exist using the appropriate list endpoint")
        parts.append("  2. Check required fields are provided with correct formats")
        parts.append("  3. Ensure enum values match exactly (case-sensitive)")

    # Add what was attempted (for context)
    if tool_args:
        parts.append("")
        parts.append("ATTEMPTED:")
        # Show key arguments without dumping the entire object
        params = tool_args.get("params", tool_args)
        if isinstance(params, dict):
            key_fields = ["parent", "account_id", "display_name", "platform", "ad_format"]
            shown = []
            for field in key_fields:
                if field in params:
                    shown.append(f"  {field}: {params[field]}")
            if shown:
                parts.extend(shown[:5])  # Limit to 5 fields

    return "\n".join(parts)


def _euros_to_micros(euros: float | int | str | None) -> int | None:
    """Convert euros to micros for AdMob API.

    1 EUR = 1,000,000 micros
    Example: 1.50 EUR = 1,500,000 micros

    Args:
        euros: Amount in euros (float, int, or string)

    Returns:
        Amount in micros (integer), or None if invalid
    """
    if euros is None:
        return None
    try:
        euro_value = float(euros)
        return int(round(euro_value * 1_000_000))
    except (ValueError, TypeError):
        return None


def _micros_to_euros(micros: int | str | None) -> float | None:
    """Convert micros to euros for UI display.

    1,000,000 micros = 1 EUR
    Example: 1,500,000 micros = 1.50 EUR

    Args:
        micros: Amount in micros (integer or string)

    Returns:
        Amount in euros (float), or None if invalid
    """
    if micros is None:
        return None
    try:
        return float(micros) / 1_000_000
    except (ValueError, TypeError):
        return None


def _transform_mediation_lines_to_ui(mediation_group_lines: list | None) -> dict:
    """Transform API mediation_group_lines to UI bidding/waterfall arrays.

    The LLM sends mediation_group_lines in API format, but the UI schema
    expects separate bidding_lines and waterfall_lines arrays.

    - Lines with cpm_mode=LIVE → bidding_lines
    - Lines with cpm_mode=MANUAL or ANO → waterfall_lines
    - cpm_micros is converted to cpm_floor (euros) for waterfall lines

    Args:
        mediation_group_lines: List of mediation line dicts from LLM

    Returns:
        Dict with bidding_lines and/or waterfall_lines arrays
    """
    if not mediation_group_lines:
        return {}

    bidding_lines = []
    waterfall_lines = []

    for line in mediation_group_lines:
        cpm_mode = line.get("cpm_mode", "LIVE")

        if cpm_mode == "LIVE":
            # Bidding line
            bidding_lines.append({
                "line_id": line.get("line_id"),
                "display_name": line.get("display_name", ""),
                "ad_source_id": line.get("ad_source_id", ""),
                "state": line.get("state", "ENABLED"),
                "experiment_variant": line.get("experiment_variant"),
            })
        else:
            # Waterfall line (MANUAL or ANO)
            waterfall_line = {
                "line_id": line.get("line_id"),
                "display_name": line.get("display_name", ""),
                "ad_source_id": line.get("ad_source_id", ""),
                "pricing_mode": "FIXED" if cpm_mode == "MANUAL" else "NETWORK_OPTIMIZED",
                "state": line.get("state", "ENABLED"),
                "experiment_variant": line.get("experiment_variant"),
            }
            # Convert cpm_micros to cpm_floor (euros)
            cpm_floor = _micros_to_euros(line.get("cpm_micros"))
            if cpm_floor is not None:
                waterfall_line["cpm_floor"] = cpm_floor

            waterfall_lines.append(waterfall_line)

    result = {}
    if bidding_lines:
        result["bidding_lines"] = bidding_lines
    if waterfall_lines:
        result["waterfall_lines"] = waterfall_lines

    return result


def _maybe_transform_tool_args_for_ui(tool_name: str, tool_args: dict) -> dict:
    """Transform tool args from API format to UI format for approval display.

    This is the REVERSE of _maybe_transform_tool_args, applied BEFORE
    the approval interrupt so the UI can display the data correctly.

    Handles two formats:
    1. Curated tools: admob_create_mediation_group with direct fields
    2. Discovery tools: accounts_mediationGroups_create with parent + body_json

    Args:
        tool_name: Name of the tool
        tool_args: Tool arguments from LLM (may have 'params' wrapper or body_json)

    Returns:
        Transformed tool args in UI format for RJSF form display
    """
    import copy

    # Map Discovery tool names to their curated equivalents
    MEDIATION_CREATE_TOOLS = (
        "admob_create_mediation_group",
        "accounts_mediationGroups_create",
    )
    MEDIATION_UPDATE_TOOLS = (
        "admob_update_mediation_group",
        "accounts_mediationGroups_patch",
    )

    if tool_name not in MEDIATION_CREATE_TOOLS + MEDIATION_UPDATE_TOOLS:
        return tool_args

    # Make a deep copy to avoid mutating original
    transformed = copy.deepcopy(tool_args)

    # Handle Discovery-generated tools with parent + body_json format
    if "body_json" in transformed:
        transformed = _transform_discovery_format_to_ui(transformed, tool_name)

    # Helper to parse JSON strings to arrays (LLM sometimes outputs arrays as strings)
    def parse_json_array(value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else value
            except (json.JSONDecodeError, TypeError):
                return value
        return value

    # Handle 'params' wrapper - LLM often sends args as {'params': {...}}
    if "params" in transformed and isinstance(transformed["params"], dict):
        params = transformed["params"]
        # Parse JSON strings for array fields
        if "bidding_lines" in params:
            params["bidding_lines"] = parse_json_array(params["bidding_lines"])
        if "waterfall_lines" in params:
            params["waterfall_lines"] = parse_json_array(params["waterfall_lines"])
        # Transform mediation_group_lines to UI format
        mediation_lines = params.pop("mediation_group_lines", None)
        if mediation_lines:
            ui_lines = _transform_mediation_lines_to_ui(mediation_lines)
            params.update(ui_lines)
    else:
        # No params wrapper - transform at top level
        # Parse JSON strings for array fields
        if "bidding_lines" in transformed:
            transformed["bidding_lines"] = parse_json_array(transformed["bidding_lines"])
        if "waterfall_lines" in transformed:
            transformed["waterfall_lines"] = parse_json_array(transformed["waterfall_lines"])
        # Transform mediation_group_lines to UI format
        mediation_lines = transformed.pop("mediation_group_lines", None)
        if mediation_lines:
            ui_lines = _transform_mediation_lines_to_ui(mediation_lines)
            transformed.update(ui_lines)

    return transformed


def _transform_discovery_format_to_ui(tool_args: dict, tool_name: str) -> dict:
    """Transform Discovery-generated tool format to UI format.

    Discovery tools use:
        {
            "parent": "accounts/pub-xxx",
            "body_json": "{ ...JSON string... }"
        }

    UI format expects:
        {
            "account_id": "pub-xxx",
            "display_name": "...",
            "platform": "ANDROID",
            "ad_format": "BANNER",
            ...
        }

    Args:
        tool_args: Discovery format tool args
        tool_name: Tool name for context

    Returns:
        Transformed args in UI format
    """
    import copy
    result = {}

    # Extract account_id from parent path
    parent = tool_args.get("parent", "")
    if parent.startswith("accounts/"):
        account_id = parent.replace("accounts/", "")
        result["account_id"] = account_id

    # Parse body_json
    body_json = tool_args.get("body_json", "{}")
    try:
        body = json.loads(body_json) if isinstance(body_json, str) else body_json
    except (json.JSONDecodeError, TypeError):
        body = {}

    # Map Google API fields to UI fields
    if "displayName" in body:
        result["display_name"] = body["displayName"]

    if "state" in body:
        result["state"] = body["state"]

    # Handle platform and format at root level (Discovery API format)
    if "platform" in body:
        result["platform"] = body["platform"]
    if "format" in body:
        result["ad_format"] = body["format"]

    # Handle targeting object
    targeting = body.get("targeting", {})
    if targeting:
        # Also check inside targeting (legacy format)
        if "platform" in targeting and "platform" not in result:
            result["platform"] = targeting["platform"]
        if "format" in targeting and "ad_format" not in result:
            result["ad_format"] = targeting["format"]
        if "adUnitIds" in targeting:
            ad_unit_ids = targeting["adUnitIds"]
            if isinstance(ad_unit_ids, list):
                result["ad_unit_ids"] = ", ".join(ad_unit_ids)
            else:
                result["ad_unit_ids"] = ad_unit_ids
        # Handle geo targeting
        if "targetedRegionCodes" in targeting:
            result.setdefault("advanced_targeting", {})["targeted_region_codes"] = ", ".join(targeting["targetedRegionCodes"])
        if "excludedRegionCodes" in targeting:
            result.setdefault("advanced_targeting", {})["excluded_region_codes"] = ", ".join(targeting["excludedRegionCodes"])
        if "idfaTargeting" in targeting:
            result.setdefault("advanced_targeting", {})["idfa_targeting"] = targeting["idfaTargeting"]

    # Handle mediationGroupLines - transform to UI format
    # Discovery API uses: { "biddingLines": [...], "waterfallLines": [...] }
    mediation_lines = body.get("mediationGroupLines", {})
    if mediation_lines:
        bidding_lines = []
        waterfall_lines = []

        # Handle Discovery API structure (object with biddingLines/waterfallLines)
        if isinstance(mediation_lines, dict):
            # Process bidding lines
            for line in mediation_lines.get("biddingLines", []):
                if isinstance(line, dict):
                    ui_line = {
                        "display_name": line.get("displayName", ""),
                        "ad_source_id": line.get("adSourceId", ""),
                        "state": line.get("state", "ENABLED"),
                    }
                    bidding_lines.append(ui_line)

            # Process waterfall lines
            for line in mediation_lines.get("waterfallLines", []):
                if isinstance(line, dict):
                    ui_line = {
                        "display_name": line.get("displayName", ""),
                        "ad_source_id": line.get("adSourceId", ""),
                        "state": line.get("state", "ENABLED"),
                    }
                    # Handle pricing mode
                    pricing_mode = line.get("pricingMode", "")
                    cpm_mode = line.get("cpmMode", "")
                    if pricing_mode == "FIXED" or cpm_mode == "MANUAL":
                        ui_line["pricing_mode"] = "FIXED"
                        cpm_micros = line.get("cpmMicros")
                        if cpm_micros:
                            ui_line["cpm_floor"] = int(cpm_micros) / 1_000_000
                    else:
                        ui_line["pricing_mode"] = "NETWORK_OPTIMIZED"
                    waterfall_lines.append(ui_line)

        # Handle legacy flat list format (for backwards compatibility)
        elif isinstance(mediation_lines, list):
            for line in mediation_lines:
                if not isinstance(line, dict):
                    continue
                ui_line = {
                    "display_name": line.get("displayName", ""),
                    "ad_source_id": line.get("adSourceId", ""),
                    "state": line.get("state", "ENABLED"),
                }
                cpm_mode = line.get("cpmMode")
                if cpm_mode in ("MANUAL", "ANO", "NETWORK_OPTIMIZED"):
                    if cpm_mode == "MANUAL":
                        ui_line["pricing_mode"] = "FIXED"
                        cpm_micros = line.get("cpmMicros")
                        if cpm_micros:
                            ui_line["cpm_floor"] = int(cpm_micros) / 1_000_000
                    else:
                        ui_line["pricing_mode"] = "NETWORK_OPTIMIZED"
                    waterfall_lines.append(ui_line)
                else:
                    bidding_lines.append(ui_line)

        if bidding_lines:
            result["bidding_lines"] = bidding_lines
        if waterfall_lines:
            result["waterfall_lines"] = waterfall_lines

    # For update tools, include mediation_group_id
    if "mediationGroups_patch" in tool_name or "update_mediation_group" in tool_name:
        # Extract from parent path: accounts/pub-xxx/mediationGroups/yyy
        parts = parent.split("/")
        if len(parts) >= 4 and parts[2] == "mediationGroups":
            result["mediation_group_id"] = parts[3]

    return result


async def _enrich_tool_args_with_names(
    tool_name: str,
    tool_args: dict,
    user_id: str | None,
    organization_id: str | None,
) -> dict:
    """Enrich tool args with resolved entity names.

    Fetches human-readable names for entity IDs (ad_source_id, ad_unit_ids, etc.)
    and adds them to the tool args for display in the approval form.

    Invalid IDs are marked with _valid: false so the UI can show error state.

    Args:
        tool_name: Name of the tool
        tool_args: Tool arguments (already in UI format)
        user_id: User ID for provider lookup
        organization_id: Organization context

    Returns:
        Enriched tool args with _resolved_name and _valid fields
    """
    from chat.utils.entity_resolver import get_resolver_for_account
    from chat.constants import is_coming_soon_bidding, is_coming_soon_waterfall
    import copy

    # Only enrich mediation group tools for now
    # Support both curated and Discovery-generated names
    MEDIATION_TOOLS = (
        "admob_create_mediation_group",
        "admob_update_mediation_group",
        "accounts_mediationGroups_create",
        "accounts_mediationGroups_patch",
    )
    if tool_name not in MEDIATION_TOOLS:
        return tool_args

    if not user_id:
        return tool_args

    # Deep copy to avoid mutation
    enriched = copy.deepcopy(tool_args)

    # Get params (may be nested under 'params' key)
    params = enriched.get("params", enriched)
    if isinstance(params, dict):
        # Get account_id to create resolver - support both 'account_id' and 'parent' formats
        account_id = params.get("account_id")
        if not account_id:
            parent = params.get("parent", "")
            if parent.startswith("accounts/"):
                account_id = parent.replace("accounts/", "")
        if not account_id:
            return enriched

        # Get resolver for this account
        resolver = await get_resolver_for_account(account_id, user_id, organization_id)
        if not resolver:
            return enriched

        # Enrich bidding_lines and filter out coming soon items
        bidding_lines = params.get("bidding_lines", [])
        filtered_bidding = []
        for line in bidding_lines:
            ad_source_id = line.get("ad_source_id")
            if ad_source_id:
                resolved = await resolver.resolve_ad_source(ad_source_id)
                line["_ad_source_name"] = resolved["name"]
                line["_ad_source_valid"] = resolved["valid"]
                # Filter out coming soon networks
                if resolved["name"] and is_coming_soon_bidding(resolved["name"]):
                    print(f"[tool_executor] Filtering out coming soon bidding network: {resolved['name']}")
                    continue
            filtered_bidding.append(line)
        if "bidding_lines" in params:
            params["bidding_lines"] = filtered_bidding

        # Enrich waterfall_lines and filter out coming soon items
        waterfall_lines = params.get("waterfall_lines", [])
        filtered_waterfall = []
        for line in waterfall_lines:
            ad_source_id = line.get("ad_source_id")
            if ad_source_id:
                resolved = await resolver.resolve_ad_source(ad_source_id)
                line["_ad_source_name"] = resolved["name"]
                line["_ad_source_valid"] = resolved["valid"]
                # Filter out coming soon networks
                if resolved["name"] and is_coming_soon_waterfall(resolved["name"]):
                    print(f"[tool_executor] Filtering out coming soon waterfall network: {resolved['name']}")
                    continue
            filtered_waterfall.append(line)
        if "waterfall_lines" in params:
            params["waterfall_lines"] = filtered_waterfall

        # Enrich ad_unit_ids - check both root level and inside targeting
        ad_unit_ids_str = params.get("ad_unit_ids", "")
        targeting = params.get("targeting", {})
        if isinstance(targeting, dict):
            targeting_ad_units = targeting.get("ad_unit_ids")
            if targeting_ad_units:
                if isinstance(targeting_ad_units, list):
                    ad_unit_ids_str = ",".join(targeting_ad_units)
                elif isinstance(targeting_ad_units, str):
                    ad_unit_ids_str = targeting_ad_units

        if ad_unit_ids_str:
            resolved_units = []
            for uid in ad_unit_ids_str.split(","):
                uid = uid.strip()
                if uid:
                    resolved = await resolver.resolve_ad_unit(uid)
                    resolved_units.append(resolved)
            params["_resolved_ad_units"] = resolved_units

    return enriched


def _transform_mediation_lines_to_api(bidding_lines: list | None, waterfall_lines: list | None) -> dict:
    """Transform UI arrays to API mediationGroupLines format (dict version - DEPRECATED).

    NOTE: This function returns a dict format which was used for the old API.
    The new Pydantic model expects a LIST. Use _transform_mediation_lines_to_list instead.
    """
    result = {}

    # Process bidding lines (cpmMode=LIVE, no cpm needed)
    for idx, line in enumerate(bidding_lines or []):
        line_id = line.get("line_id") or f"bidding_{idx}"
        api_line = {
            "displayName": line.get("display_name", ""),
            "adSourceId": line.get("ad_source_id", ""),
            "cpmMode": "LIVE",  # Always LIVE for bidding
            "state": line.get("state", "ENABLED"),
        }
        if line.get("experiment_variant"):
            api_line["experimentVariant"] = line["experiment_variant"]
        result[line_id] = api_line

    # Process waterfall lines (cpmMode=MANUAL or ANO based on pricing_mode)
    for idx, line in enumerate(waterfall_lines or []):
        line_id = line.get("line_id") or f"waterfall_{idx}"
        pricing_mode = line.get("pricing_mode", "FIXED")

        api_line = {
            "displayName": line.get("display_name", ""),
            "adSourceId": line.get("ad_source_id", ""),
            "cpmMode": "MANUAL" if pricing_mode == "FIXED" else "ANO",
            "state": line.get("state", "ENABLED"),
        }

        # Convert cpm_floor (euros) to cpmMicros for FIXED pricing (MANUAL mode)
        if pricing_mode == "FIXED":
            # Check both cpm_floor (new) and cpm_micros (legacy) for backwards compat
            cpm_floor = line.get("cpm_floor")
            cpm_micros = line.get("cpm_micros")

            if cpm_floor is not None:
                # New format: euros -> convert to micros
                micros = _euros_to_micros(cpm_floor)
                if micros:
                    api_line["cpmMicros"] = str(micros)
            elif cpm_micros is not None:
                # Legacy format: already in micros
                api_line["cpmMicros"] = str(cpm_micros)

        if line.get("experiment_variant"):
            api_line["experimentVariant"] = line["experiment_variant"]

        result[line_id] = api_line

    return result


def _transform_mediation_lines_to_list(bidding_lines: list | None, waterfall_lines: list | None) -> list:
    """Transform UI arrays to API mediationGroupLines format (list version).

    The UI separates bidding and waterfall lines for better UX, but the
    AdMob MCP tool expects them merged into a single mediation_group_lines list.

    - Bidding lines always use cpm_mode=LIVE (real-time auction)
    - Waterfall lines use cpm_mode=MANUAL (fixed CPM) or ANO (network optimized)
    - cpm_floor (euros) is converted to cpm_micros for the API

    Args:
        bidding_lines: List of bidding line configs from UI
        waterfall_lines: List of waterfall line configs from UI

    Returns:
        List of MediationGroupLine dicts with snake_case keys
    """
    result = []

    # Process bidding lines (cpm_mode=LIVE, no cpm needed)
    for idx, line in enumerate(bidding_lines or []):
        api_line = {
            "line_id": line.get("line_id") or f"bidding_{idx}",
            "display_name": line.get("display_name", ""),
            "ad_source_id": line.get("ad_source_id", ""),
            "cpm_mode": "LIVE",  # Always LIVE for bidding
            "state": line.get("state", "ENABLED"),
        }
        if line.get("experiment_variant"):
            api_line["experiment_variant"] = line["experiment_variant"]
        result.append(api_line)

    # Process waterfall lines (cpm_mode=MANUAL or ANO based on pricing_mode)
    for idx, line in enumerate(waterfall_lines or []):
        pricing_mode = line.get("pricing_mode", "FIXED")

        api_line = {
            "line_id": line.get("line_id") or f"waterfall_{idx}",
            "display_name": line.get("display_name", ""),
            "ad_source_id": line.get("ad_source_id", ""),
            "cpm_mode": "MANUAL" if pricing_mode == "FIXED" else "ANO",
            "state": line.get("state", "ENABLED"),
        }

        # Convert cpm_floor (euros) to cpm_micros for FIXED pricing (MANUAL mode)
        if pricing_mode == "FIXED":
            # Check both cpm_floor (new) and cpm_micros (legacy) for backwards compat
            cpm_floor = line.get("cpm_floor")
            cpm_micros = line.get("cpm_micros")

            if cpm_floor is not None:
                # New format: euros -> convert to micros
                micros = _euros_to_micros(cpm_floor)
                if micros:
                    api_line["cpm_micros"] = micros
            elif cpm_micros is not None:
                # Legacy format: already in micros
                api_line["cpm_micros"] = int(cpm_micros) if isinstance(cpm_micros, str) else cpm_micros

        if line.get("experiment_variant"):
            api_line["experiment_variant"] = line["experiment_variant"]

        result.append(api_line)

    return result


def _maybe_transform_tool_args(tool_name: str, tool_args: dict) -> dict:
    """Transform tool args if needed for specific tools.

    Currently handles:
    - admob_create_mediation_group: Merge bidding_lines + waterfall_lines, flatten advanced_targeting
    - admob_update_mediation_group: Merge bidding_lines + waterfall_lines, flatten advanced_targeting

    Args:
        tool_name: Name of the tool being executed
        tool_args: Original tool arguments from UI (may have 'params' wrapper)

    Returns:
        Transformed tool arguments ready for API (ALWAYS with 'params' wrapper for mediation tools)
    """
    print(f"[_maybe_transform_tool_args] tool_name={tool_name}")
    print(f"[_maybe_transform_tool_args] input tool_args keys={list(tool_args.keys())}")
    print(f"[_maybe_transform_tool_args] 'params' in tool_args={('params' in tool_args)}")

    # Check if this is a mediation group tool that needs transformation
    if tool_name in ("admob_create_mediation_group", "admob_update_mediation_group"):
        # Handle 'params' wrapper - args may be nested under 'params' key
        if "params" in tool_args and isinstance(tool_args["params"], dict):
            print(f"[_maybe_transform_tool_args] HAS params wrapper - keeping as-is")
            params = tool_args["params"]
            _transform_mediation_params(params)
            # Keep the params wrapper intact for MCP tool
            print(f"[_maybe_transform_tool_args] Returning WITH wrapper: keys={list(tool_args.keys())}")
            return tool_args
        else:
            # No params wrapper (e.g., from UI modified params) - transform and WRAP
            # MCP tool expects {"params": {...}} format
            print(f"[_maybe_transform_tool_args] NO params wrapper - wrapping now")
            _transform_mediation_params(tool_args)
            result = {"params": tool_args}
            print(f"[_maybe_transform_tool_args] Returning WRAPPED: keys={list(result.keys())}, inner keys={list(tool_args.keys())}")
            return result

    return tool_args


def _transform_mediation_params(params: dict) -> None:
    """Transform mediation group params in place.

    Handles:
    - Building 'targeting' nested object from flat fields (platform, ad_format, ad_unit_ids)
    - Converting bidding_lines + waterfall_lines into mediation_group_lines LIST

    Args:
        params: Dict to transform in place
    """
    # Build targeting object from flat fields if not already present
    if "targeting" not in params:
        targeting = {}

        # Platform (required)
        if "platform" in params:
            targeting["platform"] = params.pop("platform")

        # Format (required) - UI uses 'ad_format', API uses 'format'
        if "ad_format" in params:
            targeting["format"] = params.pop("ad_format")
        elif "format" in params:
            targeting["format"] = params.pop("format")

        # Ad unit IDs (required) - convert comma-separated string to list
        if "ad_unit_ids" in params:
            ad_unit_ids = params.pop("ad_unit_ids")
            if isinstance(ad_unit_ids, str):
                # Split comma-separated string, strip whitespace
                targeting["ad_unit_ids"] = [uid.strip() for uid in ad_unit_ids.split(",") if uid.strip()]
            elif isinstance(ad_unit_ids, list):
                targeting["ad_unit_ids"] = ad_unit_ids

        # Optional targeting fields from advanced_targeting
        advanced_targeting = params.pop("advanced_targeting", None)
        if advanced_targeting and isinstance(advanced_targeting, dict):
            if advanced_targeting.get("targeted_region_codes"):
                targeting["targeted_region_codes"] = advanced_targeting["targeted_region_codes"]
            if advanced_targeting.get("excluded_region_codes"):
                targeting["excluded_region_codes"] = advanced_targeting["excluded_region_codes"]
            if advanced_targeting.get("idfa_targeting"):
                targeting["idfa_targeting"] = advanced_targeting["idfa_targeting"]

        # Also check top-level optional targeting fields
        if "targeted_region_codes" in params:
            targeting["targeted_region_codes"] = params.pop("targeted_region_codes")
        if "excluded_region_codes" in params:
            targeting["excluded_region_codes"] = params.pop("excluded_region_codes")
        if "idfa_targeting" in params:
            targeting["idfa_targeting"] = params.pop("idfa_targeting")

        if targeting:
            params["targeting"] = targeting

    # Remove internal fields that shouldn't be sent to the API
    params.pop("_resolved_ad_units", None)

    # Transform bidding/waterfall lines to API format (LIST of MediationGroupLine)
    bidding_lines = params.pop("bidding_lines", None)
    waterfall_lines = params.pop("waterfall_lines", None)

    # Only transform if we have the new UI format
    if bidding_lines is not None or waterfall_lines is not None:
        mediation_lines = _transform_mediation_lines_to_list(bidding_lines, waterfall_lines)
        if mediation_lines:
            params["mediation_group_lines"] = mediation_lines


async def _execute_tool(
    tool_name: str,
    tool_args: dict,
    service: str = "admob",
    user_id: str | None = None,
    organization_id: str | None = None,
    max_retries: int = 3,
) -> Any:
    """Execute a tool by name with given arguments, with retry for transient errors.

    Uses the execute_tool function which keeps the MCP client context
    open during tool execution. MCP caching in loader.py handles tool reuse.

    Retry logic: Retries on transient errors (connection, timeout, 5xx) up to
    max_retries times with exponential backoff. Does NOT retry on auth errors
    or 4xx client errors.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        service: Service name for loading tools ("admob", "admanager")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        max_retries: Maximum number of retry attempts for transient errors

    Returns:
        Tool execution result
    """
    import asyncio

    # Transform args if needed (e.g., merge bidding/waterfall lines)
    print(f"[tool_executor] BEFORE transform - tool_args: {tool_args}")
    print(f"[tool_executor] BEFORE transform - has 'params' key: {'params' in tool_args}")
    transformed_args = _maybe_transform_tool_args(tool_name, tool_args.copy())
    print(f"[tool_executor] AFTER transform - transformed_args: {transformed_args}")
    print(f"[tool_executor] AFTER transform - has 'params' key: {'params' in transformed_args}")

    def _is_retryable_error(error: Exception) -> bool:
        """Check if an error is transient and should be retried."""
        error_str = str(error).lower()

        # Don't retry auth/credential errors
        if any(keyword in error_str for keyword in [
            "credential", "unauthorized", "forbidden", "permission",
            "authentication", "401", "403"
        ]):
            return False

        # Don't retry client errors (4xx except rate limits)
        if any(keyword in error_str for keyword in [
            "bad request", "not found", "invalid", "400", "404", "422"
        ]):
            return False

        # Retry transient errors
        if any(keyword in error_str for keyword in [
            "timeout", "connection", "network", "temporary", "unavailable",
            "rate limit", "too many requests", "429", "500", "502", "503", "504"
        ]):
            return True

        # Retry generic server errors
        if "server error" in error_str or "internal error" in error_str:
            return True

        return False

    last_error = None
    for attempt in range(max_retries):
        try:
            result = await execute_tool(
                tool_name=tool_name,
                tool_args=transformed_args,
                service=service,
                user_id=user_id,
                organization_id=organization_id,
            )
            return result
        except Exception as e:
            last_error = e
            if not _is_retryable_error(e):
                print(f"[tool_executor] Non-retryable error on {tool_name}: {e}")
                raise

            if attempt < max_retries - 1:
                # Exponential backoff: 1s, 2s, 4s
                delay = 2 ** attempt
                print(f"[tool_executor] Retryable error on {tool_name} (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"[tool_executor] Retrying in {delay}s...")
                await asyncio.sleep(delay)
            else:
                print(f"[tool_executor] Max retries ({max_retries}) exceeded for {tool_name}: {e}")
                raise

    # Should not reach here, but just in case
    if last_error:
        raise last_error


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
