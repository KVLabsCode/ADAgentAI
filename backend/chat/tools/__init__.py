"""Tool loading module for LangGraph agents.

Loads tools from MCP servers (AdMob, Ad Manager) using langchain-mcp-adapters.

Key functions:
- get_tools_for_service: Get tool schemas for LLM binding
- execute_tool: Execute a tool within MCP context (the only way to run tools)
- create_specialist_agent: Create a ReAct agent with MCP tools

Tool Registry:
- get_tool_registry: Get the global tool registry instance
- ToolConfig: Configuration dataclass for tool metadata
- ToolRegistry: Central registry for tool lookup and filtering

Entity Registry:
- ENTITY_REGISTRY: Central registry for entity relationships
- EntityConfig: Configuration dataclass for entity metadata
- get_entity_config: Get entity config by type
- validate_entity_id: Validate entity ID against pattern
"""

from .loader import (
    get_tools_for_service,
    get_mcp_client,
    create_specialist_agent,
    execute_tool,
)
from .registry import (
    get_tool_registry,
    reset_tool_registry,
    ToolConfig,
    ToolRegistry,
    ToolCategory,
    # Entity Registry exports
    ENTITY_REGISTRY,
    EntityConfig,
    get_entity_config,
    get_entities_for_provider,
    get_parent_chain,
    get_child_entities,
    validate_entity_id,
    get_fetcher_for_entity,
    export_entity_registry_json,
)

__all__ = [
    # Tool registry
    "get_tools_for_service",
    "get_mcp_client",
    "create_specialist_agent",
    "execute_tool",
    "get_tool_registry",
    "reset_tool_registry",
    "ToolConfig",
    "ToolRegistry",
    "ToolCategory",
    # Entity registry
    "ENTITY_REGISTRY",
    "EntityConfig",
    "get_entity_config",
    "get_entities_for_provider",
    "get_parent_chain",
    "get_child_entities",
    "validate_entity_id",
    "get_fetcher_for_entity",
    "export_entity_registry_json",
]
