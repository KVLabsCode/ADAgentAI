"""Tool loading module for LangGraph agents.

Loads tools from MCP servers (AdMob, Ad Manager) using langchain-mcp-adapters.

Key functions:
- get_tools_for_service: Get tool schemas for LLM binding
- execute_tool: Execute a tool within MCP context (the only way to run tools)
- create_specialist_agent: Create a ReAct agent with MCP tools
"""

from .loader import (
    get_tools_for_service,
    get_mcp_client,
    create_specialist_agent,
    execute_tool,
)

__all__ = [
    "get_tools_for_service",
    "get_mcp_client",
    "create_specialist_agent",
    "execute_tool",
]
