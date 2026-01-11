"""CrewAI crew builder for ad platform queries."""

import os
from typing import Optional

from crewai import Agent, Crew, Process, Task, LLM

from ad_platform_crew.factory.agent_factory import get_factory
from ad_platform_crew.config.settings import settings


def get_crew_for_query(
    user_query: str,
    service: str,
    capability: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    conversation_history: Optional[list] = None,
    selected_model: Optional[str] = None,
) -> Crew:
    """Create a crew with streaming enabled for the specified service/capability.

    Args:
        user_query: The current user message
        service: Target service (admob, admanager, general)
        capability: Target capability (inventory, reporting, etc.)
        user_id: User ID for OAuth tokens
        organization_id: Organization ID for org-scoped operations
        conversation_history: Previous conversation for context
        selected_model: LLM model to use (e.g., "anthropic/claude-sonnet-4-20250514" or "openrouter/google/gemini-2.5-flash-lite")

    Returns:
        Configured Crew ready for streaming execution
    """
    # Pass user_id and organization_id to factory for OAuth tokens
    if user_id:
        os.environ["CURRENT_USER_ID"] = user_id
    if organization_id:
        os.environ["CURRENT_ORGANIZATION_ID"] = organization_id
    else:
        os.environ.pop("CURRENT_ORGANIZATION_ID", None)  # Clear if not set (personal scope)

    # Build conversation context string for task description
    conversation_context = _build_conversation_context(conversation_history)

    # Create LLM instance based on selected model
    llm = _create_llm_from_selection(selected_model)

    # Handle general queries with a simple response
    if service == "general":
        return _build_general_crew(user_query, conversation_context, llm)

    # Create the appropriate specialist crew
    return _build_specialist_crew(
        user_query=user_query,
        service=service,
        capability=capability,
        conversation_context=conversation_context,
        llm=llm,
    )


def _create_llm_from_selection(selected_model: Optional[str]) -> LLM:
    """Create an LLM instance based on user's model selection.

    Args:
        selected_model: Model string from frontend (e.g., "anthropic/claude-sonnet-4-20250514"
                       or "openrouter/google/gemini-2.5-flash-lite")

    Returns:
        Configured LLM instance
    """
    # If no model selected, use default from settings
    if not selected_model:
        llm_kwargs = {
            "model": settings.llm.model_string,
            "temperature": settings.llm.temperature,
            "max_tokens": settings.llm.max_tokens,
        }
        if settings.llm.is_openrouter:
            if settings.llm.base_url:
                llm_kwargs["base_url"] = settings.llm.base_url
            if settings.llm.api_key:
                llm_kwargs["api_key"] = settings.llm.api_key
        return LLM(**llm_kwargs)

    # Parse selected model to determine provider
    # Format: "provider/model" or "openrouter/provider/model"
    if selected_model.startswith("openrouter/"):
        # OpenRouter model: "openrouter/google/gemini-2.5-flash-lite"
        model_path = selected_model[len("openrouter/"):]  # "google/gemini-2.5-flash-lite"
        return LLM(
            model=f"openrouter/{model_path}",
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
    elif selected_model.startswith("anthropic/"):
        # Anthropic model: "anthropic/claude-sonnet-4-20250514"
        return LLM(
            model=selected_model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
        )
    else:
        # Unknown format, try as-is
        return LLM(
            model=selected_model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
        )


def _build_conversation_context(conversation_history: Optional[list]) -> str:
    """Build conversation context string from history."""
    if not conversation_history:
        return ""

    recent = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
    context_parts = []

    for msg in recent:
        role = msg.get("role", "user").title()
        content = msg.get("content", "")[:300]  # Truncate long messages
        context_parts.append(f"{role}: {content}")

    return "\n".join(context_parts)


def _build_general_crew(user_query: str, conversation_context: str, llm: LLM) -> Crew:
    """Build a crew for general queries."""
    general_agent = Agent(
        role="General Assistant",
        goal="Help users with questions about AdMob and Google Ad Manager",
        backstory="You are a helpful assistant that can answer general questions about ad monetization platforms.",
        verbose=False,
        llm=llm,
    )

    task_description = f"Answer this question: {user_query}"
    if conversation_context:
        task_description = f"""Previous conversation for context:
{conversation_context}

Current question: {user_query}

Use the conversation context to provide relevant follow-up answers."""

    task = Task(
        description=task_description,
        expected_output="A helpful response to the user's question.",
        agent=general_agent,
    )

    return Crew(
        agents=[general_agent],
        tasks=[task],
        process=Process.sequential,
        stream=True,
        verbose=False,
    )


def _build_specialist_crew(
    user_query: str,
    service: str,
    capability: str,
    conversation_context: str,
    llm: LLM,
) -> Crew:
    """Build a crew with specialized agent for ad platform queries."""
    factory = get_factory()

    # Create the appropriate specialist with custom LLM
    specialist = factory.create_specialist(service, capability, verbose=False, llm=llm)

    # Create task with service-specific instructions
    instructions = _get_service_instructions(service)

    # Build context section
    context_section = ""
    if conversation_context:
        context_section = f"""
        ## Previous Conversation (for context)
        {conversation_context}

        Use this context to understand follow-up questions and maintain continuity.
        """

    process_task = Task(
        description=f"""
        {context_section}

        ## Current User Request
        {user_query}

        {instructions}

        Provide a clear, actionable response with the data.
        If you encounter errors, explain them clearly.
        Reference previous context when relevant (e.g., if user says "that app" or "the same account").
        """,
        expected_output="A clear response with relevant data from the ad platform.",
        agent=specialist,
    )

    # Configure memory
    memory_config = None
    if settings.crew.memory.enabled:
        memory_config = {
            "short_term": settings.crew.memory.short_term,
            "long_term": settings.crew.memory.long_term,
            "entity": settings.crew.memory.entity,
        }

    return Crew(
        agents=[specialist],
        tasks=[process_task],
        process=Process.sequential,
        stream=True,
        verbose=False,
        chat_llm=settings.crew.chat_llm,
        memory=settings.crew.memory.enabled,
        memory_config=memory_config,
        cache=settings.crew.cache,
    )


def _get_service_instructions(service: str) -> str:
    """Get service-specific instructions for the task."""
    if service == "admob":
        return """
        Instructions for AdMob:
        1. Use "List AdMob Accounts" to get available accounts first
        2. Use the account_id from step 1 for subsequent calls
        3. For apps: use "List AdMob Apps" with the account_id
        4. For ad units: use "List AdMob Ad Units" with the account_id
        5. For reports: use the appropriate report generation tool
        """
    else:  # admanager
        return """
        Instructions for Ad Manager:
        1. Use "List Ad Manager Networks" to get network codes first
        2. Use the network_code from step 1 for subsequent calls
        3. For ad units: use "List Ad Manager Ad Units"
        4. For reports: use the report tools
        """
