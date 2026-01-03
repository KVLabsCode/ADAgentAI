"""
Google Ad Manager MCP Utilities

Generic formatting and error handling for all endpoints.
"""

import json
from typing import Any, Dict, Optional

from .api_client import AdManagerAPIError
from .models import ResponseFormat


def handle_api_error(error: Exception) -> str:
    """Format API errors into actionable messages."""
    if isinstance(error, AdManagerAPIError):
        message = f"**Error**: {error.message}"
        if error.status_code:
            message += f" (Status: {error.status_code})"
        if error.details:
            message += f"\n\nDetails: {json.dumps(error.details, indent=2)}"
        return message
    return f"**Error**: {str(error)}"


def format_response(
    data: Dict[str, Any],
    resource_type: str,
    response_format: ResponseFormat,
    pagination: Optional[Dict[str, Any]] = None
) -> str:
    """Format API response based on requested format."""
    if response_format == ResponseFormat.JSON:
        return format_json_response(data, pagination)
    return format_markdown_response(data, resource_type, pagination)


def format_json_response(
    data: Dict[str, Any],
    pagination: Optional[Dict[str, Any]] = None
) -> str:
    """Format response as JSON."""
    result = {"data": data}
    if pagination:
        result["pagination"] = pagination
    return json.dumps(result, indent=2, default=str)


def format_markdown_response(
    data: Dict[str, Any],
    resource_type: str,
    pagination: Optional[Dict[str, Any]] = None
) -> str:
    """Format response as markdown."""
    lines = [f"# {resource_type.replace('_', ' ').title()} Response\n"]

    # Check for list response
    list_key = None
    for key in data:
        if isinstance(data.get(key), list):
            list_key = key
            break

    if list_key:
        items = data[list_key]
        lines.append(f"**Found {len(items)} {list_key}**\n")

        for i, item in enumerate(items[:20], 1):  # Limit to 20 items
            name = item.get("displayName") or item.get("name") or f"Item {i}"
            lines.append(f"## {i}. {name}\n")
            for key, value in item.items():
                if key not in ("name",) and value is not None:
                    lines.append(f"- **{key}**: {_format_value(value)}")
            lines.append("")

        if len(items) > 20:
            lines.append(f"*... and {len(items) - 20} more items*\n")
    else:
        # Single item response
        for key, value in data.items():
            if value is not None:
                lines.append(f"- **{key}**: {_format_value(value)}")

    # Add pagination info
    if pagination:
        lines.append("\n---")
        if pagination.get("nextPageToken"):
            lines.append(f"*Next page token: {pagination['nextPageToken'][:30]}...*")
        if pagination.get("totalSize"):
            lines.append(f"*Total: {pagination['totalSize']}*")

    return "\n".join(lines)


def _format_value(value: Any) -> str:
    """Format a single value for markdown display."""
    if isinstance(value, dict):
        return json.dumps(value, indent=2, default=str)
    if isinstance(value, list):
        if len(value) <= 3:
            return ", ".join(str(v) for v in value)
        return f"{len(value)} items"
    return str(value)


def build_pagination_info(response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract pagination info from response."""
    pagination = {}
    if "nextPageToken" in response:
        pagination["nextPageToken"] = response["nextPageToken"]
    if "totalSize" in response:
        pagination["totalSize"] = response["totalSize"]
    return pagination if pagination else None


def truncate_output(text: str, max_length: int = 10000) -> str:
    """Truncate output if too long."""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "\n\n*... output truncated ...*"
