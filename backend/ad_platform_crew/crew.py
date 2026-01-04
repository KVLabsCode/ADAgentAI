"""
Ad Platform Crew - Main Crew Definition

Defines the Ad Platform Crew for conversational AI monetization management.
Supports multiple ad platforms (AdMob, Ad Manager, and more).
Compatible with both crewai CLI and crewai-chat-ui.
"""

from crewai import Crew, Process, Task
from ad_platform_crew.factory.agent_factory import get_factory
from ad_platform_crew.config.settings import settings


class AdPlatformCrew:
    """
    Ad Platform Crew for managing ad operations via conversational AI.

    This crew uses the factory pattern to create agents with filtered tools
    based on their capabilities, solving the "too many tools" problem.
    """

    def __init__(self):
        self._factory = get_factory()
        self._primary_agent = None

    def _get_primary_agent(self):
        """Get or create the primary agent for handling queries."""
        if self._primary_agent is None:
            try:
                # Try to create from agents.yaml
                self._primary_agent = self._factory.create_agent("primary_agent")
            except (ValueError, KeyError):
                # Fallback: create a basic AdMob inventory specialist
                self._primary_agent = self._factory.create_specialist(
                    "admob", "inventory", verbose=settings.crew.verbose
                )
        return self._primary_agent

    def crew(self) -> Crew:
        """
        Create the Ad Platform Crew.

        Returns a crew with a single primary agent that handles user queries.
        The agent has filtered tools based on its capability configuration.
        """
        primary_agent = self._get_primary_agent()

        # Task that processes user queries
        process_task = Task(
            description="""
            Process the user's request about ad platform monetization: {user_query}

            Instructions:
            1. Understand what the user is asking for
            2. For AdMob queries:
               - Use "List AdMob Accounts" to get available accounts first
               - Use "List AdMob Apps" with the account_id for app info
               - Use "List AdMob Ad Units" for ad unit info
               - Use report generation tools for performance data
            3. For Ad Manager queries:
               - Use "List Ad Manager Networks" to get network codes first
               - Use "List Ad Manager Ad Units" for ad unit info
               - Use report tools for performance data
            4. Provide a clear, actionable response with the data
            5. If you encounter errors, explain them clearly
            """,
            expected_output="A clear response addressing the user's request with relevant data from the ad platform(s).",
            agent=primary_agent,
        )

        return Crew(
            agents=[primary_agent],
            tasks=[process_task],
            process=Process.sequential,
            verbose=settings.crew.verbose,
            chat_llm=settings.crew.chat_llm,
            memory=settings.crew.memory,
            cache=settings.crew.cache,
        )

    def create_capability_crew(self, capability: str, user_request: str) -> Crew:
        """
        Create a crew for a specific capability across all platforms.

        This creates specialists from each platform that supports the capability,
        plus an orchestrator to coordinate them.

        Args:
            capability: Capability key (e.g., "inventory", "reporting")
            user_request: The user's request to process

        Returns:
            Configured Crew with orchestrator and specialists
        """
        # Create orchestrator (no tools, just delegates)
        orchestrator = self._factory.create_orchestrator(capability)

        # Create all specialists for this capability
        specialists = self._factory.create_all_specialists(capability)

        # Create the task
        task = Task(
            description=f"""
            Handle this {capability} request: {user_request}

            Delegate to the appropriate platform specialists as needed.
            Synthesize their outputs into a unified response.
            """,
            expected_output=f"Comprehensive {capability} operation result across all platforms.",
            agent=orchestrator,
        )

        return Crew(
            agents=[orchestrator] + specialists,
            tasks=[task],
            process=Process.hierarchical,
            manager_agent=orchestrator,
            verbose=settings.crew.verbose,
            chat_llm=settings.crew.chat_llm,
            memory=settings.crew.memory,
            cache=settings.crew.cache,
        )


# Backwards compatibility alias
AdmobCrew = AdPlatformCrew


# Function for crewai-chat-ui discovery (must be named 'crew')
def crew() -> Crew:
    """Return crew instance - discovered by crewai-chat-ui."""
    return AdPlatformCrew().crew()


# Note: Do NOT create crew instances at module load time!
# The chat_server.py (FastAPI) creates crews on-demand with routing.
