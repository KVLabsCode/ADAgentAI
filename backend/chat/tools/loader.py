"""MCP Tool loader using langchain-mcp-adapters.

Loads tools from AdMob and Ad Manager MCP servers for use in LangGraph agents.

NOTE: As of langchain-mcp-adapters 0.1.0, MultiServerMCPClient is no longer
a context manager. Just instantiate and call get_tools() directly.
"""

import os
import sys
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
    import time

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

    for network in SUPPORTED_NETWORKS:
        # Base environment with user and network context
        env = {
            **os.environ,
            "CURRENT_USER_ID": user_id or "",
        }

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
) -> list:
    """Get tool schemas for a specific service with OAuth tokens.

    NOTE: These tools are used for schema binding to the LLM only.
    For actual execution, use execute_tool() which runs within the MCP context.

    Args:
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        populate_registry: If True, also populate the global tool registry

    Returns:
        List of LangChain tools from MCP servers (for schema/binding only)
    """
    config = await _get_service_config(service, user_id, organization_id)

    print(f"[mcp_loader] Loading tool schemas for service: {service}")

    # As of langchain-mcp-adapters 0.1.0, no context manager needed
    client = MultiServerMCPClient(config)
    tools = await client.get_tools()
    print(f"[mcp_loader] Loaded {len(tools)} tool schemas: {[t.name for t in tools]}")

    # Populate the tool registry with metadata
    if populate_registry:
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

    return tools


async def execute_tool(
    tool_name: str,
    tool_args: dict,
    service: str = "admob",
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> Any:
    """Execute a tool within the MCP client context with OAuth tokens.

    This is the ONLY way to execute MCP tools - the tool must be invoked
    while the MultiServerMCPClient context is still open.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations

    Returns:
        Tool execution result

    Raises:
        ValueError: If tool not found
        Exception: If tool execution fails
    """
    config = await _get_service_config(service, user_id, organization_id)

    print(f"[mcp_loader] Executing tool: {tool_name}")
    print(f"[mcp_loader] Args: {tool_args}")

    # As of langchain-mcp-adapters 0.1.0, no context manager needed
    client = MultiServerMCPClient(config)
    tools = await client.get_tools()

    # Find the matching tool
    tool = None
    for t in tools:
        if t.name == tool_name:
            tool = t
            break

    if not tool:
        # Try loading all services if not found
        if service != "all":
            all_config = await _get_service_config("all", user_id, organization_id)
            all_client = MultiServerMCPClient(all_config)
            all_tools = await all_client.get_tools()
            for t in all_tools:
                if t.name == tool_name:
                    # Re-run with all services
                    return await execute_tool(
                        tool_name, tool_args, "all", user_id, organization_id
                    )

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
