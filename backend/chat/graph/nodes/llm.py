"""Shared LLM factory for all graph nodes.

Switch between providers by setting LLM_PROVIDER env var:
  - "openrouter" (default) → routes through OpenRouter API
  - "anthropic" → uses Anthropic API directly

For OpenRouter, set OPENROUTER_API_KEY.
For Anthropic, set ANTHROPIC_API_KEY.
"""

import os
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI


# Default OpenRouter model mappings (equivalent to Claude models)
OPENROUTER_MODELS = {
    # Haiku-equivalent (fast, cheap) - for router, verifier
    "haiku": "google/gemini-2.5-flash",
    # Sonnet-equivalent (capable) - for specialist, synthesizer
    "sonnet": "google/gemini-2.5-flash",
}


def get_provider() -> str:
    """Get the configured LLM provider."""
    return os.getenv("LLM_PROVIDER", "openrouter")


def get_llm(
    *,
    role: str = "sonnet",
    max_tokens: int = 8192,
    temperature: float = 0.1,
    thinking: dict[str, Any] | None = None,
) -> BaseChatModel:
    """Create an LLM instance based on the configured provider.

    Args:
        role: "haiku" for fast/cheap tasks (router, verifier),
              "sonnet" for capable tasks (specialist, synthesizer).
              Can also be a full model ID like "claude-sonnet-4-20250514"
              or "openrouter/google/gemini-2.5-flash".
        max_tokens: Maximum response tokens.
        temperature: Sampling temperature.
        thinking: Extended thinking config (Claude-only, ignored for OpenRouter).

    Returns:
        Configured LLM instance.
    """
    provider = get_provider()

    if provider == "openrouter":
        return _make_openrouter_llm(role, max_tokens, temperature)
    else:
        return _make_anthropic_llm(role, max_tokens, temperature, thinking)


def _make_openrouter_llm(
    role: str,
    max_tokens: int,
    temperature: float,
) -> BaseChatModel:
    """Create an OpenRouter LLM via ChatOpenAI."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("[llm] Warning: OPENROUTER_API_KEY not set, falling back to Anthropic")
        return _make_anthropic_llm(role, max_tokens, temperature, None)

    # Resolve role to model name
    if role in OPENROUTER_MODELS:
        model_name = OPENROUTER_MODELS[role]
    elif role.startswith("openrouter/"):
        model_name = role.replace("openrouter/", "")
    elif "/" in role:
        # Already a full model ID like "google/gemini-2.5-flash"
        model_name = role
    else:
        # Unknown role, use sonnet-equivalent
        model_name = OPENROUTER_MODELS["sonnet"]

    print(f"[llm] Using OpenRouter model: {model_name} (role={role})")

    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        max_tokens=max_tokens,
        temperature=temperature,
        model_kwargs={
            "extra_headers": {
                "HTTP-Referer": "https://adagentai.com",
                "X-Title": "ADAgentAI",
            }
        },
    )


# Anthropic model mappings
ANTHROPIC_MODELS = {
    "haiku": "claude-3-5-haiku-20241022",
    "sonnet": "claude-sonnet-4-20250514",
}


def _make_anthropic_llm(
    role: str,
    max_tokens: int,
    temperature: float,
    thinking: dict[str, Any] | None,
) -> BaseChatModel:
    """Create an Anthropic LLM."""
    # Resolve role to model name
    if role in ANTHROPIC_MODELS:
        model_name = ANTHROPIC_MODELS[role]
    elif role.startswith("anthropic/"):
        model_name = role.replace("anthropic/", "")
    elif role.startswith("claude-"):
        model_name = role
    else:
        model_name = ANTHROPIC_MODELS["sonnet"]

    print(f"[llm] Using Anthropic model: {model_name} (role={role})")

    kwargs: dict[str, Any] = {
        "model": model_name,
        "max_tokens": max_tokens,
    }

    if thinking:
        kwargs["thinking"] = thinking
        kwargs["temperature"] = 1  # Required for thinking mode
    else:
        kwargs["temperature"] = temperature

    return ChatAnthropic(**kwargs)
