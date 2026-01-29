import json
from pathlib import Path
from fastmcp import FastMCP
import httpx
import os
from typing import Any, Optional, Dict

from ..curated_schemas import (
    get_curated_schema,
    build_body_from_flat_params,
    FlatParam,
)

# Base directory for the entire project
BASE_DIR = Path(__file__).parent.parent.parent

def create_google_mcp(name: str, discovery_filename: str):
    """
    Creates a FastMCP server directly from a Google Discovery JSON.
    """
    discovery_path = BASE_DIR / discovery_filename
    with open(discovery_path, 'r') as f:
        discovery = json.load(f)

    mcp = FastMCP(name=name)
    base_url = discovery.get("rootUrl") + discovery.get("servicePath", "")
    client = httpx.AsyncClient(base_url=base_url, timeout=30.0)

    def process_resources(resources, prefix=""):
        for res_name, resource in resources.items():
            if "methods" in resource:
                for method_name, method in resource["methods"].items():
                    register_method(mcp, client, method)
            if "resources" in resource:
                process_resources(resource["resources"], prefix=f"{res_name}.")

    def register_method(mcp_instance, http_client, method):
        method_id = method.get("id")
        tool_name = method_id.replace("admanager.", "").replace("admob.", "").replace(".", "_")
        description = method.get("description", "No description.")
        path_template = method.get("path")
        http_method = method.get("httpMethod", "GET")

        # Check if this tool has a curated schema with flat parameters
        curated_schema = get_curated_schema(tool_name)

        if curated_schema:
            # Use curated schema with flat parameters
            _register_curated_method(
                mcp_instance, http_client, tool_name, description,
                path_template, http_method, method, curated_schema, name
            )
        else:
            # Use default body_json approach for non-curated tools
            _register_default_method(
                mcp_instance, http_client, tool_name, description,
                path_template, http_method, method, name
            )

    def _register_curated_method(mcp_instance, http_client, tool_name, description,
                                  path_template, http_method, method, curated_schema, mcp_name):
        """Register a tool with curated flat parameters."""
        flat_params: list[FlatParam] = curated_schema["params"]
        curated_desc = curated_schema.get("description", description)

        # Get URL path parameters from discovery
        raw_params = method.get("parameters", {})
        params_info = {}
        param_name_map = {}
        for orig_name, pinfo in raw_params.items():
            safe_name = orig_name.replace(".", "_").replace("-", "_")
            params_info[safe_name] = pinfo
            param_name_map[safe_name] = orig_name

        # Build signature: URL params first, then flat body params
        required_url_params = []
        optional_url_params = []

        for pname, pinfo in params_info.items():
            if pinfo.get("required"):
                required_url_params.append(pname)
            else:
                optional_url_params.append(pname)

        # Build signature parts
        sig_parts = []

        # Required URL params (e.g., parent for accounts/{accountId}/mediationGroups)
        for pname in required_url_params:
            sig_parts.append(f"{pname}: str")

        # Optional URL params
        for pname in optional_url_params:
            sig_parts.append(f"{pname}: Optional[str] = None")

        # Required flat params from curated schema
        for fp in flat_params:
            if fp.required:
                sig_parts.append(f"{fp.name}: str")

        # Optional flat params from curated schema
        for fp in flat_params:
            if not fp.required:
                default_val = f'"{fp.default}"' if fp.default is not None else "None"
                sig_parts.append(f"{fp.name}: Optional[str] = {default_val}")

        sig_str = ", ".join(sig_parts) if sig_parts else ""

        # Build URL param extraction code
        url_param_extraction = []
        for pname in required_url_params + optional_url_params:
            orig_name = param_name_map.get(pname, pname)
            url_param_extraction.append(f'    if {pname} is not None:')
            url_param_extraction.append(f'        if "{{{orig_name}}}" in path or "{{+{orig_name}}}" in path:')
            url_param_extraction.append(f'            path = path.replace("{{{orig_name}}}", str({pname})).replace("{{+{orig_name}}}", str({pname}))')
            url_param_extraction.append(f'        else:')
            url_param_extraction.append(f'            query_params["{orig_name}"] = {pname}')

        extraction_code = "\n".join(url_param_extraction) if url_param_extraction else "    pass"

        # Build flat param names list for body construction
        flat_param_names = [fp.name for fp in flat_params]

        # Build description with flat params
        param_desc_lines = []
        for pname, pinfo in params_info.items():
            required = "(required)" if pinfo.get("required") else "(optional)"
            param_desc_lines.append(f"- {pname} ({pinfo.get('type', 'str')}) {required}: {pinfo.get('description', '')}")

        param_desc_lines.append("\nBody parameters (flat format - no JSON needed):")
        for fp in flat_params:
            required = "(required)" if fp.required else "(optional)"
            enum_note = f" Values: {', '.join(fp.enum)}" if fp.enum else ""
            csv_note = " (comma-separated list)" if fp.is_csv else ""
            json_note = " (JSON array)" if fp.is_json else ""
            param_desc_lines.append(f"- {fp.name} ({fp.type}) {required}: {fp.description}{enum_note}{csv_note}{json_note}")

        param_desc = "\n".join(param_desc_lines)
        full_description = f"{curated_desc}\n\nParameters:\n{param_desc}"

        # Create the function code with flat params
        func_code = f'''
async def {tool_name}({sig_str}) -> Dict[str, Any]:
    """
    {curated_desc}
    """
    path = "{path_template}"
    query_params = {{}}

{extraction_code}

    headers = {{
        "User-Agent": "ADAgent-AI/1.0",
        "Content-Type": "application/json"
    }}

    auth_token = (
        os.getenv("AUTH_TOKEN") or
        os.getenv("{mcp_name.upper()}_ACCESS_TOKEN") or
        os.getenv("GOOGLE_ACCESS_TOKEN")
    )

    if auth_token:
        headers["Authorization"] = f"Bearer {{auth_token}}"

    # Build body from flat parameters using curated schema
    flat_kwargs = {{}}
    for param_name in {flat_param_names!r}:
        val = locals().get(param_name)
        if val is not None:
            flat_kwargs[param_name] = val

    body_data = build_body_from_flat_params(curated_schema_params, **flat_kwargs)

    try:
        response = await http_client.request(
            method="{http_method}",
            url=path,
            params=query_params if query_params else None,
            json=body_data if body_data else None,
            headers=headers
        )

        try:
            return response.json()
        except:
            return {{
                "status": response.status_code,
                "text": response.text[:1000],
                "url": str(response.url)
            }}
    except Exception as e:
        return {{"error": str(e), "path": path}}
'''

        # Execute the function definition
        local_namespace = {
            'http_client': http_client,
            'json': json,
            'os': os,
            'Dict': Dict,
            'Any': Any,
            'Optional': Optional,
            'build_body_from_flat_params': build_body_from_flat_params,
            'curated_schema_params': flat_params,
        }

        try:
            exec(func_code, local_namespace)
            handler_func = local_namespace[tool_name]
            mcp_instance.tool(name=tool_name, description=full_description)(handler_func)
        except Exception as e:
            print(f"Failed to create curated tool {tool_name}: {e}")

    def _register_default_method(mcp_instance, http_client, tool_name, description,
                                  path_template, http_method, method, mcp_name):
        """Register a tool with default body_json approach."""
        # Sanitize parameter names - replace dots with underscores for Python compatibility
        raw_params = method.get("parameters", {})
        params_info = {}
        param_name_map = {}  # Maps sanitized name -> original name
        for orig_name, pinfo in raw_params.items():
            safe_name = orig_name.replace(".", "_").replace("-", "_")
            params_info[safe_name] = pinfo
            param_name_map[safe_name] = orig_name
        request_ref = method.get("request", {}).get("$ref")

        # Build parameter descriptions
        param_desc_lines = []
        for k, v in params_info.items():
            required = "(required)" if v.get("required") else "(optional)"
            orig_name = param_name_map.get(k, k)
            api_note = f" [API param: {orig_name}]" if orig_name != k else ""
            param_desc_lines.append(f"- {k} ({v.get('type', 'any')}) {required}: {v.get('description', '')}{api_note}")

        if request_ref:
            param_desc_lines.append(f"\nRequest body: Pass as 'body_json' parameter (JSON string)")

        param_desc = "\n".join(param_desc_lines)
        full_description = f"{description}\n\nParameters:\n{param_desc}"

        # Determine if this method needs a body
        has_body = http_method in ["POST", "PATCH", "PUT"]

        # Build signature parts - required params first, then optional
        required_params = []
        optional_params = []

        for pname, pinfo in params_info.items():
            if pinfo.get("required"):
                required_params.append(pname)
            else:
                optional_params.append(pname)

        # Build function signature
        sig_parts = []
        for pname in required_params:
            sig_parts.append(f"{pname}: str")
        for pname in optional_params:
            sig_parts.append(f"{pname}: Optional[str] = None")
        if has_body:
            sig_parts.append("body_json: Optional[str] = None")

        sig_str = ", ".join(sig_parts) if sig_parts else ""

        # Build the param extraction code
        # Use original param names for API calls (before sanitization)
        param_extraction = []
        for pname in required_params + optional_params:
            orig_name = param_name_map.get(pname, pname)
            param_extraction.append(f'    if {pname} is not None:')
            param_extraction.append(f'        if "{{{orig_name}}}" in path or "{{+{orig_name}}}" in path:')
            param_extraction.append(f'            path = path.replace("{{{orig_name}}}", str({pname})).replace("{{+{orig_name}}}", str({pname}))')
            param_extraction.append(f'        else:')
            param_extraction.append(f'            query_params["{orig_name}"] = {pname}')

        extraction_code = "\n".join(param_extraction) if param_extraction else "    pass"

        # Create the function code
        func_code = f'''
async def {tool_name}({sig_str}) -> Dict[str, Any]:
    """
    {description}
    """
    path = "{path_template}"
    query_params = {{}}

{extraction_code}

    headers = {{
        "User-Agent": "ADAgent-AI/1.0",
        "Content-Type": "application/json"
    }}

    auth_token = (
        os.getenv("AUTH_TOKEN") or
        os.getenv("{mcp_name.upper()}_ACCESS_TOKEN") or
        os.getenv("GOOGLE_ACCESS_TOKEN")
    )

    if auth_token:
        headers["Authorization"] = f"Bearer {{auth_token}}"

    body_data = None
    if {has_body} and body_json:
        try:
            body_data = json.loads(body_json)
        except:
            body_data = {{"raw": body_json}}

    try:
        response = await http_client.request(
            method="{http_method}",
            url=path,
            params=query_params if query_params else None,
            json=body_data,
            headers=headers
        )

        try:
            return response.json()
        except:
            return {{
                "status": response.status_code,
                "text": response.text[:1000],
                "url": str(response.url)
            }}
    except Exception as e:
        return {{"error": str(e), "path": path}}
'''

        # Execute the function definition
        local_namespace = {
            'http_client': http_client,
            'json': json,
            'os': os,
            'Dict': Dict,
            'Any': Any,
            'Optional': Optional
        }

        try:
            exec(func_code, local_namespace)
            handler_func = local_namespace[tool_name]

            # Register with FastMCP
            mcp_instance.tool(name=tool_name, description=full_description)(handler_func)
        except Exception as e:
            print(f"Failed to create tool {tool_name}: {e}")

    if "resources" in discovery:
        process_resources(discovery["resources"])

    return mcp

mcp = create_google_mcp("AdManager", "admanager_v1_discovery.json")

if __name__ == "__main__":
    mcp.run()
