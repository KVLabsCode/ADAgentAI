"""
Routing Flow for Ad Platform Crew.

Uses CrewAI Flows with the @router pattern to classify user queries
and route them to the appropriate specialist agent.

Architecture:
1. Router classifies the query type (fast, cheap LLM call)
2. Routes to the appropriate specialist crew
3. Each specialist has filtered tools for their capability

This solves the "too many tools" problem while providing intelligent routing.
"""

from crewai.flow.flow import Flow, listen, router, start
from crewai import Agent, Crew, Task, Process, LLM
from pydantic import BaseModel
from typing import Optional
from enum import Enum

from ..factory.agent_factory import get_factory
from ..config.settings import settings


class QueryType(str, Enum):
    """Types of queries the system can handle."""
    ADMOB_INVENTORY = "admob_inventory"
    ADMOB_REPORTING = "admob_reporting"
    ADMOB_MEDIATION = "admob_mediation"
    ADMOB_EXPERIMENTATION = "admob_experimentation"
    ADMANAGER_INVENTORY = "admanager_inventory"
    ADMANAGER_REPORTING = "admanager_reporting"
    ADMANAGER_ORDERS = "admanager_orders"
    ADMANAGER_DEALS = "admanager_deals"
    ADMANAGER_TARGETING = "admanager_targeting"
    GENERAL = "general"


class FlowState(BaseModel):
    """State maintained across the flow."""
    user_query: str = ""
    query_type: str = ""
    result: str = ""


# Query classification prompt - optimized for fast, accurate routing
CLASSIFICATION_PROMPT = """Classify this user query into ONE category.

Categories:
- admob_inventory: AdMob accounts, apps, ad units (list, create, view)
- admob_reporting: AdMob performance, revenue, eCPM, reports
- admob_mediation: AdMob mediation groups, ad sources, waterfall
- admob_experimentation: AdMob A/B tests, experiments
- admanager_inventory: Ad Manager networks, ad units, placements, sites
- admanager_reporting: Ad Manager reports, analytics
- admanager_orders: Ad Manager orders, line items, campaigns
- admanager_deals: Ad Manager private auctions, deals
- admanager_targeting: Ad Manager custom targeting, audiences, geo
- general: General questions or unclear

Query: {query}

Respond with ONLY the category name (e.g., "admob_inventory")."""


class AdPlatformRoutingFlow(Flow[FlowState]):
    """
    Flow that routes user queries to the appropriate specialist.

    Uses a lightweight classification step followed by specialized crew execution.
    """

    def __init__(self):
        super().__init__()
        self._factory = get_factory()
        self._llm = LLM(
            model=settings.llm.model_string,
            temperature=0.0,  # Deterministic for classification
            max_tokens=50,    # Only need category name
        )
        # Cache for specialists to avoid recreation
        self._specialist_cache = {}

    @start()
    def classify_query(self) -> str:
        """
        Classify the user query to determine routing.

        This is a fast, cheap LLM call that just returns a category.
        """
        # Use direct LLM call for fast classification
        prompt = CLASSIFICATION_PROMPT.format(query=self.state.user_query)

        try:
            response = self._llm.call(messages=[{"role": "user", "content": prompt}])
            category = response.strip().lower().replace('"', '').replace("'", "")

            # Validate category
            valid_categories = [e.value for e in QueryType]
            if category not in valid_categories:
                category = QueryType.GENERAL.value

            self.state.query_type = category
            return category

        except Exception:
            self.state.query_type = QueryType.GENERAL.value
            return QueryType.GENERAL.value

    @router(classify_query)
    def route_to_specialist(self, category: str) -> str:
        """Route to the appropriate specialist based on classification."""
        return category

    def _get_specialist_crew(self, service: str, capability: str) -> Crew:
        """Get or create a specialist crew for the given service/capability."""
        cache_key = f"{service}_{capability}"

        if cache_key not in self._specialist_cache:
            agent = self._factory.create_specialist(service, capability, verbose=True)

            task = Task(
                description=f"""
                Process this user request: {{user_query}}

                Use your available tools to gather the requested information.
                Provide a clear, helpful response with specific data.
                If you encounter errors, explain them clearly.
                Use blank lines between sections for readability.
                """,
                expected_output="A clear response with relevant data from the ad platform, using proper markdown formatting.",
                agent=agent,
                markdown=True,  # Enable proper markdown formatting with newlines
            )

            crew = Crew(
                agents=[agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
            )

            self._specialist_cache[cache_key] = crew

        return self._specialist_cache[cache_key]

    def _run_specialist(self, service: str, capability: str) -> str:
        """Run a specialist crew and return the result."""
        crew = self._get_specialist_crew(service, capability)
        result = crew.kickoff(inputs={"user_query": self.state.user_query})
        self.state.result = str(result.raw) if hasattr(result, 'raw') else str(result)
        return self.state.result

    # AdMob specialists
    @listen("admob_inventory")
    def handle_admob_inventory(self) -> str:
        """Handle AdMob inventory queries (accounts, apps, ad units)."""
        return self._run_specialist("admob", "inventory")

    @listen("admob_reporting")
    def handle_admob_reporting(self) -> str:
        """Handle AdMob reporting queries (revenue, eCPM, performance)."""
        return self._run_specialist("admob", "reporting")

    @listen("admob_mediation")
    def handle_admob_mediation(self) -> str:
        """Handle AdMob mediation queries (groups, ad sources)."""
        return self._run_specialist("admob", "mediation")

    @listen("admob_experimentation")
    def handle_admob_experimentation(self) -> str:
        """Handle AdMob experimentation queries (A/B tests)."""
        return self._run_specialist("admob", "experimentation")

    # Ad Manager specialists
    @listen("admanager_inventory")
    def handle_admanager_inventory(self) -> str:
        """Handle Ad Manager inventory queries (networks, ad units, placements)."""
        return self._run_specialist("admanager", "inventory")

    @listen("admanager_reporting")
    def handle_admanager_reporting(self) -> str:
        """Handle Ad Manager reporting queries."""
        return self._run_specialist("admanager", "reporting")

    @listen("admanager_orders")
    def handle_admanager_orders(self) -> str:
        """Handle Ad Manager orders queries (orders, line items)."""
        return self._run_specialist("admanager", "orders")

    @listen("admanager_deals")
    def handle_admanager_deals(self) -> str:
        """Handle Ad Manager deals queries (private auctions)."""
        return self._run_specialist("admanager", "deals")

    @listen("admanager_targeting")
    def handle_admanager_targeting(self) -> str:
        """Handle Ad Manager targeting queries (custom targeting, audiences)."""
        return self._run_specialist("admanager", "targeting")

    @listen("general")
    def handle_general(self) -> str:
        """Handle general queries - default to AdMob inventory."""
        return self._run_specialist("admob", "inventory")


def create_routing_flow(user_query: str) -> AdPlatformRoutingFlow:
    """Create a routing flow initialized with the user query."""
    flow = AdPlatformRoutingFlow()
    flow.state.user_query = user_query
    return flow


def run_query(user_query: str) -> str:
    """
    Run a user query through the routing flow.

    This is the main entry point for processing queries.

    Args:
        user_query: The user's natural language query

    Returns:
        The response from the appropriate specialist
    """
    flow = create_routing_flow(user_query)
    flow.kickoff()
    return flow.state.result
