import yaml
import json
from pathlib import Path
from fastmcp import FastMCP
import httpx
import os
from typing import Any

# Base directory for the entire project
BASE_DIR = Path(__file__).parent.parent

def _normalize_non_json_response(response: httpx.Response) -> None:
    """
    Normalize upstream HTML/non-JSON responses into a JSON error payload so MCP callers
    consistently receive JSON.
    """
    content_type = (response.headers.get("content-type") or "").lower()
    # Read body once; httpx caches it in response.content
    text = ""
    try:
        text = response.text or ""
    except Exception:
        text = ""

    # Fast path: declared JSON and parseable -> keep as-is
    if "json" in content_type:
        try:
            json.loads(text) if text else None
            return
        except Exception:
            # Declared JSON but invalid payload -> normalize below
            pass

    # Heuristic HTML detection
    stripped = text.lstrip()
    if stripped.startswith("<") or "<html" in stripped[:2048].lower():
        payload = {
            "ok": False,
            "error_type": "upstream_non_json",
            "status": response.status_code,
            "content_type": content_type or "unknown",
            "url": str(response.url),
            "snippet": text[:1000],
        }
        response._content = json.dumps(payload).encode("utf-8")
        response.headers["content-type"] = "application/json"
        return

    # Non-JSON but not HTML (plain text, etc.) -> normalize if non-empty
    if text and "json" not in content_type:
        payload = {
            "ok": False,
            "error_type": "upstream_non_json",
            "status": response.status_code,
            "content_type": content_type or "unknown",
            "url": str(response.url),
            "snippet": text[:1000],
        }
        response._content = json.dumps(payload).encode("utf-8")
        response.headers["content-type"] = "application/json"

def create_mcp_from_spec(name: str, spec_filename: str):
    """
    Standard factory to create a FastMCP server from an OpenAPI spec.
    """
    spec_path = BASE_DIR / "api_specs" / spec_filename
    
    if not spec_path.exists():
        raise FileNotFoundError(f"Spec for {name} not found at {spec_path}")
    
    with open(spec_path, 'r') as f:
        openapi_spec = yaml.safe_load(f)
    
    # Get base URL from spec
    base_url = None
    if "servers" in openapi_spec and openapi_spec["servers"]:
        base_url = openapi_spec["servers"][0]["url"]
    
    if not base_url:
        raise ValueError(f"No server URL found in spec for {name}")

    # Configure headers for auth
    headers = {"User-Agent": "ADAgent-AI/1.0"}
    auth_token = os.getenv("AUTH_TOKEN")
    if auth_token:
        # Standard Bearer auth for most 3rd party ad APIs
        headers["Authorization"] = f"Bearer {auth_token}"
    
    # Standard timeout and client
    client = httpx.AsyncClient(
        base_url=base_url, 
        timeout=30.0,
        headers=headers,
        event_hooks={"response": [_normalize_non_json_response]}
    )
    
    mcp = FastMCP.from_openapi(
        openapi_spec=openapi_spec,
        client=client,
        name=name
    )
    
    return mcp
