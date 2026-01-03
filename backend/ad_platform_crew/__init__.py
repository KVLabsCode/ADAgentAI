"""
Ad Platform Crew - Agentic Ad Control Plane

A conversational, agent-driven interface for managing ad platforms
(AdMob, Google Ad Manager, and more) using CrewAI and MCP (Model Context Protocol).

This package provides:
- Capability-based agent architecture (inventory, reporting, mediation, etc.)
- YAML-driven configuration for services and agents
- Factory pattern for creating agents with filtered tools
- Support for multiple ad platforms
"""

__version__ = "2.0.0"
__author__ = "Koushik Ks"

# Lazy imports to avoid creating crew instances at module load time
def __getattr__(name):
    if name == "AdPlatformCrew":
        from .crew import AdPlatformCrew
        return AdPlatformCrew
    elif name == "AdmobCrew":
        from .crew import AdmobCrew
        return AdmobCrew
    elif name == "crew":
        from .crew import crew
        return crew
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = ["AdPlatformCrew", "AdmobCrew", "crew"]
