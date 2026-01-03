#!/usr/bin/env python3
"""
Generate complete admanager_mcp from discovery document.
Creates all 154 API endpoints as MCP tools, models, and server.
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DISCOVERY_FILE = BASE_DIR / "admanager_v1_discovery.json"
OUTPUT_DIR = BASE_DIR / "admanager_mcp"
TOOLS_DIR = OUTPUT_DIR / "tools"


def to_snake_case(name: str) -> str:
    """Convert camelCase to snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def extract_methods(resources: dict, parent_path: str = "", parent_resource: str = "") -> list:
    """Recursively extract all methods from resources."""
    methods = []
    for name, resource in resources.items():
        resource_path = f"{parent_path}/{name}" if parent_path else name
        # Build full resource name including parent for unique naming
        full_resource = f"{parent_resource}_{name}" if parent_resource else name

        if "methods" in resource:
            for method_name, method_info in resource["methods"].items():
                flat_path = method_info.get("flatPath", "")
                path_params = re.findall(r'\{(\w+)\}', flat_path)

                methods.append({
                    "id": method_info.get("id", ""),
                    "resource": name,
                    "fullResource": full_resource,  # Use for unique naming
                    "action": method_name,
                    "httpMethod": method_info.get("httpMethod", ""),
                    "description": method_info.get("description", ""),
                    "flatPath": flat_path,
                    "pathParams": path_params,
                    "queryParams": [k for k, v in method_info.get("parameters", {}).items()
                                   if v.get("location") == "query"],
                    "hasRequestBody": "request" in method_info,
                    "requestRef": method_info.get("request", {}).get("$ref", ""),
                })

        if "resources" in resource:
            methods.extend(extract_methods(resource["resources"], resource_path, full_resource))

    return methods


def get_method_name(method: dict) -> str:
    """Generate Python method name from method info."""
    action = to_snake_case(method["action"])
    # Use fullResource for unique naming
    resource = to_snake_case(method.get("fullResource", method["resource"]))
    return f"{action}_{resource}"


def get_tool_name(method: dict) -> str:
    """Generate MCP tool name from method info."""
    return f"admanager_{get_method_name(method)}"


def get_class_name(method: dict) -> str:
    """Generate Pydantic class name from method info."""
    method_name = get_method_name(method)
    return ''.join(word.title() for word in method_name.split('_')) + 'Input'


def _group_methods(methods: list) -> dict:
    """Group methods by resource."""
    groups = {}
    for m in methods:
        parts = m["id"].replace("admanager.", "").split(".")
        if len(parts) >= 2:
            group = parts[1] if parts[0] == "networks" else parts[0]
        else:
            group = "base"

        if group not in groups:
            groups[group] = []
        groups[group].append(m)

    return groups


def generate_api_client(methods: list) -> str:
    """Generate api_client.py content."""
    groups = _group_methods(methods)

    code = '''"""
Google Ad Manager API Client with OAuth 2.0 authentication.

Complete v1 API client supporting ALL 154 endpoints.
Auto-generated from discovery document.
"""

import os
from typing import Optional, Dict, Any, List
import httpx

from .constants import API_BASE_URL, REQUEST_TIMEOUT, OAUTH_SCOPES, DEFAULT_PAGE_SIZE


class AdManagerAPIError(Exception):
    """Custom exception for Ad Manager API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AdManagerClient:
    """
    Async client for Google Ad Manager API v1 with OAuth 2.0 authentication.

    Supports ALL 154 API endpoints.
    """

    def __init__(self):
        self._access_token: Optional[str] = None
        self._credentials = None

    async def _get_access_token(self) -> str:
        """Get or refresh the OAuth 2.0 access token."""
        if os.environ.get("AD_MANAGER_ACCESS_TOKEN"):
            return os.environ["AD_MANAGER_ACCESS_TOKEN"]

        credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path:
            try:
                from google.oauth2 import service_account
                from google.auth.transport.requests import Request

                if self._credentials is None:
                    self._credentials = service_account.Credentials.from_service_account_file(
                        credentials_path,
                        scopes=OAUTH_SCOPES
                    )

                if self._credentials.expired or not self._credentials.token:
                    self._credentials.refresh(Request())

                return self._credentials.token
            except ImportError:
                raise AdManagerAPIError(
                    "Google Auth library not installed. Run: pip install google-auth",
                    details={"fix": "pip install google-auth"}
                )
            except Exception as e:
                raise AdManagerAPIError(
                    f"Failed to authenticate with service account: {str(e)}",
                    details={"credentials_path": credentials_path}
                )

        raise AdManagerAPIError(
            "No authentication configured. Set AD_MANAGER_ACCESS_TOKEN or GOOGLE_APPLICATION_CREDENTIALS."
        )

    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an authenticated request to the Ad Manager API."""
        access_token = await self._get_access_token()

        url = f"{API_BASE_URL}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=json_data,
                )

                if response.status_code in (200, 201):
                    return response.json() if response.text else {}

                error_body = {}
                try:
                    error_body = response.json()
                except Exception:
                    pass

                error_message = self._format_error(response.status_code, error_body)
                raise AdManagerAPIError(error_message, response.status_code, error_body)

            except httpx.TimeoutException:
                raise AdManagerAPIError("Request timed out. Please try again.")
            except httpx.ConnectError:
                raise AdManagerAPIError("Failed to connect to Ad Manager API.")

    def _format_error(self, status_code: int, error_body: dict) -> str:
        """Format API error into actionable message."""
        error_info = error_body.get("error", {})
        api_message = error_info.get("message", "Unknown error")

        if status_code == 401:
            return f"Authentication failed: {api_message}"
        elif status_code == 403:
            return f"Permission denied: {api_message}"
        elif status_code == 404:
            return f"Resource not found: {api_message}"
        elif status_code == 429:
            return "Rate limit exceeded. Please wait."
        elif status_code >= 500:
            return f"Server error ({status_code}). Try again later."
        else:
            return f"API error ({status_code}): {api_message}"

'''

    # Generate methods for each resource group
    for group, group_methods in sorted(groups.items()):
        code += f'''
    # =========================================================================
    # {group.replace("_", " ").title()} Methods ({len(group_methods)} endpoints)
    # =========================================================================
'''

        for m in group_methods:
            method_name = get_method_name(m)
            http_method = m["httpMethod"]
            flat_path = m["flatPath"].replace("v1/", "")
            desc = m["description"][:80] if m["description"] else "No description"

            # Build parameters
            params = ["self", "network_code: str"]

            for p in m["pathParams"]:
                if p != "networksId":
                    param_name = to_snake_case(p.replace("Id", "_id"))
                    params.append(f"{param_name}: str")

            if m["hasRequestBody"]:
                params.append("data: Dict[str, Any]")

            if m["action"] == "list":
                params.extend([
                    "page_size: int = DEFAULT_PAGE_SIZE",
                    "page_token: Optional[str] = None",
                    "filter_str: Optional[str] = None"
                ])

            if m["action"] == "patch":
                params.append("update_mask: Optional[str] = None")

            sig = ", ".join(params)

            # Build endpoint
            endpoint = flat_path.replace("{networksId}", "{network_code}")
            for p in m["pathParams"]:
                if p != "networksId":
                    param_name = to_snake_case(p.replace("Id", "_id"))
                    endpoint = endpoint.replace("{" + p + "}", "{" + param_name + "}")

            code += f'''
    async def {method_name}({sig}) -> Dict[str, Any]:
        """{desc}"""
        params: Dict[str, Any] = {{}}
'''

            if m["action"] == "list":
                code += '''        params["pageSize"] = page_size
        if page_token:
            params["pageToken"] = page_token
        if filter_str:
            params["filter"] = filter_str
'''

            if m["action"] == "patch":
                code += '''        if update_mask:
            params["updateMask"] = update_mask
'''

            if m["hasRequestBody"]:
                code += f'        return await self.request("{http_method}", f"{endpoint}", params=params or None, json_data=data)\n'
            else:
                code += f'        return await self.request("{http_method}", f"{endpoint}", params=params or None)\n'

    code += '''

# Global client instance
_client: Optional[AdManagerClient] = None


def get_client() -> AdManagerClient:
    """Get or create the global Ad Manager client instance."""
    global _client
    if _client is None:
        _client = AdManagerClient()
    return _client
'''

    return code


def generate_models(methods: list) -> str:
    """Generate models.py with Pydantic input models for all endpoints."""
    groups = _group_methods(methods)

    code = '''"""
Google Ad Manager MCP Input Models

Auto-generated Pydantic models for all 154 API endpoints.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ResponseFormat(str, Enum):
    """Response format options."""
    MARKDOWN = "markdown"
    JSON = "json"


# =============================================================================
# Base Input Models
# =============================================================================

class BaseInput(BaseModel):
    """Base input with common fields."""
    response_format: ResponseFormat = Field(
        default=ResponseFormat.MARKDOWN,
        description="Output format: 'markdown' for human-readable, 'json' for structured data"
    )


class NetworkInput(BaseInput):
    """Base input requiring network_code."""
    network_code: str = Field(..., description="Ad Manager network code (e.g., '123456789')")


class PaginatedInput(NetworkInput):
    """Input for paginated list operations."""
    page_size: int = Field(default=50, description="Maximum results per page", ge=1, le=1000)
    page_token: Optional[str] = Field(default=None, description="Token for next page")
    filter: Optional[str] = Field(default=None, description="Filter expression")


'''

    # Generate input models for each method
    for group, group_methods in sorted(groups.items()):
        code += f'''
# =============================================================================
# {group.replace("_", " ").title()} Models
# =============================================================================

'''
        for m in group_methods:
            class_name = get_class_name(m)

            # Determine base class and extra fields
            has_path_params = [p for p in m["pathParams"] if p != "networksId"]

            if m["action"] == "list":
                base_class = "PaginatedInput"
            else:
                base_class = "NetworkInput"

            code += f'''class {class_name}({base_class}):
    """{m["description"][:100] if m["description"] else "No description"}"""
'''

            # Add path params (except networksId which is in NetworkInput)
            for p in has_path_params:
                param_name = to_snake_case(p.replace("Id", "_id"))
                code += f'    {param_name}: str = Field(..., description="{p} identifier")\n'

            # Add data field for request body
            if m["hasRequestBody"]:
                code += '    data: Dict[str, Any] = Field(..., description="Request body data")\n'

            # Add update_mask for patch operations
            if m["action"] == "patch":
                code += '    update_mask: Optional[str] = Field(default=None, description="Fields to update")\n'

            # If no extra fields, add pass
            if not has_path_params and not m["hasRequestBody"] and m["action"] != "patch":
                code += '    pass\n'

            code += '\n'

    return code


def generate_tool_file(group: str, group_methods: list) -> str:
    """Generate a tool file for a resource group."""

    # Generate class names for imports
    model_imports = []
    for m in group_methods:
        class_name = get_class_name(m)
        model_imports.append(class_name)

    # Format imports nicely
    imports_str = ",\n    ".join(model_imports)

    code = f'''"""
Google Ad Manager {group.replace("_", " ").title()} Tools

Auto-generated MCP tools for {group} endpoints.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ResponseFormat,
    {imports_str},
)
from ..utils import handle_api_error, format_response


def register_{group}_tools(mcp: FastMCP) -> None:
    """Register {group} tools with the MCP server."""

'''

    for m in group_methods:
        method_name = get_method_name(m)
        tool_name = get_tool_name(m)
        class_name = get_class_name(m)

        # Determine annotations
        is_readonly = m["httpMethod"] == "GET"
        is_destructive = m["httpMethod"] == "DELETE"
        is_idempotent = m["httpMethod"] in ("GET", "PUT", "DELETE")

        annotations = []
        annotations.append(f'"readOnlyHint": {is_readonly}')
        if is_destructive:
            annotations.append('"destructiveHint": True')
        annotations.append(f'"idempotentHint": {is_idempotent}')

        desc = m["description"][:200] if m["description"] else "No description available."

        # Build API call arguments
        api_args = ["params.network_code"]
        for p in m["pathParams"]:
            if p != "networksId":
                param_name = to_snake_case(p.replace("Id", "_id"))
                api_args.append(f"params.{param_name}")

        if m["hasRequestBody"]:
            api_args.append("params.data")

        if m["action"] == "list":
            api_args.extend(["params.page_size", "params.page_token", "params.filter"])

        if m["action"] == "patch":
            api_args.append("params.update_mask")

        api_call = ", ".join(api_args)

        code += f'''    @mcp.tool(
        name="{tool_name}",
        annotations={{{", ".join(annotations)}}}
    )
    async def {tool_name}(params: {class_name}) -> str:
        """
        {desc}
        """
        try:
            client = get_client()
            response = await client.{method_name}({api_call})
            return format_response(response, "{group}", params.response_format)
        except Exception as e:
            return handle_api_error(e)

'''

    return code


def generate_tools_init(groups: dict) -> str:
    """Generate tools/__init__.py with all registrations."""

    code = '''"""
Google Ad Manager MCP Tools

Auto-generated tool registrations for all 154 endpoints.
"""

from mcp.server.fastmcp import FastMCP

'''

    # Add imports
    for group in sorted(groups.keys()):
        code += f'from .{group} import register_{group}_tools\n'

    code += '''

def register_all_tools(mcp: FastMCP) -> None:
    """Register all Ad Manager tools with the MCP server."""
'''

    for group in sorted(groups.keys()):
        code += f'    register_{group}_tools(mcp)\n'

    return code


def generate_utils() -> str:
    """Generate utils.py with generic formatters."""

    return '''"""
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
            message += f"\\n\\nDetails: {json.dumps(error.details, indent=2)}"
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
    lines = [f"# {resource_type.replace('_', ' ').title()} Response\\n"]

    # Check for list response
    list_key = None
    for key in data:
        if isinstance(data.get(key), list):
            list_key = key
            break

    if list_key:
        items = data[list_key]
        lines.append(f"**Found {len(items)} {list_key}**\\n")

        for i, item in enumerate(items[:20], 1):  # Limit to 20 items
            name = item.get("displayName") or item.get("name") or f"Item {i}"
            lines.append(f"## {i}. {name}\\n")
            for key, value in item.items():
                if key not in ("name",) and value is not None:
                    lines.append(f"- **{key}**: {_format_value(value)}")
            lines.append("")

        if len(items) > 20:
            lines.append(f"*... and {len(items) - 20} more items*\\n")
    else:
        # Single item response
        for key, value in data.items():
            if value is not None:
                lines.append(f"- **{key}**: {_format_value(value)}")

    # Add pagination info
    if pagination:
        lines.append("\\n---")
        if pagination.get("nextPageToken"):
            lines.append(f"*Next page token: {pagination['nextPageToken'][:30]}...*")
        if pagination.get("totalSize"):
            lines.append(f"*Total: {pagination['totalSize']}*")

    return "\\n".join(lines)


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
    return text[:max_length] + "\\n\\n*... output truncated ...*"
'''


def generate_server(groups: dict, total_methods: int) -> str:
    """Generate server.py with complete registration."""

    return f'''"""
Google Ad Manager MCP Server

Complete MCP server with all {total_methods} API endpoints as tools.
Auto-generated from discovery document.
"""

import os
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from .tools import register_all_tools

load_dotenv()

# Initialize FastMCP server
mcp = FastMCP(
    name="admanager-mcp",
    instructions="""
    Google Ad Manager MCP Server - Complete API Access

    This server provides access to ALL {total_methods} Google Ad Manager API endpoints.

    Getting Started:
    1. Use admanager_list_networks to find your network code
    2. Use the network_code in subsequent calls

    Resource Groups:
    {chr(10).join(f"    - {g}: {len(m)} tools" for g, m in sorted(groups.items()))}

    Response Formats:
    - markdown (default): Human-readable formatted output
    - json: Machine-readable structured data
    """,
)

# Register all tools
register_all_tools(mcp)


def main():
    """Run the MCP server."""
    transport = os.getenv("TRANSPORT", "stdio")

    if transport == "http":
        port = int(os.getenv("PORT", "8001"))
        mcp.run(transport="streamable-http", port=port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
'''


def main():
    print("Loading discovery document...")
    with open(DISCOVERY_FILE, 'r') as f:
        discovery = json.load(f)

    print("Extracting methods...")
    methods = extract_methods(discovery.get("resources", {}))
    print(f"Found {len(methods)} methods")

    groups = _group_methods(methods)
    print(f"Found {len(groups)} resource groups")

    # 1. Generate api_client.py
    print("\nGenerating api_client.py...")
    api_client_code = generate_api_client(methods)
    with open(OUTPUT_DIR / "api_client.py", 'w') as f:
        f.write(api_client_code)
    print(f"  Written api_client.py")

    # 2. Generate models.py
    print("Generating models.py...")
    models_code = generate_models(methods)
    with open(OUTPUT_DIR / "models.py", 'w') as f:
        f.write(models_code)
    print(f"  Written models.py")

    # 3. Generate utils.py
    print("Generating utils.py...")
    utils_code = generate_utils()
    with open(OUTPUT_DIR / "utils.py", 'w') as f:
        f.write(utils_code)
    print(f"  Written utils.py")

    # 4. Generate tool files for each group
    print("Generating tool files...")
    TOOLS_DIR.mkdir(exist_ok=True)
    for group, group_methods in sorted(groups.items()):
        tool_code = generate_tool_file(group, group_methods)
        with open(TOOLS_DIR / f"{group}.py", 'w') as f:
            f.write(tool_code)
        print(f"  Written tools/{group}.py ({len(group_methods)} tools)")

    # 5. Generate tools/__init__.py
    print("Generating tools/__init__.py...")
    init_code = generate_tools_init(groups)
    with open(TOOLS_DIR / "__init__.py", 'w') as f:
        f.write(init_code)
    print(f"  Written tools/__init__.py")

    # 6. Generate server.py
    print("Generating server.py...")
    server_code = generate_server(groups, len(methods))
    with open(OUTPUT_DIR / "server.py", 'w') as f:
        f.write(server_code)
    print(f"  Written server.py")

    # Summary
    print(f"\n{'='*60}")
    print(f"GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"Total methods: {len(methods)}")
    print(f"Resource groups: {len(groups)}")
    print(f"\nFiles generated:")
    print(f"  - api_client.py (154 API methods)")
    print(f"  - models.py (154 Pydantic models)")
    print(f"  - utils.py (formatting utilities)")
    print(f"  - server.py (MCP server)")
    print(f"  - tools/__init__.py (registration)")
    for group, items in sorted(groups.items()):
        print(f"  - tools/{group}.py ({len(items)} tools)")


if __name__ == "__main__":
    main()
