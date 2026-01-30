"""MCP Tool loader using langchain-mcp-adapters.

Loads tools from AdMob and Ad Manager MCP servers for use in LangGraph agents.

NOTE: As of langchain-mcp-adapters 0.1.0, MultiServerMCPClient is no longer
a context manager. Just instantiate and call get_tools() directly.
"""

import os
import sys
import time
import httpx
from pathlib import Path
from typing import Optional, Any

from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic

from .registry import get_tool_registry


# Path to MCP server modules
BACKEND_DIR = Path(__file__).parent.parent.parent

# List of all supported networks
SUPPORTED_NETWORKS = [
    "admob",
    "admanager",
    "applovin",
    "unity",
    "mintegral",
    "liftoff",
    "inmobi",
    "pangle",
    "dtexchange"
]

# Map network names to provider types used in the database
NETWORK_TO_PROVIDER_TYPE = {
    "admob": "admob",
    "admanager": "gam",
}

# Cache for OAuth tokens (user_id:provider -> token)
# Simple in-memory cache, tokens are valid for ~1 hour
_token_cache: dict[str, tuple[str, float]] = {}
_TOKEN_CACHE_TTL = 3600  # 1 hour

# Cache for MCP clients (cache_key -> (client, tools, expiry))
# Reusing clients avoids spawning new subprocesses for each operation
_mcp_client_cache: dict[str, tuple["MultiServerMCPClient", list, float]] = {}
_MCP_CLIENT_CACHE_TTL = 300  # 5 minutes - balance between reuse and freshness


def _get_mcp_cache_key(
    service: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> str:
    """Generate cache key for MCP client."""
    return f"{user_id or 'anon'}:{organization_id or 'personal'}:{service}"


def _get_cached_mcp_tools(
    service: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> Optional[list]:
    """Get cached MCP tools if available and not expired.

    Args:
        service: Service name (admob, admanager, etc.)
        user_id: User ID
        organization_id: Organization ID

    Returns:
        Cached tools list or None if not cached/expired
    """
    cache_key = _get_mcp_cache_key(service, user_id, organization_id)

    if cache_key in _mcp_client_cache:
        client, tools, expiry = _mcp_client_cache[cache_key]
        if time.time() < expiry:
            print(f"[mcp_loader] Using cached MCP client/tools for {service}")
            return tools
        else:
            # Expired - remove from cache
            print(f"[mcp_loader] MCP cache expired for {service}, removing")
            del _mcp_client_cache[cache_key]

    return None


def _set_cached_mcp_tools(
    service: str,
    client: "MultiServerMCPClient",
    tools: list,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> None:
    """Cache MCP client and tools.

    Args:
        service: Service name
        client: The MultiServerMCPClient instance
        tools: List of loaded tools
        user_id: User ID
        organization_id: Organization ID
    """
    cache_key = _get_mcp_cache_key(service, user_id, organization_id)
    expiry = time.time() + _MCP_CLIENT_CACHE_TTL
    _mcp_client_cache[cache_key] = (client, tools, expiry)
    print(f"[mcp_loader] Cached MCP client/tools for {service} (TTL: {_MCP_CLIENT_CACHE_TTL}s)")


def clear_mcp_cache(
    service: Optional[str] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> int:
    """Clear MCP client cache.

    Args:
        service: If provided, only clear cache for this service
        user_id: If provided, only clear cache for this user
        organization_id: If provided, only clear cache for this org

    Returns:
        Number of cache entries cleared
    """
    if service is None and user_id is None:
        # Clear all
        count = len(_mcp_client_cache)
        _mcp_client_cache.clear()
        print(f"[mcp_loader] Cleared entire MCP cache ({count} entries)")
        return count

    # Selective clear based on key patterns
    keys_to_remove = []
    for key in _mcp_client_cache:
        parts = key.split(":")
        if len(parts) == 3:
            k_user, k_org, k_service = parts
            if service and k_service != service:
                continue
            if user_id and k_user != user_id:
                continue
            if organization_id and k_org != organization_id:
                continue
            keys_to_remove.append(key)

    for key in keys_to_remove:
        del _mcp_client_cache[key]

    print(f"[mcp_loader] Cleared {len(keys_to_remove)} MCP cache entries")
    return len(keys_to_remove)


async def _fetch_oauth_token(
    user_id: str,
    provider_type: str,
    organization_id: Optional[str] = None,
) -> Optional[str]:
    """Fetch OAuth token from the internal API.

    Args:
        user_id: User ID
        provider_type: Provider type (admob, gam)
        organization_id: Optional organization ID

    Returns:
        OAuth access token or None if not available
    """
    # Check cache first
    cache_key = f"{user_id}:{provider_type}:{organization_id or 'personal'}"
    if cache_key in _token_cache:
        token, expiry = _token_cache[cache_key]
        if time.time() < expiry:
            print(f"[mcp_loader] Using cached OAuth token for {provider_type}")
            return token

    API_URL = os.environ.get("API_URL", "http://localhost:3001")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

    if not INTERNAL_API_KEY:
        print(f"[mcp_loader] Warning: INTERNAL_API_KEY not set, cannot fetch OAuth token")
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{API_URL}/api/providers/internal/token",
                json={
                    "userId": user_id,
                    "provider": provider_type,
                    "organizationId": organization_id,
                },
                headers={"X-Internal-Key": INTERNAL_API_KEY},
            )

            if response.status_code == 200:
                data = response.json()
                token = data.get("accessToken")
                if token:
                    # Cache the token
                    _token_cache[cache_key] = (token, time.time() + _TOKEN_CACHE_TTL)
                    print(f"[mcp_loader] Fetched OAuth token for {provider_type}")
                    return token
            elif response.status_code == 404:
                print(f"[mcp_loader] No {provider_type} provider connected for user {user_id}")
            else:
                print(f"[mcp_loader] Failed to fetch OAuth token: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"[mcp_loader] Error fetching OAuth token: {e}")

    return None


async def _get_mcp_server_config_async(
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> dict:
    """Build MCP server configuration for all supported networks with OAuth tokens.

    Args:
        user_id: User ID for context
        organization_id: Organization ID for org-scoped operations

    Returns:
        Dict config for MultiServerMCPClient
    """
    # Python executable path
    python_exe = sys.executable

    config = {}

    # Fetch OAuth tokens for Google providers (admob, admanager)
    oauth_tokens = {}
    if user_id:
        for network, provider_type in NETWORK_TO_PROVIDER_TYPE.items():
            token = await _fetch_oauth_token(user_id, provider_type, organization_id)
            if token:
                oauth_tokens[network] = token

    # Get the venv directory from sys.executable
    # e.g., /opt/render/project/src/.venv/bin/python -> /opt/render/project/src/.venv
    venv_dir = None
    if 'venv' in python_exe or '.venv' in python_exe:
        # Extract venv path from executable
        exe_path = Path(python_exe)
        # Go up from bin/python to venv root
        if exe_path.parent.name in ('bin', 'Scripts'):
            venv_dir = exe_path.parent.parent

    print(f"[mcp_loader] Python executable: {python_exe}")
    print(f"[mcp_loader] Detected venv: {venv_dir}")

    for network in SUPPORTED_NETWORKS:
        # Base environment with user and network context
        # IMPORTANT: Set PYTHONPATH so subprocess can import mcp_servers package
        # The parent process uses sys.path.insert(), but subprocess doesn't inherit that
        existing_pythonpath = os.environ.get("PYTHONPATH", "")
        pythonpath = f"{BACKEND_DIR}{os.pathsep}{existing_pythonpath}" if existing_pythonpath else str(BACKEND_DIR)

        env = {
            **os.environ,
            "CURRENT_USER_ID": user_id or "",
            "PYTHONPATH": pythonpath,
        }

        # If running from a venv, ensure the subprocess knows about it
        # This helps Python find packages installed in the venv
        if venv_dir:
            env["VIRTUAL_ENV"] = str(venv_dir)
            # Ensure venv bin directory is in PATH
            venv_bin = venv_dir / ("Scripts" if sys.platform == "win32" else "bin")
            current_path = env.get("PATH", "")
            if str(venv_bin) not in current_path:
                env["PATH"] = f"{venv_bin}{os.pathsep}{current_path}"

        # Add OAuth token if available for this network
        if network in oauth_tokens:
            # Use AUTH_TOKEN which the MCP server checks first
            env["AUTH_TOKEN"] = oauth_tokens[network]
            # Also set network-specific token for clarity
            env[f"{network.upper()}_ACCESS_TOKEN"] = oauth_tokens[network]

        # Point to the specific provider module
        config[network] = {
            "command": python_exe,
            "args": ["-m", f"mcp_servers.providers.{network}"],
            "transport": "stdio",
            "cwd": str(BACKEND_DIR),
            "env": env,
        }

    return config


async def _get_service_config(
    service: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> dict:
    """Get MCP config filtered by service with OAuth tokens.

    Args:
        service: Network name (e.g. "admob") or "all"/"general"
        user_id: User ID for context
        organization_id: Organization ID for org-scoped operations

    Returns:
        Filtered config dict
    """
    full_config = await _get_mcp_server_config_async(user_id, organization_id)

    if service in full_config:
        return {service: full_config[service]}
    else:
        # "general", "all", or unknown - return all available
        return full_config


async def get_mcp_client(
    service: str = "all",
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> MultiServerMCPClient:
    """Get an MCP client instance with OAuth tokens.

    NOTE: As of langchain-mcp-adapters 0.1.0, clients are no longer context managers.
    Just create the client and call get_tools() directly.

    Usage:
        client = await get_mcp_client("admob", user_id)
        tools = await client.get_tools()

    Args:
        service: Service filter ("admob", "admanager", "all")
        user_id: User ID for OAuth token fetching
        organization_id: Organization ID for org-scoped operations

    Returns:
        Configured MultiServerMCPClient
    """
    config = await _get_service_config(service, user_id, organization_id)

    print(f"[mcp_loader] Creating MCP client for service: {service}")
    print(f"[mcp_loader] Config servers: {list(config.keys())}")

    return MultiServerMCPClient(config)


async def get_tools_for_service(
    service: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    populate_registry: bool = True,
    use_cache: bool = True,
) -> list:
    """Get tool schemas for a specific service with OAuth tokens.

    NOTE: These tools are used for schema binding to the LLM only.
    For actual execution, use execute_tool() which runs within the MCP context.

    Now with caching: Reuses MCP client connections to avoid spawning new
    subprocesses for each operation. Cache TTL is 5 minutes.

    Args:
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        populate_registry: If True, also populate the global tool registry
        use_cache: If True, use cached tools if available (default: True)

    Returns:
        List of LangChain tools from MCP servers (for schema/binding only)
    """
    # Check cache first if enabled
    if use_cache:
        cached_tools = _get_cached_mcp_tools(service, user_id, organization_id)
        if cached_tools is not None:
            # Still populate registry if requested (registry may have been cleared)
            if populate_registry:
                _populate_tool_registry(cached_tools, service)
            return cached_tools

    config = await _get_service_config(service, user_id, organization_id)

    print(f"[mcp_loader] Loading tool schemas for service: {service}")
    print(f"[mcp_loader] Config: {list(config.keys())}")

    # As of langchain-mcp-adapters 0.1.0, no context manager needed
    try:
        client = MultiServerMCPClient(config)
        tools = await client.get_tools()
        print(f"[mcp_loader] Loaded {len(tools)} tool schemas: {[t.name for t in tools]}")

        # Cache the client and tools for reuse
        _set_cached_mcp_tools(service, client, tools, user_id, organization_id)
    except Exception as e:
        print(f"[mcp_loader] ERROR loading tools: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise

    # Populate the tool registry with metadata
    if populate_registry:
        _populate_tool_registry(tools, service)

    return tools


def _populate_tool_registry(tools: list, service: str) -> None:
    """Populate the tool registry with metadata from loaded tools.

    Args:
        tools: List of LangChain tools
        service: Service name for provider classification
    """
    registry = get_tool_registry()
    # Determine which providers are being loaded
    if service == "all":
        # Load tools for each provider separately to preserve provider info
        for provider in SUPPORTED_NETWORKS:
            provider_tools = [t for t in tools if t.name.startswith(f"{provider}_")]
            if provider_tools:
                count = registry.load_from_langchain_tools(provider_tools, provider)
                print(f"[mcp_loader] Registered {count} tools for provider: {provider}")
    else:
        count = registry.load_from_langchain_tools(tools, service)
        print(f"[mcp_loader] Registered {count} tools for provider: {service}")

    stats = registry.get_stats()
    print(f"[mcp_loader] Registry stats: {stats['total_tools']} total, {stats['dangerous_tools']} dangerous")


async def execute_tool(
    tool_name: str,
    tool_args: dict,
    service: str = "admob",
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    preloaded_tools: Optional[list] = None,
) -> Any:
    """Execute a tool within the MCP client context with OAuth tokens.

    Now with caching: Uses cached MCP client/tools when available to avoid
    spawning new subprocesses. Can also accept pre-loaded tools directly
    to skip loading entirely.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        preloaded_tools: Optional list of pre-loaded tools to use directly

    Returns:
        Tool execution result

    Raises:
        ValueError: If tool not found
        Exception: If tool execution fails
    """
    print(f"[mcp_loader] Executing tool: {tool_name}")
    print(f"[mcp_loader] Args: {tool_args}")

    # Try to find tool in preloaded tools first (fastest path)
    tool = None
    if preloaded_tools:
        print(f"[mcp_loader] Using {len(preloaded_tools)} preloaded tools")
        for t in preloaded_tools:
            if t.name == tool_name:
                tool = t
                break

    # If not found in preloaded, try cache
    if not tool:
        cached_tools = _get_cached_mcp_tools(service, user_id, organization_id)
        if cached_tools:
            for t in cached_tools:
                if t.name == tool_name:
                    tool = t
                    break

    # If still not found, load fresh (and cache for future use)
    if not tool:
        print(f"[mcp_loader] Tool not in cache, loading fresh for service: {service}")
        config = await _get_service_config(service, user_id, organization_id)
        client = MultiServerMCPClient(config)
        tools = await client.get_tools()

        # Cache the freshly loaded tools
        _set_cached_mcp_tools(service, client, tools, user_id, organization_id)

        for t in tools:
            if t.name == tool_name:
                tool = t
                break

    # If still not found, try loading all services
    if not tool and service != "all":
        print(f"[mcp_loader] Tool not found in {service}, trying all services")
        cached_all = _get_cached_mcp_tools("all", user_id, organization_id)
        if cached_all:
            for t in cached_all:
                if t.name == tool_name:
                    tool = t
                    break

        if not tool:
            # Load all services fresh
            all_config = await _get_service_config("all", user_id, organization_id)
            all_client = MultiServerMCPClient(all_config)
            all_tools = await all_client.get_tools()
            _set_cached_mcp_tools("all", all_client, all_tools, user_id, organization_id)

            for t in all_tools:
                if t.name == tool_name:
                    tool = t
                    break

    if not tool:
        raise ValueError(f"Tool '{tool_name}' not found in MCP servers")

    # Execute the tool
    print(f"[mcp_loader] Invoking tool: {tool_name}")
    result = await tool.ainvoke(tool_args)
    print(f"[mcp_loader] Tool result: {result}")

    return result


async def create_specialist_agent(
    service: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    model_name: str = "claude-sonnet-4-20250514",
    system_prompt: Optional[str] = None,
    enable_thinking: bool = False,
):
    """Create a ReAct agent with MCP tools for a specific service.

    This is the recommended pattern for using MCP tools with LangGraph.
    Uses create_react_agent from langgraph.prebuilt.

    The agent handles tool execution internally.

    Args:
        service: Service name ("admob", "admanager", "all")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        model_name: Claude model to use
        system_prompt: Optional system prompt
        enable_thinking: Enable extended thinking mode

    Returns:
        Configured create_react_agent instance
    """
    config = await _get_service_config(service, user_id, organization_id)

    print(f"[mcp_loader] Creating specialist agent for service: {service}")

    # Configure LLM with optional extended thinking
    llm_kwargs: dict[str, Any] = {
        "model": model_name,
        "max_tokens": 8192,
    }

    if enable_thinking:
        # Enable extended thinking for complex reasoning
        llm_kwargs["thinking"] = {"type": "enabled", "budget_tokens": 4096}
        llm_kwargs["temperature"] = 1  # Required for thinking mode

    llm = ChatAnthropic(**llm_kwargs)

    # As of langchain-mcp-adapters 0.1.0, no context manager needed
    client = MultiServerMCPClient(config)
    tools = await client.get_tools()
    print(f"[mcp_loader] Loaded {len(tools)} tools for ReAct agent")

    # Create the ReAct agent with MCP tools
    agent = create_react_agent(
        llm,
        tools,
        prompt=system_prompt,
    )

    return agent
