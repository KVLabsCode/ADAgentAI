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


def get_model_name(role: str = "sonnet") -> str:
    """Get the actual model ID for a role.

    Args:
        role: "haiku", "sonnet", or a full model ID.

    Returns:
        The actual model ID string (e.g., "google/gemini-2.5-flash").
    """
    provider = get_provider()
    if provider == "openrouter":
        if role in OPENROUTER_MODELS:
            return OPENROUTER_MODELS[role]
    else:
        if role in ANTHROPIC_MODELS:
            return ANTHROPIC_MODELS[role]
    # Already a full model ID (e.g., "google/gemini-2.5-flash", "claude-sonnet-4-...")
    return role


def get_llm(
    *,
    role: str = "sonnet",
    max_tokens: int = 8192,
    temperature: float = 0.1,
    thinking: dict[str, Any] | None = None,
    reasoning_effort: str | None = None,
) -> BaseChatModel:
    """Create an LLM instance based on the configured provider.

    Args:
        role: "haiku" for fast/cheap tasks (router, verifier),
              "sonnet" for capable tasks (specialist, synthesizer).
              Can also be a full model ID like "claude-sonnet-4-20250514"
              or "openrouter/google/gemini-2.5-flash".
        max_tokens: Maximum response tokens.
        temperature: Sampling temperature.
        thinking: Extended thinking config for Anthropic models.
        reasoning_effort: Reasoning effort for OpenRouter models ("high", "medium", "low").

    Returns:
        Configured LLM instance.
    """
    provider = get_provider()

    if provider == "openrouter":
        return _make_openrouter_llm(role, max_tokens, temperature, reasoning_effort)
    else:
        return _make_anthropic_llm(role, max_tokens, temperature, thinking)


def _make_openrouter_llm(
    role: str,
    max_tokens: int,
    temperature: float,
    reasoning_effort: str | None = None,
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

    print(f"[llm] Using OpenRouter model: {model_name} (role={role})", end="")

    kwargs: dict[str, Any] = {
        "extra_headers": {
            "HTTP-Referer": "https://adagentai.com",
            "X-Title": "ADAgentAI",
        }
    }

    # Enable reasoning/thinking if requested
    # Uses OpenRouter's reasoning parameter: {"effort": "high"|"medium"|"low"}
    # Note: Gemini 2.5 Flash has built-in thinking but reasoning content may not
    # be exposed through OpenRouter's response (known LangChain limitation #32981)
    if reasoning_effort:
        kwargs["reasoning"] = {"effort": reasoning_effort}
        print(f", reasoning={reasoning_effort}")
    else:
        print()  # newline

    import warnings
    # Suppress LangChain warning about 'reasoning' in model_kwargs — it's needed
    # for OpenRouter's API format and there's no equivalent direct parameter
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="Parameters.*reasoning.*should be specified explicitly")
        return ChatOpenAI(
            model=model_name,
            openai_api_key=api_key,
            openai_api_base="https://openrouter.ai/api/v1",
            max_tokens=max_tokens,
            temperature=temperature,
            model_kwargs=kwargs,
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
