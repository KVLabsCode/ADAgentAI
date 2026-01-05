"""
FastAPI Streaming Chat Server for Ad Platform Crew.

Uses CrewAI async streaming with step callbacks to capture agent steps,
tool calls, and outputs in real-time. Streams updates via Server-Sent Events (SSE).

Supports multiple ad platforms:
- AdMob (mobile app monetization)
- Google Ad Manager (web/app inventory)
"""

import os
import sys
import re
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from API .env file (contains INTERNAL_API_KEY, etc.)
api_env_path = Path(__file__).parent / "api" / ".env"
if api_env_path.exists():
    load_dotenv(api_env_path)
from enum import Enum
from typing import Optional, AsyncGenerator, Any
from contextlib import asynccontextmanager
from dataclasses import dataclass, field

from fastapi import FastAPI, Query, HTTPException, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import httpx

# Set environment before imports
os.environ.setdefault("MODEL", "anthropic/claude-sonnet-4-20250514")

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from ad_platform_crew.factory.agent_factory import get_factory
from ad_platform_crew.config.settings import settings
from crewai import Crew, Process, Task, LLM
from crewai.types.streaming import StreamChunkType
from crewai.hooks import before_tool_call, after_tool_call


# =============================================================================
# Pydantic Models for Structured Events
# =============================================================================

class EventType(str, Enum):
    ROUTING = "routing"
    AGENT = "agent"
    THOUGHT = "thought"
    TOOL = "tool"
    TOOL_RESULT = "tool_result"
    RESULT = "result"
    ERROR = "error"
    DONE = "done"


class RoutingEvent(BaseModel):
    type: str = EventType.ROUTING
    service: str
    capability: str


class AgentEvent(BaseModel):
    type: str = EventType.AGENT
    agent: str
    task: str


class ThoughtEvent(BaseModel):
    type: str = EventType.THOUGHT
    content: str


class ToolCallEvent(BaseModel):
    type: str = EventType.TOOL
    tool: str
    input_preview: str
    input_full: Optional[str] = None
    is_truncated: bool = False


class ToolResultEvent(BaseModel):
    type: str = EventType.TOOL_RESULT
    preview: str
    full: Optional[str] = None
    data_type: str = "text"
    item_count: Optional[int] = None
    is_truncated: bool = False


class ResultEvent(BaseModel):
    type: str = EventType.RESULT
    content: str


class ErrorEvent(BaseModel):
    type: str = EventType.ERROR
    content: str


class DoneEvent(BaseModel):
    type: str = EventType.DONE


# =============================================================================
# Chat Request Models (defined early for use in function signatures)
# =============================================================================

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str  # "user" or "assistant"
    content: str


class ChatContext(BaseModel):
    """User's chat context settings."""
    enabledProviderIds: list[str] = []  # Empty means all enabled
    responseStyle: str = "concise"  # "concise" or "detailed"
    autoIncludeContext: bool = True


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str
    history: list[ChatMessage] = []
    user_id: Optional[str] = None
    context: Optional[ChatContext] = None


# =============================================================================
# User Authentication
# =============================================================================

API_URL = os.environ.get("API_URL", "http://localhost:3001")


async def get_user_providers(user_id: str) -> list[dict]:
    """
    Fetch connected providers for a user from the main API.

    Returns list of provider dicts with 'type', 'name', 'identifier' (account ID).
    """
    if not user_id:
        return []

    try:
        # Use internal API key for server-to-server call
        internal_api_key = os.environ.get("INTERNAL_API_KEY", "")
        if not internal_api_key:
            print("  Warning: INTERNAL_API_KEY not set, cannot fetch providers")
            return []

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/list",
                params={"userId": user_id},
                headers={"x-internal-api-key": internal_api_key},
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("providers", [])
            else:
                print(f"  Provider fetch failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"  Error fetching providers: {e}")
        return []


async def get_current_user(request: Request) -> Optional[dict]:
    """
    Validate session and get current user from the main API.

    Forwards cookies to the API to validate the Better Auth session.
    Returns user dict with 'id' if authenticated, None otherwise.
    """
    # Get all cookies from the request
    cookies = request.cookies

    if not cookies:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Call the main API's session endpoint
            response = await client.get(
                f"{API_URL}/api/auth/get-session",
                cookies=cookies,
            )

            if response.status_code == 200:
                data = response.json()
                # Better Auth returns { session: {...}, user: {...} }
                if data and data.get("user"):
                    return data["user"]
            return None
    except Exception as e:
        print(f"Auth validation error: {e}")
        return None


# =============================================================================
# Query Classification / Routing
# =============================================================================

CLASSIFICATION_PROMPT = """Classify this user query into ONE category.

Categories:
- general: Greetings, help requests, capability questions, or unclear queries
- admob_inventory: AdMob accounts, apps, ad units (list, create, view setup)
- admob_reporting: AdMob performance, revenue, eCPM, reports, analytics
- admob_mediation: AdMob mediation groups, ad sources, waterfall, networks
- admob_experimentation: AdMob A/B tests, experiments
- admanager_inventory: Ad Manager networks, ad units, placements, sites
- admanager_reporting: Ad Manager reports, analytics, performance
- admanager_orders: Ad Manager orders, line items, campaigns
- admanager_deals: Ad Manager private auctions, deals, programmatic
- admanager_targeting: Ad Manager custom targeting, audiences, geo targeting

Query: {query}

Respond with ONLY the category name, nothing else."""

ROUTE_MAP = {
    "general": ("general", "assistant"),
    "admob_inventory": ("admob", "inventory"),
    "admob_reporting": ("admob", "reporting"),
    "admob_mediation": ("admob", "mediation"),
    "admob_experimentation": ("admob", "experimentation"),
    "admanager_inventory": ("admanager", "inventory"),
    "admanager_reporting": ("admanager", "reporting"),
    "admanager_orders": ("admanager", "orders"),
    "admanager_deals": ("admanager", "deals"),
    "admanager_targeting": ("admanager", "targeting"),
}

# Cached router LLM
_router_llm: Optional[LLM] = None


def get_router_llm() -> LLM:
    """Get the lightweight LLM for query classification."""
    global _router_llm
    if _router_llm is None:
        _router_llm = LLM(
            model=settings.llm.model_string,
            temperature=0.0,
            max_tokens=50,
        )
    return _router_llm


async def classify_query(user_query: str) -> tuple[str, str]:
    """
    Classify a user query to determine routing.

    Returns:
        Tuple of (service, capability) for the specialist.
    """
    llm = get_router_llm()
    prompt = CLASSIFICATION_PROMPT.format(query=user_query)

    try:
        # Run in executor since LLM.call is sync
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: llm.call(messages=[{"role": "user", "content": prompt}])
        )
        category = response.strip().lower().replace('"', '').replace("'", "")

        if category in ROUTE_MAP:
            return ROUTE_MAP[category]
        print(f"Unknown category '{category}', defaulting to general")
        return ("general", "assistant")
    except Exception as e:
        print(f"Classification error: {e}, defaulting to general")
        return ("general", "assistant")


# =============================================================================
# Response Parsing Utilities
# =============================================================================

@dataclass
class ParsedToolResult:
    """Structured tool result with smart truncation."""
    preview: str
    full: Optional[str]
    data_type: str
    item_count: Optional[int]
    is_truncated: bool


def parse_tool_result(result_str: str) -> ParsedToolResult:
    """Parse tool result with structured output."""
    try:
        result_data = json.loads(result_str)
        full_json = json.dumps(result_data, indent=2)

        if isinstance(result_data, list):
            # For lists, show first 3 items as preview
            preview = json.dumps(result_data[:3], indent=2)
            return ParsedToolResult(
                preview=preview,
                full=full_json if len(result_data) > 3 else None,
                data_type="json_list",
                item_count=len(result_data),
                is_truncated=len(result_data) > 3
            )
        elif isinstance(result_data, dict):
            preview = json.dumps(result_data, indent=2)[:500]
            return ParsedToolResult(
                preview=preview,
                full=full_json if len(full_json) > 500 else None,
                data_type="json",
                item_count=None,
                is_truncated=len(full_json) > 500
            )
        else:
            return ParsedToolResult(
                preview=full_json,
                full=None,
                data_type="json",
                item_count=None,
                is_truncated=False
            )
    except (json.JSONDecodeError, TypeError):
        is_truncated = len(result_str) > 300
        return ParsedToolResult(
            preview=result_str[:300] if is_truncated else result_str,
            full=result_str if is_truncated else None,
            data_type="text",
            item_count=None,
            is_truncated=is_truncated
        )


def extract_thought_content(text: str) -> Optional[str]:
    """
    Extract meaningful thought content from agent output.

    Filters out protocol keywords (Action:, Observation:, etc.)
    and returns clean thinking content.
    """
    if not text or len(text) < 15:
        return None

    thought = text

    # If there's an Observation, start after it
    if 'Observation:' in thought:
        thought = thought.split('Observation:')[-1]

    # Remove "Thought:" prefix if present
    if 'Thought:' in thought:
        thought = thought.split('Thought:', 1)[1]

    # Stop at any protocol keyword
    for keyword in ['Action:', 'Action Input:', 'Observation:', 'Final Answer:']:
        if keyword in thought:
            thought = thought.split(keyword, 1)[0]

    thought = thought.strip().lstrip('!').strip()

    # Clean up JSON remnants - find where actual sentence starts
    match = re.search(r'[A-Z][a-z]', thought)
    if match:
        thought = thought[match.start():].strip()

    # Filter out filler content
    filler_words = {'now', 'next', 'then', 'ok', 'okay', 'done', 'good', 'great', 'i',
                    'action', 'observation', 'thought', 'final answer', 'action input'}
    if thought.lower().strip() in filler_words:
        return None

    return thought if len(thought) > 15 else None


# =============================================================================
# Tool Event Queue (Thread-safe async queue)
# =============================================================================

@dataclass
class ToolEventCollector:
    """Collects tool events from hooks for streaming."""
    events: list = field(default_factory=list)

    def add_event(self, event: dict):
        self.events.append(event)

    def get_events(self) -> list:
        events = self.events.copy()
        self.events.clear()
        return events


# Global collector for the current request
_current_collector: Optional[ToolEventCollector] = None


@before_tool_call
def capture_tool_call(context):
    """Capture tool call from CrewAI hook."""
    global _current_collector
    if _current_collector is None:
        return None

    tool_name = context.tool_name
    tool_input = str(context.tool_input) if context.tool_input else ""
    is_truncated = len(tool_input) > 200

    event = ToolCallEvent(
        tool=tool_name,
        input_preview=tool_input[:200],
        input_full=tool_input if is_truncated else None,
        is_truncated=is_truncated
    )
    _current_collector.add_event(event.model_dump())
    return None


@after_tool_call
def capture_tool_result(context):
    """Capture tool result from CrewAI hook."""
    global _current_collector
    if _current_collector is None or not context.tool_result:
        return None

    parsed = parse_tool_result(context.tool_result)
    event = ToolResultEvent(
        preview=parsed.preview,
        full=parsed.full,
        data_type=parsed.data_type,
        item_count=parsed.item_count,
        is_truncated=parsed.is_truncated
    )
    _current_collector.add_event(event.model_dump())
    return None


# =============================================================================
# Crew Creation
# =============================================================================

def build_kickoff_inputs(
    user_query: str,
    providers: Optional[list[dict]] = None,
    history: Optional[list] = None,
    context: Optional[ChatContext] = None
) -> dict:
    """
    Build kickoff inputs dict for crew execution.

    This follows CrewAI best practice of passing context via kickoff inputs
    with variable interpolation in task descriptions.
    """
    inputs = {"user_query": user_query}

    # Build conversation history context (last 6 messages max)
    if history:
        recent_history = history[-6:]
        history_lines = []
        for msg in recent_history:
            if hasattr(msg, "role"):
                role, content = msg.role, msg.content
            else:
                role = msg.get("role", "user")
                content = msg.get("content", "")
            if len(content) > 500:
                content = content[:500] + "..."
            history_lines.append(f"{role.upper()}: {content}")
        inputs["history_context"] = "\n\nConversation history:\n" + "\n".join(history_lines)
    else:
        inputs["history_context"] = ""

    # Build provider context
    provider_lines = []
    admob_account_id = ""
    gam_network_code = ""

    if providers:
        admob_accounts = [p for p in providers if p.get("type") == "admob"]
        gam_accounts = [p for p in providers if p.get("type") == "gam"]

        if admob_accounts:
            admob_info = ", ".join([f"{p.get('name', 'Account')} (ID: {p.get('identifier', 'unknown')})" for p in admob_accounts])
            provider_lines.append(f"User's SELECTED AdMob accounts: {admob_info}")
            provider_lines.append("(These accounts are already known - do NOT list or enumerate them.)")
            admob_account_id = admob_accounts[0].get("identifier", "")

        if gam_accounts:
            gam_info = ", ".join([f"{p.get('name', 'Network')} (network code: {p.get('identifier', 'unknown')})" for p in gam_accounts])
            provider_lines.append(f"User's SELECTED Ad Manager networks: {gam_info}")
            provider_lines.append("(These networks are already known - do NOT list or enumerate them.)")
            gam_network_code = gam_accounts[0].get("identifier", "")

    inputs["provider_context"] = "\n".join(provider_lines) if provider_lines else ""
    inputs["admob_account_id"] = admob_account_id
    inputs["gam_network_code"] = gam_network_code

    # Response style from user context
    response_style = context.responseStyle if context else "concise"

    if response_style == "detailed":
        inputs["style_instructions"] = """
        RESPONSE STYLE (User prefers DETAILED):
        - Provide comprehensive explanations with context
        - Include relevant background information
        - Explain metrics and what they mean
        - Use headers to organize longer responses
        - Provide actionable insights and recommendations
        """
    else:
        inputs["style_instructions"] = """
        RESPONSE STYLE (User prefers CONCISE):
        - Be DIRECT - answer the specific question first
        - Be BRIEF - no unnecessary explanations
        - Use bullet points for lists of data
        - For metrics, show key numbers only
        - NO caveats or disclaimers unless critical
        """

    return inputs


def create_crew_for_query(
    service: str,
    capability: str,
    user_id: Optional[str] = None,
    providers: Optional[list[dict]] = None,
) -> Crew:
    """
    Create a streaming crew routed to the appropriate specialist.

    Uses variable interpolation ({variable}) in task descriptions.
    Pass context via kickoff(inputs=build_kickoff_inputs(...)).
    """
    factory = get_factory()

    # Pass user_id to factory so tools can fetch user-specific tokens
    if user_id:
        os.environ["CURRENT_USER_ID"] = user_id

    specialist = factory.create_specialist(service, capability, verbose=False)

    # Service-specific instructions using variable interpolation
    if service == "general":
        service_instructions = """
        You are a helpful ad platform assistant. Respond naturally and directly.
        For greetings, respond briefly and offer to help with AdMob or Ad Manager.
        For capability questions, briefly list what you can do.
        Keep responses short and friendly.
        """
    elif service == "admob":
        service_instructions = """
        Instructions for AdMob:
        - If account ID is provided below, use it directly (do NOT call list_accounts)
        - If no account ID provided, call list_accounts ONCE to get it
        - Choose the RIGHT dimension for the query:
          * "top ad units" or "ad unit performance" → AD_UNIT dimension
          * "top apps" or "app performance" → APP dimension
          * "by date" or "trends" → DATE dimension
          * "ad formats" (banner/interstitial) → FORMAT dimension
        - Metrics: ESTIMATED_EARNINGS, IMPRESSIONS, IMPRESSION_RPM, CLICKS
        - Make ONE report call with correct dimensions - don't retry

        Account ID to use: {admob_account_id}
        """
    else:
        service_instructions = """
        Instructions for Ad Manager:
        - If network code is provided below, use it directly (do NOT call list_networks)
        - If no network code provided, call list_networks ONCE to get it
        - For reports/analytics: directly use report tools
        - For ad units/placements: use list tools directly
        - Go straight to answering the question

        Network code to use: {gam_network_code}
        """

    # Task with variable placeholders - values passed via kickoff(inputs={...})
    task = Task(
        description="""
        User request: {user_query}
        {history_context}

        {provider_context}

        """ + service_instructions + """

        {style_instructions}

        IMPORTANT:
        - Do NOT list accounts/networks when they are already provided above
        - Use the provided account/network IDs directly without verification
        - If referring to previous conversation, be contextual
        - Use blank lines between sections for readability
        """,
        expected_output="A direct answer to the user's question with proper markdown formatting.",
        agent=specialist,
        markdown=True,
    )

    return Crew(
        agents=[specialist],
        tasks=[task],
        process=Process.sequential,
        stream=True,
        verbose=False,
        chat_llm=settings.crew.chat_llm,
        memory=settings.crew.memory,
        cache=settings.crew.cache,
    )


# =============================================================================
# SSE Streaming Generator
# =============================================================================

def format_sse(data: dict) -> str:
    """Format data as SSE event."""
    return f"data: {json.dumps(data)}\n\n"


async def stream_crew_response(
    user_message: str,
    user_id: Optional[str] = None,
    history: Optional[list] = None,
    context: Optional[ChatContext] = None
) -> AsyncGenerator[str, None]:
    """
    Async generator for streaming crew responses as SSE events.

    Args:
        user_message: The user's chat message
        user_id: Optional user ID for fetching user-specific OAuth tokens
        history: Optional list of previous messages for context
        context: Optional chat context with enabled providers and settings

    Yields:
        SSE-formatted strings with event data
    """
    global _current_collector
    history = history or []

    try:
        # Fetch user's connected providers
        all_providers = await get_user_providers(user_id) if user_id else []

        # Filter providers based on user's context settings
        if context and context.enabledProviderIds:
            providers = [p for p in all_providers if p.get("id") in context.enabledProviderIds]
        else:
            providers = all_providers  # If no filter, use all

        if providers:
            print(f"  User has {len(providers)} active provider(s) (of {len(all_providers)} total)")

        # Classify and route query
        service, capability = await classify_query(user_message)
        print(f"  Routed to: {service}/{capability} (user: {user_id or 'anonymous'})")

        yield format_sse(RoutingEvent(service=service, capability=capability).model_dump())

        # Set up event collector for tool calls
        _current_collector = ToolEventCollector()

        # Create crew (uses variable interpolation in task description)
        crew = create_crew_for_query(
            service, capability,
            user_id=user_id, providers=providers
        )

        # Build kickoff inputs with all context (CrewAI best practice)
        kickoff_inputs = build_kickoff_inputs(
            user_message, providers=providers, history=history, context=context
        )

        # Start async streaming with inputs for variable interpolation
        streaming = await crew.kickoff_async(inputs=kickoff_inputs)

        current_agent = ""
        current_task = ""
        text_buffer: list[str] = []
        seen_final_answer = False

        # Async iteration over streaming chunks
        async for chunk in streaming:
            # Yield any collected tool events
            if _current_collector:
                for event in _current_collector.get_events():
                    yield format_sse(event)

            # Agent/task transitions
            if chunk.agent_role != current_agent or chunk.task_name != current_task:
                current_agent = chunk.agent_role
                current_task = chunk.task_name
                yield format_sse(AgentEvent(agent=current_agent, task=current_task).model_dump())

            # Handle TEXT chunks
            if chunk.chunk_type == StreamChunkType.TEXT and chunk.content:
                if seen_final_answer:
                    continue

                text_buffer.append(chunk.content)
                full_text = ''.join(text_buffer)

                # Check for protocol boundaries
                has_action = 'Action:' in full_text and 'Action Input:' in full_text
                has_final = 'Final Answer:' in full_text
                has_observation = 'Observation:' in full_text
                should_process = has_action or has_final or has_observation or len(full_text) > 500

                if should_process:
                    thought = extract_thought_content(full_text)
                    if thought:
                        yield format_sse(ThoughtEvent(content=thought).model_dump())

                    if has_final:
                        seen_final_answer = True

                    text_buffer.clear()

            # Handle TOOL_CALL chunks (backup if hooks don't fire)
            elif chunk.chunk_type == StreamChunkType.TOOL_CALL and chunk.tool_call:
                tool_input = json.dumps(chunk.tool_call.arguments, indent=2) if chunk.tool_call.arguments else ""
                is_truncated = len(tool_input) > 200

                event = ToolCallEvent(
                    tool=chunk.tool_call.tool_name,
                    input_preview=tool_input[:200],
                    input_full=tool_input if is_truncated else None,
                    is_truncated=is_truncated
                )
                yield format_sse(event.model_dump())

        # Flush remaining buffer
        if text_buffer and not seen_final_answer:
            full_text = ''.join(text_buffer)
            thought = extract_thought_content(full_text)
            if thought:
                yield format_sse(ThoughtEvent(content=thought).model_dump())

        # Final result
        result = streaming.result
        if result and result.raw:
            yield format_sse(ResultEvent(content=str(result.raw)).model_dump())

    except Exception as e:
        import traceback
        traceback.print_exc()
        yield format_sse(ErrorEvent(content=str(e)).model_dump())

    finally:
        _current_collector = None
        yield format_sse(DoneEvent().model_dump())


# =============================================================================
# FastAPI Application
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("\n  Starting Ad Platform Crew API...")
    yield
    print("\n  Shutting down...")


app = FastAPI(
    title="Ad Platform Crew API",
    description="AI-powered ad monetization assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - must specify origins when allowing credentials
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Build allowed origins list
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3002",  # Alternative Next.js port
    "https://adagentai.com",
    "https://www.adagentai.com",
]

# Add Vercel preview URL pattern if configured
VERCEL_PROJECT = os.environ.get("VERCEL_PROJECT_NAME", "adagent-ai")
if VERCEL_PROJECT:
    # Vercel preview URLs follow pattern: project-name-*.vercel.app
    ALLOWED_ORIGINS.append(f"https://{VERCEL_PROJECT}.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://adagent-ai.*\.vercel\.app",  # Match all preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Ad Platform Crew API",
        "version": "1.0.0",
        "endpoints": {
            "/chat/stream": "Stream chat responses (SSE)",
            "/health": "Health check"
        }
    }


@app.get("/")
@app.head("/")
async def root():
    """Root endpoint for health checks."""
    return {"status": "ok", "service": "ad-platform-agent"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/chat/stream")
async def chat_stream_get(
    request: Request,
    message: str = Query(..., description="User message"),
    user_id: Optional[str] = Query(None, description="User ID for OAuth token lookup"),
):
    """GET endpoint for simple requests without history."""
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not user_id:
        user = await get_current_user(request)
        user_id = user.get("id") if user else None

    print(f"  Chat request (GET) from user: {user_id or 'anonymous'}")

    return StreamingResponse(
        stream_crew_response(message, user_id=user_id, history=[]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/chat/stream")
async def chat_stream_post(
    request: Request,
    body: ChatRequest,
):
    """
    POST endpoint for chat with conversation history.

    Streams responses using Server-Sent Events.
    Includes conversation history for context continuity.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = body.user_id
    if not user_id:
        user = await get_current_user(request)
        user_id = user.get("id") if user else None

    print(f"  Chat request (POST) from user: {user_id or 'anonymous'}, history: {len(body.history)} messages")

    return StreamingResponse(
        stream_crew_response(body.message, user_id=user_id, history=body.history, context=body.context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    # Use AGENT_PORT to avoid conflict with API's PORT variable
    port = int(os.environ.get("AGENT_PORT", 5000))
    print(f"\n  Ad Platform Crew API -> http://localhost:{port}\n")

    uvicorn.run(
        "chat_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
