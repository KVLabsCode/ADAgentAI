"""
Agent Factory for Ad Platform Control Plane.

Creates agents with filtered tools based on YAML configuration.
This solves the "154 tools" problem by giving each agent only
the tools they need for their specific capability.
"""

import yaml
from pathlib import Path
from typing import Optional
from crewai import Agent, LLM

from ..config.settings import settings


class AgentFactory:
    """
    Factory that creates agents with filtered tools based on capability.

    The factory:
    1. Loads service definitions from services.yaml
    2. Loads agent definitions from agents.yaml
    3. Creates agents with only the tools specified for their capability

    Example:
        factory = AgentFactory()
        agent = factory.create_agent("admob_inventory_specialist")
        # Agent has only 6 inventory tools, not all 21 AdMob tools
    """

    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize the factory with configuration.

        Args:
            config_dir: Path to config directory. Defaults to ../config/
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"

        # Load configurations
        self.services_config = self._load_yaml("services.yaml")
        self.agents_config = self._load_yaml("agents.yaml")
        self.tasks_config = self._load_yaml("tasks.yaml")

        # Cache for tool modules
        self._tool_modules: dict[str, dict] = {}

        # Shared LLM instance
        self._llm = self._create_llm()

    def _load_yaml(self, filename: str) -> dict:
        """Load a YAML configuration file."""
        file_path = self.config_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def _create_llm(self) -> LLM:
        """Create the shared LLM instance."""
        return LLM(
            model=settings.llm.model_string,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
        )

    def _get_tool_module(self, service_key: str) -> dict:
        """
        Get the tool module for a service.

        Returns a dict mapping tool names to tool functions.
        """
        if service_key not in self._tool_modules:
            service = self.services_config["services"].get(service_key)
            if not service:
                raise ValueError(f"Unknown service: {service_key}")

            module_path = service["module"]

            # Import the module dynamically
            import importlib
            try:
                module = importlib.import_module(module_path)
            except ImportError as e:
                raise ImportError(f"Failed to import tool module {module_path}: {e}")

            # Get the tool registry from the module
            if hasattr(module, "get_tool_registry"):
                self._tool_modules[service_key] = module.get_tool_registry()
            elif hasattr(module, "get_all_tools"):
                # Fallback: build registry from get_all_tools()
                tools = module.get_all_tools()
                self._tool_modules[service_key] = {
                    tool.name: tool for tool in tools
                }
            else:
                raise AttributeError(
                    f"Module {module_path} must have get_tool_registry() or get_all_tools()"
                )

        return self._tool_modules[service_key]

    def _filter_tools(self, service_key: str, capability: str) -> list:
        """
        Get filtered tools for a service capability.

        Args:
            service_key: Service key (e.g., "admob", "admanager")
            capability: Capability key (e.g., "inventory", "reporting")

        Returns:
            List of tool functions for the capability
        """
        service = self.services_config["services"].get(service_key)
        if not service:
            raise ValueError(f"Unknown service: {service_key}")

        cap_config = service["capabilities"].get(capability)
        if not cap_config:
            raise ValueError(f"Unknown capability '{capability}' for service '{service_key}'")

        # Get allowed tool names from config
        allowed_tools = cap_config.get("tools", [])

        # Get the tool registry
        tool_registry = self._get_tool_module(service_key)

        # Filter tools
        filtered = []
        for tool_name in allowed_tools:
            if tool_name in tool_registry:
                filtered.append(tool_registry[tool_name])
            else:
                # Tool might have a different internal name
                # Try to find it by matching
                found = False
                for reg_name, tool in tool_registry.items():
                    if tool_name.lower().replace("_", "") in reg_name.lower().replace("_", ""):
                        filtered.append(tool)
                        found = True
                        break
                if not found:
                    print(f"Warning: Tool '{tool_name}' not found in {service_key} registry")

        return filtered

    def get_services(self) -> list[str]:
        """List all registered service keys."""
        return list(self.services_config.get("services", {}).keys())

    def get_capabilities(self, service_key: str) -> list[str]:
        """List capabilities for a service."""
        service = self.services_config["services"].get(service_key)
        if not service:
            return []
        return list(service.get("capabilities", {}).keys())

    def get_agents(self) -> list[str]:
        """List all registered agent keys."""
        return list(self.agents_config.keys())

    def create_agent(
        self,
        agent_key: str,
        llm: Optional[LLM] = None,
        verbose: Optional[bool] = None
    ) -> Agent:
        """
        Create an agent by key from agents.yaml.

        The agent will have filtered tools based on its service/capability.

        Args:
            agent_key: Key from agents.yaml (e.g., "admob_inventory_specialist")
            llm: Optional LLM override
            verbose: Optional verbose override

        Returns:
            Configured Agent instance
        """
        agent_config = self.agents_config.get(agent_key)
        if not agent_config:
            raise ValueError(f"Unknown agent: {agent_key}")

        # Check if this is an orchestrator (no tools)
        is_orchestrator = agent_config.get("is_orchestrator", False)

        tools = []
        if not is_orchestrator:
            # Get service and capability
            service_key = agent_config.get("service")
            capability = agent_config.get("capability")

            if service_key and capability:
                tools = self._filter_tools(service_key, capability)

        return Agent(
            role=agent_config["role"],
            goal=agent_config["goal"].strip(),
            backstory=agent_config["backstory"].strip(),
            llm=llm or self._llm,
            tools=tools,
            verbose=verbose if verbose is not None else settings.crew.verbose,
            allow_delegation=agent_config.get("allow_delegation", False),
            max_iter=agent_config.get("max_iter", settings.crew.max_iterations),
        )

    def create_specialist(
        self,
        service_key: str,
        capability: str,
        verbose: bool = True
    ) -> Agent:
        """
        Create a specialist agent for a service capability.

        This is an alternative to create_agent() when you want to
        create an agent directly from service/capability without
        defining it in agents.yaml first.

        Args:
            service_key: Service key (e.g., "admob")
            capability: Capability key (e.g., "inventory")
            verbose: Enable verbose output

        Returns:
            Configured specialist Agent
        """
        service = self.services_config["services"].get(service_key)
        if not service:
            raise ValueError(f"Unknown service: {service_key}")

        cap_config = service["capabilities"].get(capability)
        if not cap_config:
            raise ValueError(f"Unknown capability '{capability}' for service '{service_key}'")

        # Get filtered tools
        tools = self._filter_tools(service_key, capability)

        return Agent(
            role=f"{service['display_name']} {capability.title()} Specialist",
            goal=f"Handle all {capability} operations for {service['display_name']}",
            backstory=cap_config.get(
                "backstory",
                f"Expert in {service['display_name']} {capability} management."
            ).strip(),
            llm=self._llm,
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            max_iter=settings.crew.max_iterations,
        )

    def create_orchestrator(self, capability: str) -> Agent:
        """
        Create an orchestrator that delegates to specialists.

        Orchestrators have no tools - they only coordinate.

        Args:
            capability: Capability to orchestrate (e.g., "inventory")

        Returns:
            Orchestrator Agent
        """
        supporting_services = []
        for service_key, service in self.services_config.get("services", {}).items():
            if capability in service.get("capabilities", {}):
                supporting_services.append(service["display_name"])

        return Agent(
            role=f"{capability.title()} Orchestrator",
            goal=f"Coordinate {capability} operations across all ad platforms",
            backstory=f"""Senior manager overseeing {capability} operations across:
            {', '.join(supporting_services)}.
            You delegate to platform specialists and synthesize their outputs.""",
            llm=self._llm,
            tools=[],  # Orchestrator has no tools
            verbose=True,
            allow_delegation=True,
            max_iter=settings.crew.max_iterations,
        )

    def create_all_specialists(self, capability: str) -> list[Agent]:
        """
        Create specialists for all services that support a capability.

        Args:
            capability: Capability key (e.g., "inventory")

        Returns:
            List of specialist Agents
        """
        agents = []
        for service_key, service in self.services_config.get("services", {}).items():
            if capability in service.get("capabilities", {}):
                agents.append(self.create_specialist(service_key, capability))
        return agents


# Global factory instance
_factory: Optional[AgentFactory] = None


def get_factory(config_dir: Optional[Path] = None) -> AgentFactory:
    """Get or create the global AgentFactory instance."""
    global _factory
    if _factory is None:
        _factory = AgentFactory(config_dir)
    return _factory
