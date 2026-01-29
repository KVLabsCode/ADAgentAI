"""Tool Registry - Central registry for MCP tool metadata.

Provides:
- ToolConfig dataclass with metadata (is_dangerous, provider, tags)
- ToolRegistry class for tool lookup and filtering
- Dangerous tool detection for approval system
- Provider-based filtering for dynamic visibility
"""

import re
from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum


class ToolCategory(str, Enum):
    """Categories for tool classification."""
    INVENTORY = "inventory"  # Apps, ad units, placements
    REPORTING = "reporting"  # Reports, metrics
    MEDIATION = "mediation"  # Mediation groups, waterfalls
    ORDERS = "orders"  # Line items, orders, creatives
    TARGETING = "targeting"  # Custom targeting, audiences
    AUTH = "auth"  # Authentication endpoints
    OTHER = "other"


# Patterns that indicate dangerous (write) operations
# NOTE: Patterns are applied to tool names after removing provider prefix
# e.g., "admob_create_app" -> "create_app" for pattern matching
DANGEROUS_PATTERNS = [
    r"^create_",
    r"^update_",
    r"^delete_",
    r"^remove_",
    r"^add_",
    r"^edit_",
    r"^patch_",
    r"^put_",
    r"^batch_",  # Batch operations are always dangerous
    r"^stop_",   # Stop operations (e.g., stop experiment)
    r"_create$",
    r"_update$",
    r"_delete$",
    r"_edit$",
    r"_add$",
    r"_remove$",
    r"_stop$",   # Stop operations at end of name
    r"_patch$",  # Patch operations at end of name
]

# Known provider prefixes to strip for pattern matching
PROVIDER_PREFIXES = [
    "admob_",
    "admanager_",
    "applovin_",
    "unity_",
    "mintegral_",
    "liftoff_",
    "inmobi_",
    "pangle_",
    "dtexchange_",
]

# Patterns for category detection
CATEGORY_PATTERNS = {
    ToolCategory.INVENTORY: [
        r"app", r"ad_unit", r"placement", r"site", r"network",
        r"contact", r"team", r"custom_field", r"unit",
    ],
    ToolCategory.REPORTING: [
        r"report", r"reporting", r"metrics", r"revenue", r"income",
        r"performance", r"earnings",
    ],
    ToolCategory.MEDIATION: [
        r"mediation", r"ad_source", r"waterfall", r"ab_experiment",
        r"experiment", r"mapping", r"group",
    ],
    ToolCategory.ORDERS: [
        r"order", r"line_item", r"creative", r"proposal", r"deal",
    ],
    ToolCategory.TARGETING: [
        r"targeting", r"audience", r"segment", r"geo", r"custom_targeting",
    ],
    ToolCategory.AUTH: [
        r"auth", r"session", r"token", r"login",
    ],
}


@dataclass
class ToolConfig:
    """Configuration and metadata for a single tool.

    Attributes:
        name: Tool name (from MCP)
        description: Tool description
        provider: Network provider (admob, admanager, unity, etc.)
        is_dangerous: True if tool modifies data (create/update/delete)
        category: Tool category for filtering
        tags: Additional tags for search
        requires_account: Whether tool requires an account ID
        required_params: List of required parameter names
        langchain_tool: Reference to the actual LangChain tool object
    """
    name: str
    description: str = ""
    provider: str = ""
    is_dangerous: bool = False
    category: ToolCategory = ToolCategory.OTHER
    tags: list[str] = field(default_factory=list)
    requires_account: bool = False
    required_params: list[str] = field(default_factory=list)
    langchain_tool: Optional[Any] = field(default=None, repr=False)

    @classmethod
    def from_langchain_tool(cls, tool: Any, provider: str = "") -> "ToolConfig":
        """Create ToolConfig from a LangChain tool object.

        Args:
            tool: LangChain tool (from MCP adapter)
            provider: Provider name (admob, unity, etc.)

        Returns:
            Configured ToolConfig instance
        """
        name = getattr(tool, "name", "")
        description = getattr(tool, "description", "") or ""

        # Detect if dangerous
        is_dangerous = cls._is_dangerous_tool(name, description)

        # Detect category
        category = cls._detect_category(name, description)

        # Extract tags from name and description
        tags = cls._extract_tags(name, description)

        # Check if requires account
        requires_account = cls._requires_account(name, description)

        return cls(
            name=name,
            description=description,
            provider=provider,
            is_dangerous=is_dangerous,
            category=category,
            tags=tags,
            requires_account=requires_account,
            langchain_tool=tool,
        )

    @staticmethod
    def _is_dangerous_tool(name: str, description: str) -> bool:
        """Detect if tool is dangerous (write operation).

        Strips provider prefix before pattern matching to handle names like
        "admob_create_app" correctly.
        """
        name_lower = name.lower()
        desc_lower = description.lower()

        # Strip provider prefix for pattern matching
        stripped_name = name_lower
        for prefix in PROVIDER_PREFIXES:
            if name_lower.startswith(prefix):
                stripped_name = name_lower[len(prefix):]
                break

        # Check name patterns against stripped name
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, stripped_name):
                return True

        # Also check full name for patterns that might span the prefix boundary
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, name_lower):
                return True

        # Check description for write keywords
        write_keywords = ["create", "update", "delete", "modify", "edit", "remove", "add"]
        for keyword in write_keywords:
            if keyword in desc_lower[:100]:  # Check beginning of description
                return True

        return False

    @staticmethod
    def _detect_category(name: str, description: str) -> ToolCategory:
        """Detect tool category from name and description."""
        text = f"{name} {description}".lower()

        for category, patterns in CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text):
                    return category

        return ToolCategory.OTHER

    @staticmethod
    def _extract_tags(name: str, description: str) -> list[str]:
        """Extract searchable tags from tool name and description."""
        tags = []

        # Split name by underscores and add as tags
        name_parts = name.lower().replace("-", "_").split("_")
        tags.extend([p for p in name_parts if len(p) > 2])

        # Extract key nouns from description (simple approach)
        keywords = ["report", "app", "account", "unit", "group", "mediation",
                    "placement", "revenue", "metrics", "order", "creative"]
        desc_lower = description.lower()
        for kw in keywords:
            if kw in desc_lower:
                tags.append(kw)

        return list(set(tags))

    @staticmethod
    def _requires_account(name: str, description: str) -> bool:
        """Check if tool requires an account ID parameter."""
        text = f"{name} {description}".lower()
        return any(kw in text for kw in ["account", "publisher", "network_code"])


class ToolRegistry:
    """Central registry for all MCP tools.

    Manages tool metadata, filtering, and lookup.

    Usage:
        registry = ToolRegistry()
        await registry.load_tools(provider="admob", tools=mcp_tools)

        # Get dangerous tools for approval system
        dangerous = registry.get_dangerous_tools()

        # Filter by provider
        admob_tools = registry.get_tools_for_provider("admob")

        # Filter by category
        reporting_tools = registry.get_tools_for_category(ToolCategory.REPORTING)
    """

    def __init__(self):
        self._tools: dict[str, ToolConfig] = {}
        self._by_provider: dict[str, list[str]] = {}
        self._by_category: dict[ToolCategory, list[str]] = {}
        self._loaded_providers: set[str] = set()

    @property
    def tool_count(self) -> int:
        """Total number of registered tools."""
        return len(self._tools)

    @property
    def loaded_providers(self) -> set[str]:
        """Set of providers that have been loaded."""
        return self._loaded_providers.copy()

    def register_tool(self, config: ToolConfig) -> None:
        """Register a single tool configuration.

        Args:
            config: ToolConfig to register
        """
        self._tools[config.name] = config

        # Index by provider
        if config.provider not in self._by_provider:
            self._by_provider[config.provider] = []
        if config.name not in self._by_provider[config.provider]:
            self._by_provider[config.provider].append(config.name)

        # Index by category
        if config.category not in self._by_category:
            self._by_category[config.category] = []
        if config.name not in self._by_category[config.category]:
            self._by_category[config.category].append(config.name)

    def load_from_langchain_tools(self, tools: list, provider: str) -> int:
        """Load tools from LangChain tool objects.

        Args:
            tools: List of LangChain tools from MCP adapter
            provider: Provider name for these tools

        Returns:
            Number of tools loaded
        """
        count = 0
        for tool in tools:
            config = ToolConfig.from_langchain_tool(tool, provider)
            self.register_tool(config)
            count += 1

        self._loaded_providers.add(provider)
        return count

    def get_tool(self, name: str) -> Optional[ToolConfig]:
        """Get tool configuration by name.

        Args:
            name: Tool name

        Returns:
            ToolConfig or None if not found
        """
        return self._tools.get(name)

    def get_all_tools(self) -> list[ToolConfig]:
        """Get all registered tool configurations."""
        return list(self._tools.values())

    def get_langchain_tools(self) -> list[Any]:
        """Get all LangChain tool objects for binding to LLM."""
        return [
            config.langchain_tool
            for config in self._tools.values()
            if config.langchain_tool is not None
        ]

    def get_dangerous_tools(self) -> list[ToolConfig]:
        """Get all tools marked as dangerous (write operations)."""
        return [config for config in self._tools.values() if config.is_dangerous]

    def get_safe_tools(self) -> list[ToolConfig]:
        """Get all tools that are NOT dangerous (read-only)."""
        return [config for config in self._tools.values() if not config.is_dangerous]

    def get_tools_for_provider(self, provider: str) -> list[ToolConfig]:
        """Get all tools for a specific provider.

        Args:
            provider: Provider name (admob, admanager, unity, etc.)

        Returns:
            List of ToolConfig for that provider
        """
        tool_names = self._by_provider.get(provider, [])
        return [self._tools[name] for name in tool_names if name in self._tools]

    def get_tools_for_providers(self, providers: list[str]) -> list[ToolConfig]:
        """Get all tools for multiple providers.

        Args:
            providers: List of provider names

        Returns:
            Combined list of ToolConfig
        """
        tools = []
        for provider in providers:
            tools.extend(self.get_tools_for_provider(provider))
        return tools

    def get_tools_for_category(self, category: ToolCategory) -> list[ToolConfig]:
        """Get all tools in a specific category.

        Args:
            category: ToolCategory enum value

        Returns:
            List of ToolConfig in that category
        """
        tool_names = self._by_category.get(category, [])
        return [self._tools[name] for name in tool_names if name in self._tools]

    def get_langchain_tools_for_provider(self, provider: str) -> list[Any]:
        """Get LangChain tools for a specific provider.

        Args:
            provider: Provider name

        Returns:
            List of LangChain tool objects
        """
        configs = self.get_tools_for_provider(provider)
        return [c.langchain_tool for c in configs if c.langchain_tool]

    def get_langchain_tools_for_providers(self, providers: list[str]) -> list[Any]:
        """Get LangChain tools for multiple providers.

        Args:
            providers: List of provider names

        Returns:
            List of LangChain tool objects
        """
        configs = self.get_tools_for_providers(providers)
        return [c.langchain_tool for c in configs if c.langchain_tool]

    def is_dangerous(self, tool_name: str) -> bool:
        """Check if a tool is marked as dangerous.

        Args:
            tool_name: Name of the tool

        Returns:
            True if dangerous, False otherwise
        """
        config = self._tools.get(tool_name)
        return config.is_dangerous if config else False

    def filter_by_keywords(self, keywords: list[str]) -> list[ToolConfig]:
        """Filter tools by keyword matching in name, description, or tags.

        Args:
            keywords: List of keywords to match

        Returns:
            List of matching ToolConfig
        """
        keywords_lower = [k.lower() for k in keywords]
        matches = []

        for config in self._tools.values():
            text = f"{config.name} {config.description} {' '.join(config.tags)}".lower()
            if any(kw in text for kw in keywords_lower):
                matches.append(config)

        return matches

    def filter_by_tags(self, required_tags: set[str]) -> list[ToolConfig]:
        """Filter tools that have ALL required tags (intersection).

        This is used for two-layer semantic routing: filter by both
        network AND capability tags to get highly relevant tool subset.

        Args:
            required_tags: Set of tags that tools must have (all required)

        Returns:
            List of ToolConfig that have ALL required tags

        Example:
            # Get only AdMob mediation tools
            registry.filter_by_tags({"admob", "mediation"})
        """
        if not required_tags:
            return list(self._tools.values())

        matches = []
        required_lower = {t.lower() for t in required_tags}

        for config in self._tools.values():
            # Get tags from the config
            tool_tags = {t.lower() for t in config.tags}

            # Also check provider as a tag
            if config.provider:
                tool_tags.add(config.provider.lower())

            # Also check category as a tag
            if config.category:
                tool_tags.add(config.category.value.lower())

            # Tool must have ALL required tags
            if required_lower.issubset(tool_tags):
                matches.append(config)

        return matches

    def filter_by_network_capability(
        self,
        network: str,
        capability: str,
    ) -> list[ToolConfig]:
        """Filter tools by network and capability combination.

        Convenience method for two-layer routing. Combines network prefix
        matching with capability tag matching.

        Args:
            network: Network name (e.g., "admob", "unity")
            capability: Capability name (e.g., "mediation", "reporting")

        Returns:
            List of ToolConfig matching both network and capability
        """
        # First filter by provider/network
        network_tools = self.get_tools_for_provider(network)

        if not network_tools:
            # Try filtering by tag if no direct provider match
            network_tools = [
                c for c in self._tools.values()
                if network.lower() in {t.lower() for t in c.tags}
            ]

        # Then filter by capability
        capability_lower = capability.lower()
        matches = []

        for config in network_tools:
            # Check category match
            if config.category and config.category.value.lower() == capability_lower:
                matches.append(config)
                continue

            # Check tags for capability
            if capability_lower in {t.lower() for t in config.tags}:
                matches.append(config)
                continue

            # Check name for capability keywords
            if capability_lower in config.name.lower():
                matches.append(config)

        return matches

    def get_stats(self) -> dict:
        """Get registry statistics.

        Returns:
            Dict with tool counts and breakdowns
        """
        return {
            "total_tools": len(self._tools),
            "dangerous_tools": len(self.get_dangerous_tools()),
            "safe_tools": len(self.get_safe_tools()),
            "providers": {
                provider: len(tools)
                for provider, tools in self._by_provider.items()
            },
            "categories": {
                cat.value: len(tools)
                for cat, tools in self._by_category.items()
            },
        }

    def clear(self) -> None:
        """Clear all registered tools."""
        self._tools.clear()
        self._by_provider.clear()
        self._by_category.clear()
        self._loaded_providers.clear()


# Global registry instance
_global_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get the global tool registry instance.

    Creates one if it doesn't exist.

    Returns:
        Global ToolRegistry instance
    """
    global _global_registry
    if _global_registry is None:
        _global_registry = ToolRegistry()
    return _global_registry


def reset_tool_registry() -> None:
    """Reset the global tool registry (for testing)."""
    global _global_registry
    if _global_registry:
        _global_registry.clear()
    _global_registry = None


# =============================================================================
# Entity Dependency Registry
# =============================================================================
# Defines entity relationships for cascading validation and UI dependencies.
# Used by:
# - Backend: Validate entity IDs, resolve parent chains
# - Frontend: Cascade dropdowns (select account → filter apps)
# - Transform: Map IDs to display names

@dataclass
class EntityConfig:
    """Configuration for an entity type.

    Attributes:
        name: Entity type name (e.g., "apps")
        parent: Parent entity type (None for root entities)
        id_pattern: Regex pattern for valid IDs
        display_field: Field name for human-readable display
        fetcher: MCP tool name to list entities
        provider: Provider this entity belongs to (admob, gam, or None for shared)
        description: Human-readable description
    """
    name: str
    parent: Optional[str]
    id_pattern: str
    display_field: str
    fetcher: str
    provider: Optional[str] = None
    description: str = ""

    def validate_id(self, entity_id: str) -> bool:
        """Validate an entity ID against the pattern.

        Args:
            entity_id: ID to validate

        Returns:
            True if valid, False otherwise
        """
        return bool(re.match(self.id_pattern, entity_id))


# Entity Registry - Single source of truth for entity relationships
ENTITY_REGISTRY: dict[str, EntityConfig] = {
    # === AdMob Entities ===
    # Fetcher names match Discovery JSON: admob.X.Y.Z -> X_Y_Z
    "admob_accounts": EntityConfig(
        name="admob_accounts",
        parent=None,
        id_pattern=r"^pub-\d+$",
        display_field="displayName",
        fetcher="accounts_list",
        provider="admob",
        description="AdMob publisher accounts",
    ),
    "admob_apps": EntityConfig(
        name="admob_apps",
        parent="admob_accounts",
        id_pattern=r"^accounts/pub-\d+/apps/\d+$",
        display_field="name",
        fetcher="accounts_apps_list",
        provider="admob",
        description="AdMob apps within an account",
    ),
    "admob_ad_units": EntityConfig(
        name="admob_ad_units",
        parent="admob_apps",
        id_pattern=r"^accounts/pub-\d+/adUnits/\d+$",
        display_field="displayName",
        fetcher="accounts_adUnits_list",
        provider="admob",
        description="AdMob ad units within an app",
    ),
    "admob_ad_sources": EntityConfig(
        name="admob_ad_sources",
        parent="admob_accounts",
        id_pattern=r"^\d+$",
        display_field="title",
        fetcher="accounts_adSources_list",
        provider="admob",
        description="Ad sources available for mediation",
    ),
    "admob_mediation_groups": EntityConfig(
        name="admob_mediation_groups",
        parent="admob_accounts",
        id_pattern=r"^accounts/pub-\d+/mediationGroups/\d+$",
        display_field="displayName",
        fetcher="accounts_mediationGroups_list",
        provider="admob",
        description="AdMob mediation groups",
    ),

    # === Google Ad Manager Entities ===
    "gam_networks": EntityConfig(
        name="gam_networks",
        parent=None,
        id_pattern=r"^\d+$",
        display_field="displayName",
        fetcher="admanager_networks_get",
        provider="gam",
        description="Google Ad Manager networks",
    ),
    "gam_ad_units": EntityConfig(
        name="gam_ad_units",
        parent="gam_networks",
        id_pattern=r"^\d+$",
        display_field="name",
        fetcher="admanager_networks_adUnits_list",
        provider="gam",
        description="GAM ad units within a network",
    ),
    "gam_orders": EntityConfig(
        name="gam_orders",
        parent="gam_networks",
        id_pattern=r"^\d+$",
        display_field="name",
        fetcher="admanager_networks_orders_list",
        provider="gam",
        description="GAM orders within a network",
    ),
    "gam_line_items": EntityConfig(
        name="gam_line_items",
        parent="gam_orders",
        id_pattern=r"^\d+$",
        display_field="name",
        fetcher="admanager_networks_orders_lineItems_list",
        provider="gam",
        description="Line items within a GAM order",
    ),
    "gam_companies": EntityConfig(
        name="gam_companies",
        parent="gam_networks",
        id_pattern=r"^\d+$",
        display_field="name",
        fetcher="admanager_networks_companies_list",
        provider="gam",
        description="Companies (advertisers/agencies) in GAM",
    ),
    "gam_placements": EntityConfig(
        name="gam_placements",
        parent="gam_networks",
        id_pattern=r"^\d+$",
        display_field="name",
        fetcher="admanager_networks_placements_list",
        provider="gam",
        description="GAM placements",
    ),
}


def get_entity_config(entity_type: str) -> Optional[EntityConfig]:
    """Get entity configuration by type name.

    Args:
        entity_type: Entity type (e.g., "admob_apps")

    Returns:
        EntityConfig or None if not found
    """
    return ENTITY_REGISTRY.get(entity_type)


def get_entities_for_provider(provider: str) -> list[EntityConfig]:
    """Get all entity configs for a provider.

    Args:
        provider: Provider name (admob, gam)

    Returns:
        List of EntityConfig for that provider
    """
    return [
        config for config in ENTITY_REGISTRY.values()
        if config.provider == provider
    ]


def get_parent_chain(entity_type: str) -> list[str]:
    """Get the parent chain for an entity type (root first).

    Args:
        entity_type: Starting entity type

    Returns:
        List of entity types from root to parent (not including self)

    Example:
        get_parent_chain("admob_ad_units")
        # Returns: ["admob_accounts", "admob_apps"]
    """
    chain = []
    current = entity_type

    while current:
        config = ENTITY_REGISTRY.get(current)
        if not config or not config.parent:
            break
        chain.insert(0, config.parent)
        current = config.parent

    return chain


def get_child_entities(entity_type: str) -> list[str]:
    """Get direct child entity types for an entity.

    Args:
        entity_type: Parent entity type

    Returns:
        List of child entity type names
    """
    return [
        config.name
        for config in ENTITY_REGISTRY.values()
        if config.parent == entity_type
    ]


def validate_entity_id(entity_type: str, entity_id: str) -> bool:
    """Validate an entity ID against its pattern.

    Args:
        entity_type: Entity type name
        entity_id: ID to validate

    Returns:
        True if valid, False if invalid or unknown entity type
    """
    config = ENTITY_REGISTRY.get(entity_type)
    if not config:
        return False
    return config.validate_id(entity_id)


def get_fetcher_for_entity(entity_type: str) -> Optional[str]:
    """Get the MCP tool name for fetching entities of this type.

    Args:
        entity_type: Entity type name

    Returns:
        Tool name or None if not found
    """
    config = ENTITY_REGISTRY.get(entity_type)
    return config.fetcher if config else None


# Export for TypeScript generation (JSON-serializable subset)
def export_entity_registry_json() -> dict:
    """Export entity registry as JSON for TypeScript codegen.

    Returns:
        Dict representation of the registry
    """
    return {
        name: {
            "name": config.name,
            "parent": config.parent,
            "idPattern": config.id_pattern,
            "displayField": config.display_field,
            "fetcher": config.fetcher,
            "provider": config.provider,
            "description": config.description,
        }
        for name, config in ENTITY_REGISTRY.items()
    }
