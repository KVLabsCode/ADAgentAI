"""
Task Definitions for AdMob Crew.

Defines reusable tasks for common AdMob operations:
- Setup inspection
- Performance analysis
- Change planning
- Change validation
"""

from crewai import Task, Agent
from typing import Optional
from pydantic import BaseModel


class SetupSummary(BaseModel):
    """Structured output for setup inspection."""

    account_id: str
    account_name: str
    currency: str
    timezone: str
    total_apps: int
    total_ad_units: int
    apps_summary: list[dict]
    ad_units_by_format: dict[str, int]


class PerformanceInsights(BaseModel):
    """Structured output for performance analysis."""

    period: str
    total_revenue: float
    total_impressions: int
    average_ecpm: float
    top_performing_ad_units: list[dict]
    underperforming_ad_units: list[dict]
    recommendations: list[str]


class ChangePlan(BaseModel):
    """Structured output for change planning."""

    objective: str
    current_state: dict
    proposed_changes: list[dict]
    expected_impact: str
    risks: list[str]
    rollback_steps: list[str]


def create_inspect_setup_task(
    agent: Agent,
    account_id: Optional[str] = None,
    context: Optional[list[Task]] = None,
) -> Task:
    """
    Create a task to inspect the current AdMob setup.

    Args:
        agent: The agent to perform this task
        account_id: Optional specific account ID to inspect
        context: Optional list of dependent tasks

    Returns:
        Task configured for setup inspection
    """
    description = """
    Inspect the complete AdMob setup and provide a comprehensive summary.

    Steps:
    1. List all available AdMob accounts
    2. For {account_context}, retrieve detailed account information
    3. List all apps registered under the account
    4. List all ad units and their configurations
    5. Summarize the findings in a clear, organized format

    Focus on:
    - Account details (currency, timezone)
    - Number and types of apps (iOS/Android)
    - Ad unit formats and their distribution
    - Any configuration issues or warnings
    """.format(
        account_context=f"account {account_id}" if account_id else "each account"
    )

    return Task(
        description=description,
        expected_output=(
            "A comprehensive summary of the AdMob setup including:\n"
            "- Account information\n"
            "- List of apps with their platforms and approval states\n"
            "- Ad units grouped by format type\n"
            "- Any notable configurations or potential issues"
        ),
        agent=agent,
        context=context,
    )


def create_analyze_performance_task(
    agent: Agent,
    account_id: str,
    days_back: int = 7,
    focus_area: Optional[str] = None,
    context: Optional[list[Task]] = None,
) -> Task:
    """
    Create a task to analyze AdMob performance.

    Args:
        agent: The agent to perform this task
        account_id: The account ID to analyze
        days_back: Number of days to analyze
        focus_area: Optional specific area to focus on
        context: Optional list of dependent tasks

    Returns:
        Task configured for performance analysis
    """
    focus_instruction = ""
    if focus_area:
        focus_instruction = f"\n\nSpecifically focus on: {focus_area}"

    description = f"""
    Analyze AdMob performance for account {account_id} over the last {days_back} days.

    Steps:
    1. Generate a network report to understand overall performance
    2. Generate a mediation report to analyze ad source performance
    3. Identify trends in revenue, impressions, and eCPM
    4. Find top and bottom performing ad units
    5. Provide actionable recommendations
    {focus_instruction}

    Key metrics to analyze:
    - ESTIMATED_EARNINGS (revenue)
    - IMPRESSIONS (ad views)
    - OBSERVED_ECPM or IMPRESSION_RPM (revenue per 1000 impressions)
    - MATCH_RATE (fill rate)
    """

    return Task(
        description=description,
        expected_output=(
            "A performance analysis report including:\n"
            "- Revenue summary with trends\n"
            "- Top 5 performing ad units/sources\n"
            "- Bottom 5 performing ad units/sources\n"
            "- Key insights and patterns\n"
            "- 3-5 actionable recommendations"
        ),
        agent=agent,
        context=context,
    )


def create_plan_changes_task(
    agent: Agent,
    objective: str,
    account_id: str,
    context: Optional[list[Task]] = None,
) -> Task:
    """
    Create a task to plan configuration changes.

    Args:
        agent: The agent to perform this task
        objective: What the user wants to achieve
        account_id: The account ID to plan changes for
        context: Optional list of dependent tasks

    Returns:
        Task configured for change planning
    """
    description = f"""
    Create a detailed plan to achieve the following objective for account {account_id}:

    OBJECTIVE: {objective}

    Steps:
    1. Review the current configuration state
    2. Identify what needs to change to meet the objective
    3. Design specific configuration changes
    4. Assess potential risks and impacts
    5. Create rollback instructions

    Requirements:
    - All changes must be specific and actionable
    - Include before/after states where applicable
    - Estimate the impact on revenue/performance
    - Ensure changes are reversible
    """

    return Task(
        description=description,
        expected_output=(
            "A detailed change plan including:\n"
            "- Current state summary\n"
            "- List of specific changes with parameters\n"
            "- Expected impact on metrics\n"
            "- Risk assessment\n"
            "- Step-by-step rollback instructions"
        ),
        agent=agent,
        context=context,
    )


def create_validate_changes_task(
    agent: Agent,
    change_plan: str,
    context: Optional[list[Task]] = None,
) -> Task:
    """
    Create a task to validate proposed changes.

    Args:
        agent: The agent to perform this task
        change_plan: The proposed changes to validate
        context: Optional list of dependent tasks

    Returns:
        Task configured for change validation
    """
    description = f"""
    Validate the following proposed changes and ensure they are safe to apply:

    PROPOSED CHANGES:
    {change_plan}

    Validation checklist:
    1. Verify all referenced resources exist (accounts, apps, ad units)
    2. Check for conflicts with existing configuration
    3. Assess risk level (low/medium/high)
    4. Confirm rollback steps are complete
    5. Identify any missing information

    Provide a clear GO/NO-GO recommendation with reasoning.
    """

    return Task(
        description=description,
        expected_output=(
            "A validation report including:\n"
            "- Validation status for each proposed change\n"
            "- Risk assessment (LOW/MEDIUM/HIGH)\n"
            "- Any issues or concerns found\n"
            "- GO/NO-GO recommendation with reasoning\n"
            "- Required approvals if applicable"
        ),
        agent=agent,
        context=context,
    )


class TaskFactory:
    """
    Factory for creating common task combinations.

    Provides convenient methods for creating task workflows.
    """

    def __init__(self, agents: dict[str, Agent]):
        """
        Initialize the factory with agents.

        Args:
            agents: Dictionary mapping agent names to Agent instances
        """
        self.agents = agents

    def create_full_inspection_workflow(
        self, account_id: Optional[str] = None
    ) -> list[Task]:
        """Create tasks for a complete setup inspection."""
        inspect_task = create_inspect_setup_task(
            agent=self.agents["config_reader"],
            account_id=account_id,
        )
        return [inspect_task]

    def create_performance_review_workflow(
        self, account_id: str, days_back: int = 7
    ) -> list[Task]:
        """Create tasks for performance analysis with context."""
        inspect_task = create_inspect_setup_task(
            agent=self.agents["config_reader"],
            account_id=account_id,
        )

        analyze_task = create_analyze_performance_task(
            agent=self.agents["analyst"],
            account_id=account_id,
            days_back=days_back,
            context=[inspect_task],
        )

        return [inspect_task, analyze_task]

    def create_change_workflow(
        self, account_id: str, objective: str
    ) -> list[Task]:
        """Create tasks for planning and validating changes."""
        inspect_task = create_inspect_setup_task(
            agent=self.agents["config_reader"],
            account_id=account_id,
        )

        plan_task = create_plan_changes_task(
            agent=self.agents["planner"],
            objective=objective,
            account_id=account_id,
            context=[inspect_task],
        )

        # Note: validate_task needs the plan output, handled in crew execution
        return [inspect_task, plan_task]
