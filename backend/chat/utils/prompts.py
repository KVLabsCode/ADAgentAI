"""Prompt management with LangSmith integration.

Pulls prompts from LangSmith Hub. No hardcoded fallbacks.
All prompts must be configured in LangSmith.
"""

import os
from functools import lru_cache
from langsmith import Client

# LangSmith prompt names (edit these in LangSmith UI)
SYSTEM_PROMPT_NAME = "adagent-system-prompt"
SERVICE_INSTRUCTIONS_PREFIX = "adagent-service-"  # e.g., adagent-service-admob
ROUTER_PROMPT_NAME = "adagent-router"
AGENT_ROLES_PREFIX = "adagent-role-"  # e.g., adagent-role-admob-inventory

# Initialize LangSmith client
_client: Client | None = None


def get_langsmith_client() -> Client | None:
    """Get or create LangSmith client."""
    global _client
    if _client is None:
        api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
        if api_key:
            try:
                _client = Client()
            except Exception as e:
                print(f"[prompts] Failed to initialize LangSmith client: {e}")
    return _client


@lru_cache(maxsize=32)
def pull_prompt(prompt_name: str) -> str | None:
    """Pull a prompt from LangSmith Hub.

    Args:
        prompt_name: Name of the prompt in LangSmith

    Returns:
        Prompt template string or None if not found
    """
    client = get_langsmith_client()
    if not client:
        raise RuntimeError(
            f"LangSmith client not initialized. Set LANGSMITH_API_KEY environment variable."
        )

    try:
        # Pull prompt from LangSmith
        prompt = client.pull_prompt(prompt_name)

        # Extract template from prompt
        if hasattr(prompt, "messages") and prompt.messages:
            # ChatPromptTemplate - get content from first message
            first_msg = prompt.messages[0]
            if hasattr(first_msg, "prompt") and hasattr(first_msg.prompt, "template"):
                return first_msg.prompt.template
            elif hasattr(first_msg, "content"):
                return first_msg.content
        elif hasattr(prompt, "template"):
            # PromptTemplate
            return prompt.template

        raise ValueError(f"Unexpected prompt format for {prompt_name}")

    except Exception as e:
        error_str = str(e).lower()
        if "not found" in error_str or "404" in error_str:
            raise ValueError(
                f"Prompt '{prompt_name}' not found in LangSmith. "
                f"Run: cd backend && uv run python scripts/push_prompts_to_langsmith.py"
            )
        raise


def clear_prompt_cache():
    """Clear the prompt cache to force re-fetching from LangSmith."""
    pull_prompt.cache_clear()
    print("[prompts] Prompt cache cleared")


def get_system_prompt_template() -> str:
    """Get the system prompt template from LangSmith.

    Returns:
        System prompt template with placeholders
    """
    template = pull_prompt(SYSTEM_PROMPT_NAME)
    print(f"[prompts] Using LangSmith prompt: {SYSTEM_PROMPT_NAME}")
    return template


def get_service_instructions(service: str) -> str:
    """Get service-specific instructions from LangSmith.

    Args:
        service: Service name (admob, admanager, general)

    Returns:
        Service instructions string
    """
    prompt_name = f"{SERVICE_INSTRUCTIONS_PREFIX}{service}"
    instructions = pull_prompt(prompt_name)
    print(f"[prompts] Using LangSmith instructions: {prompt_name}")
    return instructions


def get_router_prompt() -> str:
    """Get the router/classification prompt from LangSmith.

    Returns:
        Router system prompt string
    """
    prompt = pull_prompt(ROUTER_PROMPT_NAME)
    print(f"[prompts] Using LangSmith router prompt: {ROUTER_PROMPT_NAME}")
    return prompt


def get_agent_role(service: str, capability: str) -> dict[str, str]:
    """Get agent role info from LangSmith.

    Args:
        service: Service name
        capability: Capability name

    Returns:
        Dict with 'role' and 'goal' keys
    """
    prompt_name = f"{AGENT_ROLES_PREFIX}{service}-{capability}"
    try:
        role_text = pull_prompt(prompt_name)
        # Parse role text: "Role: X\nGoal: Y"
        lines = role_text.strip().split("\n")
        role = ""
        goal = ""
        for line in lines:
            if line.startswith("Role:"):
                role = line[5:].strip()
            elif line.startswith("Goal:"):
                goal = line[5:].strip()
        if role and goal:
            return {"role": role, "goal": goal}
    except Exception:
        pass

    # Fallback for unknown roles
    return {
        "role": f"{service.title()} {capability.title()} Specialist",
        "goal": f"Help users with {service} {capability} tasks"
    }
