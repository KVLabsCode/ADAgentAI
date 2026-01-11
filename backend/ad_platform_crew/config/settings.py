"""
Configuration settings for Ad Platform Crew.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)


@dataclass
class LLMConfig:
    """LLM configuration for CrewAI agents."""

    provider: str = "anthropic"
    model: str = "claude-sonnet-4-20250514"
    temperature: float = 0.7
    max_tokens: int = 4096
    # OpenRouter specific settings
    base_url: Optional[str] = None
    api_key: Optional[str] = None

    @property
    def model_string(self) -> str:
        """Return the model string for CrewAI."""
        return f"{self.provider}/{self.model}"

    @property
    def is_openrouter(self) -> bool:
        """Check if using OpenRouter provider."""
        return self.provider == "openrouter"


# Available model presets for easy switching
MODEL_PRESETS = {
    "claude-sonnet": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
    },
    "gemini-flash-lite": {
        "provider": "openrouter",
        "model": "google/gemini-2.5-flash-lite",
    },
}


@dataclass
class MCPConfig:
    """MCP server configuration."""

    # AdMob MCP
    admob_server_path: Path = field(
        default_factory=lambda: Path(__file__).parent.parent.parent / "admob_mcp"
    )
    # Ad Manager MCP
    admanager_server_path: Path = field(
        default_factory=lambda: Path(__file__).parent.parent.parent / "admanager_mcp"
    )
    transport: str = "stdio"

    @property
    def admob_server_command(self) -> list[str]:
        """Return the command to start the AdMob MCP server."""
        return ["python", "-m", "admob_mcp"]

    @property
    def admanager_server_command(self) -> list[str]:
        """Return the command to start the Ad Manager MCP server."""
        return ["python", "-m", "admanager_mcp"]


@dataclass
class MemoryConfig:
    """Memory configuration for CrewAI agents."""

    enabled: bool = True
    short_term: bool = True  # Remember within single run (no embeddings needed)
    long_term: bool = False  # Remember across runs (requires embeddings)
    entity: bool = True  # Remember entities like accounts, apps, ad units

    # Storage path for persistent memory
    storage_path: Path = field(
        default_factory=lambda: Path(__file__).parent.parent.parent / ".memory"
    )


@dataclass
class CrewConfig:
    """Crew execution configuration."""

    verbose: bool = True
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    cache: bool = True
    max_rpm: int = 10
    max_iterations: int = 15
    chat_llm: str = "anthropic/claude-sonnet-4-20250514"  # LLM for chat UI orchestration


@dataclass
class Settings:
    """Application settings."""

    llm: LLMConfig = field(default_factory=LLMConfig)
    mcp: MCPConfig = field(default_factory=MCPConfig)
    crew: CrewConfig = field(default_factory=CrewConfig)

    # Environment
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    @classmethod
    def from_env(cls) -> "Settings":
        """Create settings from environment variables."""
        # Determine LLM provider and model from environment
        llm_provider = os.getenv("LLM_PROVIDER", "anthropic")
        llm_model = os.getenv("LLM_MODEL")

        # If using a preset, apply it
        model_preset = os.getenv("MODEL_PRESET")
        if model_preset and model_preset in MODEL_PRESETS:
            preset = MODEL_PRESETS[model_preset]
            llm_provider = preset["provider"]
            llm_model = preset["model"]
        elif not llm_model:
            # Default model based on provider
            if llm_provider == "openrouter":
                llm_model = "google/gemini-2.5-flash-lite"
            else:
                llm_model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

        # OpenRouter configuration
        openrouter_base_url = None
        openrouter_api_key = None
        if llm_provider == "openrouter":
            openrouter_base_url = "https://openrouter.ai/api/v1"
            openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

        # Build chat_llm string for CrewConfig
        chat_llm = f"{llm_provider}/{llm_model}"

        return cls(
            llm=LLMConfig(
                provider=llm_provider,
                model=llm_model,
                temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
                base_url=openrouter_base_url,
                api_key=openrouter_api_key,
            ),
            crew=CrewConfig(
                verbose=os.getenv("CREW_VERBOSE", "true").lower() == "true",
                chat_llm=chat_llm,
                memory=MemoryConfig(
                    enabled=os.getenv("CREW_MEMORY", "true").lower() == "true",
                    short_term=os.getenv("CREW_MEMORY_SHORT_TERM", "true").lower() == "true",
                    long_term=os.getenv("CREW_MEMORY_LONG_TERM", "false").lower() == "true",
                    entity=os.getenv("CREW_MEMORY_ENTITY", "true").lower() == "true",
                ),
            ),
        )


# Global settings instance
settings = Settings.from_env()
