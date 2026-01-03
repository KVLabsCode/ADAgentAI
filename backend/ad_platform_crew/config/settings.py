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

    @property
    def model_string(self) -> str:
        """Return the model string for CrewAI."""
        return f"{self.provider}/{self.model}"


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
class CrewConfig:
    """Crew execution configuration."""

    verbose: bool = True
    memory: bool = False  # Disabled to avoid OpenAI dependency
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
        return cls(
            llm=LLMConfig(
                model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            ),
            crew=CrewConfig(
                verbose=os.getenv("CREW_VERBOSE", "true").lower() == "true",
                memory=os.getenv("CREW_MEMORY", "false").lower() == "true",
            ),
        )


# Global settings instance
settings = Settings.from_env()
