"""Utility functions for chat server."""

from .providers import get_user_providers, validate_user_session
from .parsing import extract_thought, extract_json_with_nested_braces
from .prompts import (
    get_system_prompt_template,
    get_service_instructions,
    get_agent_role,
    get_router_prompt,
    clear_prompt_cache,
)
from .entity_resolver import (
    EntityResolver,
    ResolvedEntity,
    get_resolver_for_account,
)

__all__ = [
    "get_user_providers",
    "validate_user_session",
    "extract_thought",
    "extract_json_with_nested_braces",
    "get_system_prompt_template",
    "get_service_instructions",
    "get_agent_role",
    "get_router_prompt",
    "clear_prompt_cache",
    # Entity resolution
    "EntityResolver",
    "ResolvedEntity",
    "get_resolver_for_account",
]
