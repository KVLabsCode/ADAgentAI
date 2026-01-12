"""MCP Tool loader using langchain-mcp-adapters.

Loads tools from AdMob and Ad Manager MCP servers for use in LangGraph agents.

NOTE: As of langchain-mcp-adapters 0.1.0, MultiServerMCPClient is no longer
a context manager. Just instantiate and call get_tools() directly.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Any

from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_anthropic import ChatAnthropic


# Path to MCP server modules
BACKEND_DIR = Path(__file__).parent.parent.parent


def _get_mcp_server_config(user_id: Optional[str] = None) -> dict:
    """Build MCP server configuration.

    Args:
        user_id: User ID for fetching OAuth tokens

    Returns:
        Dict config for MultiServerMCPClient
    """
    # Python executable path
    python_exe = sys.executable

    # Base environment with user context
    base_env = {
        **os.environ,
        "CURRENT_USER_ID": user_id or "",
    }

    config = {
        "admob": {
            "command": python_exe,
            "args": ["-m", "admob_mcp.server"],
            "transport": "stdio",
            "cwd": str(BACKEND_DIR),
            "env": base_env,
        },
        "admanager": {
            "command": python_exe,
            "args": ["-m", "admanager_mcp.server"],
            "transport": "stdio",
            "cwd": str(BACKEND_DIR),
            "env": base_env,
        },
    }

    return config


def _get_service_config(
    service: str,
    user_id: Optional[str] = None,
) -> dict:
    """Get MCP config filtered by service.

    Args:
        service: "admob", "admanager", or "all"/"general"
        user_id: User ID for OAuth

    Returns:
        Filtered config dict
    """
    full_config = _get_mcp_server_config(user_id)

    if service == "admob":
        return {"admob": full_config["admob"]}
    elif service == "admanager":
        return {"admanager": full_config["admanager"]}
    else:
        # "general" or "all" - include both
        return full_config


def get_mcp_client(
    service: str = "all",
    user_id: Optional[str] = None,
) -> MultiServerMCPClient:
    """Get an MCP client instance.

    NOTE: As of langchain-mcp-adapters 0.1.0, clients are no longer context managers.
    Just create the client and call get_tools() directly.

    Usage:
        client = get_mcp_client("admob", user_id)
        tools = await client.get_tools()

    Args:
        service: Service filter ("admob", "admanager", "all")
        user_id: User ID for OAuth token fetching

    Returns:
        Configured MultiServerMCPClient
    """
    config = _get_service_config(service, user_id)

    print(f"[mcp_loader] Creating MCP client for service: {service}")
    print(f"[mcp_loader] Config servers: {list(config.keys())}")

    return MultiServerMCPClient(config)


async def get_tools_for_service(
    service: str,
    user_id: Optional[str] = None,
) -> list:
    """Get tool schemas for a specific service.

    NOTE: These tools are used for schema binding to the LLM only.
    For actual execution, use execute_tool() which runs within the MCP context.

    Args:
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens

    Returns:
        List of LangChain tools from MCP servers (for schema/binding only)
    """
    config = _get_service_config(service, user_id)

    print(f"[mcp_loader] Loading tool schemas for service: {service}")

    # As of langchain-mcp-adapters 0.1.0, no context manager needed
    client = MultiServerMCPClient(config)
    tools = await client.get_tools()
    print(f"[mcp_loader] Loaded {len(tools)} tool schemas: {[t.name for t in tools]}")
    return tools


async def execute_tool(
    tool_name: str,
    tool_args: dict,
    service: str = "admob",
    user_id: Optional[str] = None,
) -> Any:
    """Execute a tool within the MCP client context.

    This is the ONLY way to execute MCP tools - the tool must be invoked
    while the MultiServerMCPClient context is still open.

    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        service: Service name ("admob", "admanager", or "all")
        user_id: User ID for OAuth tokens

    Returns:
        Tool execution result

    Raises:
        ValueError: If tool not found
        Exception: If tool execution fails
    """
    config = _get_service_config(service, user_id)

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
            all_config = _get_service_config("all", user_id)
            all_client = MultiServerMCPClient(all_config)
            all_tools = await all_client.get_tools()
            for t in all_tools:
                if t.name == tool_name:
                    # Re-run with all services
                    return await execute_tool(tool_name, tool_args, "all", user_id)

        raise ValueError(f"Tool '{tool_name}' not found in MCP servers")

    # Execute the tool
    print(f"[mcp_loader] Invoking tool: {tool_name}")
    result = await tool.ainvoke(tool_args)
    print(f"[mcp_loader] Tool result: {result}")

    return result


async def create_specialist_agent(
    service: str,
    user_id: Optional[str] = None,
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
        model_name: Claude model to use
        system_prompt: Optional system prompt
        enable_thinking: Enable extended thinking mode

    Returns:
        Configured create_react_agent instance
    """
    config = _get_service_config(service, user_id)

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
