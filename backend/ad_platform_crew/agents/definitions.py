"""
Agent Definitions for Ad Platform Crew.

This module provides two ways to create agents:
1. Legacy functions (create_config_reader_agent, etc.) - for backwards compatibility
2. Factory pattern (preferred) - see factory/agent_factory.py

The factory pattern is preferred because it:
- Loads agent definitions from YAML configuration
- Filters tools by capability (solving the "too many tools" problem)
- Supports multiple ad platforms (AdMob, Ad Manager, etc.)
"""

import sys
import os
from pathlib import Path
from crewai import Agent, LLM
from typing import Optional

from ..tools.admob_tools import get_all_tools, get_read_only_tools
from ..config.settings import settings


def _create_llm() -> LLM:
    """Create the LLM instance for agents."""
    return LLM(
        model=settings.llm.model_string,
        temperature=settings.llm.temperature,
        max_tokens=settings.llm.max_tokens,
    )


def create_config_reader_agent(llm: Optional[LLM] = None) -> Agent:
    """
    Create the Configuration Reader agent.

    This agent specializes in reading and understanding the current
    AdMob configuration including accounts, apps, ad units, and
    mediation groups.
    """
    return Agent(
        role="AdMob Configuration Specialist",
        goal=(
            "Accurately read and interpret AdMob configurations to provide "
            "a clear understanding of the current setup including accounts, "
            "apps, ad units, and their relationships"
        ),
        backstory=(
            "You are an expert AdMob configuration specialist with deep knowledge "
            "of mobile ad monetization. You excel at navigating complex AdMob setups, "
            "understanding the relationships between accounts, apps, and ad units. "
            "You always start by listing accounts to get the account ID, then "
            "systematically explore apps and ad units. You present information "
            "clearly and highlight important configuration details."
        ),
        llm=llm or _create_llm(),
        tools=get_all_tools(),
        verbose=settings.crew.verbose,
        allow_delegation=False,
        max_iter=settings.crew.max_iterations,
    )


def create_analyst_agent(llm: Optional[LLM] = None) -> Agent:
    """
    Create the Performance Analyst agent.

    This agent specializes in analyzing AdMob performance data,
    generating reports, and providing actionable insights.
    """
    return Agent(
        role="AdMob Performance Analyst",
        goal=(
            "Analyze AdMob performance data to identify trends, opportunities, "
            "and issues. Provide clear, actionable insights that help improve "
            "monetization outcomes"
        ),
        backstory=(
            "You are a seasoned ad monetization analyst with years of experience "
            "optimizing mobile app revenue. You're skilled at interpreting metrics "
            "like eCPM, fill rate, and impression data across different ad sources. "
            "You identify underperforming ad units, spot revenue opportunities, "
            "and explain complex data in simple terms. You always back up your "
            "insights with specific numbers from the reports."
        ),
        llm=llm or _create_llm(),
        tools=get_read_only_tools(),
        verbose=settings.crew.verbose,
        allow_delegation=False,
        max_iter=settings.crew.max_iterations,
    )


def create_planner_agent(llm: Optional[LLM] = None) -> Agent:
    """
    Create the Configuration Planner agent.

    This agent specializes in planning configuration changes
    to optimize AdMob setup based on analysis and goals.
    """
    return Agent(
        role="AdMob Configuration Planner",
        goal=(
            "Design optimal AdMob configurations and create detailed, safe "
            "change plans that improve monetization while minimizing risk"
        ),
        backstory=(
            "You are a strategic AdMob consultant who designs monetization "
            "configurations. You understand mediation waterfalls, floor prices, "
            "ad unit placement strategies, and platform best practices. You always "
            "create step-by-step plans that are clear and reversible. You consider "
            "the impact of changes on user experience and revenue stability. "
            "You never recommend changes without understanding the current setup first."
        ),
        llm=llm or _create_llm(),
        tools=get_all_tools(),
        verbose=settings.crew.verbose,
        allow_delegation=True,
        max_iter=settings.crew.max_iterations,
    )


def create_change_manager_agent(llm: Optional[LLM] = None) -> Agent:
    """
    Create the Change Manager agent.

    This agent specializes in validating changes, maintaining
    audit trails, and ensuring safe configuration modifications.
    """
    return Agent(
        role="AdMob Change Manager",
        goal=(
            "Ensure all configuration changes are validated, documented, and "
            "reversible. Maintain complete audit trails and prevent unsafe "
            "or destructive changes"
        ),
        backstory=(
            "You are a meticulous change management specialist focused on "
            "safety and auditability. You validate every proposed change against "
            "best practices and potential risks. You create detailed change records "
            "with before/after snapshots. You always verify that changes can be "
            "rolled back and warn about any potentially destructive operations. "
            "You require explicit approval before any write operations."
        ),
        llm=llm or _create_llm(),
        tools=get_all_tools(),
        verbose=settings.crew.verbose,
        allow_delegation=True,
        max_iter=settings.crew.max_iterations,
    )


def create_all_agents(llm: Optional[LLM] = None) -> dict[str, Agent]:
    """
    Create all agents with a shared LLM instance.

    Note: For the new factory-based approach with YAML configuration,
    use factory.agent_factory.get_factory().create_agent() instead.

    Returns:
        Dictionary mapping agent names to Agent instances
    """
    shared_llm = llm or _create_llm()

    return {
        "config_reader": create_config_reader_agent(shared_llm),
        "analyst": create_analyst_agent(shared_llm),
        "planner": create_planner_agent(shared_llm),
        "change_manager": create_change_manager_agent(shared_llm),
    }
