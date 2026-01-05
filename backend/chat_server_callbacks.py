"""
Streaming Chat Server for Ad Platform Crew using Step Callbacks.

Uses CrewAI step callbacks to capture agent steps, tool calls, and outputs in real-time.
Streams updates to the UI using Server-Sent Events (SSE) with proper formatting.

Supports multiple ad platforms:
- AdMob (mobile app monetization)
- Google Ad Manager (web/app inventory)
"""

import os
import sys
import re
import json
import queue
import threading
from pathlib import Path
from typing import Optional
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
import requests as http_requests  # Renamed to avoid conflict with flask.request

# Set environment before imports
os.environ.setdefault("MODEL", "anthropic/claude-sonnet-4-20250514")

# API URL for session validation (main Bun/Hono API)
API_URL = os.environ.get("API_URL", "http://localhost:3001")

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from ad_platform_crew.factory.agent_factory import get_factory
from ad_platform_crew.config.settings import settings
from crewai import Crew, Process, Task, LLM
from crewai.types.streaming import StreamChunkType
from crewai.hooks import before_tool_call, after_tool_call

# Query classification prompt - optimized for fast, accurate routing
CLASSIFICATION_PROMPT = """Classify this user query into ONE category.

Categories:
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

# Mapping from classification to (service, capability)
ROUTE_MAP = {
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

# Cache for the router LLM
_router_llm = None

def get_router_llm():
    """Get the lightweight LLM for query classification."""
    global _router_llm
    if _router_llm is None:
        _router_llm = LLM(
            model=settings.llm.model_string,
            temperature=0.0,  # Deterministic for classification
            max_tokens=50,    # Only need category name
        )
    return _router_llm


def classify_query(user_query: str) -> tuple[str, str]:
    """
    Classify a user query to determine which specialist to route to.

    Args:
        user_query: The user's natural language query

    Returns:
        Tuple of (service, capability) for the specialist
    """
    llm = get_router_llm()
    prompt = CLASSIFICATION_PROMPT.format(query=user_query)

    try:
        response = llm.call(messages=[{"role": "user", "content": prompt}])
        category = response.strip().lower().replace('"', '').replace("'", "")

        # Get the route or default to admob_inventory
        if category in ROUTE_MAP:
            return ROUTE_MAP[category]
        else:
            print(f"Unknown category '{category}', defaulting to admob_inventory")
            return ("admob", "inventory")

    except Exception as e:
        print(f"Classification error: {e}, defaulting to admob_inventory")
        return ("admob", "inventory")


def get_current_user() -> Optional[dict]:
    """
    Validate session and get current user from the main API.

    Forwards cookies to the API to validate the Better Auth session.
    Returns user dict with 'id' if authenticated, None otherwise.
    """
    # Get cookies from the Flask request
    cookies = {key: value for key, value in request.cookies.items()}

    if not cookies:
        print("  No cookies found in request")
        return None

    try:
        # Call the main API's session endpoint
        response = http_requests.get(
            f"{API_URL}/api/auth/get-session",
            cookies=cookies,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            # Better Auth returns { session: {...}, user: {...} }
            if data and data.get("user"):
                return data["user"]
        print(f"  Session validation returned status {response.status_code}")
        return None
    except Exception as e:
        print(f"  Auth validation error: {e}")
        return None


app = Flask(__name__)
CORS(app,
     origins=[
         "http://localhost:3000",
         "http://localhost:3002",
         "https://ad-agent-ai.vercel.app",
         # Regex for Vercel preview URLs
         re.compile(r"https://.*\.vercel\.app$"),
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept"],
     methods=["GET", "POST", "OPTIONS"]
)

# Global queue for tool events (set by generate() before crew runs)
_tool_event_queue = None


# Global hooks - registered once at module load
@before_tool_call
def capture_tool_call(context):
    """Capture tool call and send to UI."""
    global _tool_event_queue
    if _tool_event_queue is None:
        return None

    tool_name = context.tool_name
    tool_input = str(context.tool_input) if context.tool_input else ""

    is_truncated = len(tool_input) > 200
    tool_event = {
        'type': 'tool',
        'tool': tool_name,
        'input_preview': tool_input[:200],
        'input_full': tool_input if is_truncated else None,
        'is_truncated': is_truncated
    }
    _tool_event_queue.put(tool_event)
    return None


@after_tool_call
def capture_tool_result(context):
    """Capture tool results and send to UI."""
    global _tool_event_queue
    if _tool_event_queue is None:
        return None

    if context.tool_result:
        result_event = parse_tool_result(context.tool_result)
        _tool_event_queue.put(result_event)
    return None


def get_crew_for_query(user_query: str, user_id: Optional[str] = None) -> tuple[Crew, str, str]:
    """
    Create a crew with streaming enabled, routed to the appropriate specialist.

    Args:
        user_query: The user's query to route
        user_id: Optional user ID for fetching user-specific OAuth tokens

    Returns:
        Tuple of (crew, service, capability) for logging
    """
    # Pass user_id to factory so tools can fetch user-specific tokens
    if user_id:
        os.environ["CURRENT_USER_ID"] = user_id
        print(f"  Set CURRENT_USER_ID: {user_id}")

    factory = get_factory()

    # Step 1: Classify the query to determine routing
    service, capability = classify_query(user_query)
    print(f"  Routed to: {service}/{capability}")

    # Step 2: Create the appropriate specialist
    specialist = factory.create_specialist(service, capability, verbose=False)

    # Step 3: Create task with service-specific instructions
    if service == "admob":
        instructions = """
        Instructions for AdMob:
        1. Use "List AdMob Accounts" to get available accounts first
        2. Use the account_id from step 1 for subsequent calls
        3. For apps: use "List AdMob Apps" with the account_id
        4. For ad units: use "List AdMob Ad Units" with the account_id
        5. For reports: use the appropriate report generation tool
        """
    else:  # admanager
        instructions = """
        Instructions for Ad Manager:
        1. Use "List Ad Manager Networks" to get network codes first
        2. Use the network_code from step 1 for subsequent calls
        3. For ad units: use "List Ad Manager Ad Units"
        4. For reports: use the report tools
        """

    process_task = Task(
        description=f"""
        Process this user request: {{user_query}}

        {instructions}

        Provide a clear, actionable response with the data.
        If you encounter errors, explain them clearly.
        """,
        expected_output="A clear response with relevant data from the ad platform.",
        agent=specialist,
    )

    # Step 4: Create crew with streaming enabled
    crew = Crew(
        agents=[specialist],
        tasks=[process_task],
        process=Process.sequential,
        stream=True,  # Enable streaming
        verbose=False,  # Disable verbose to avoid duplicate output
        chat_llm=settings.crew.chat_llm,
        memory=settings.crew.memory,
        cache=settings.crew.cache,
    )

    return crew, service, capability


# Keep backwards compatibility
def get_crew():
    """Legacy function - creates default AdMob inventory crew."""
    factory = get_factory()
    specialist = factory.create_specialist("admob", "inventory", verbose=False)

    task = Task(
        description="""Process this user request: {user_query}
        Use "List AdMob Accounts" first, then explore apps and ad units.""",
        expected_output="A clear response with AdMob data.",
        agent=specialist,
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


@app.route('/')
def index():
    """Serve the streaming chat UI with proper formatting."""
    return '''
<!DOCTYPE html>
<html>
<head>
    <title>Ad Platform Crew Chat</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <!-- DOMPurify for safe HTML rendering -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            height: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #09090b;
            color: #fafafa;
        }
        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-width: 900px;
            margin: 0 auto;
        }
        header {
            padding: 16px 20px;
            border-bottom: 1px solid #27272a;
            flex-shrink: 0;
        }
        header h1 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #fafafa;
        }
        #chat {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #09090b;
        }
        .message {
            margin: 12px 0;
            padding: 12px 16px;
            border-radius: 8px;
            line-height: 1.6;
        }
        .user {
            background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
            color: #e0f2fe;
            margin-left: 20%;
            border: 1px solid #1d4ed8;
        }
        .assistant {
            background: #18181b;
            border: 1px solid #27272a;
            margin-right: 10%;
            font-size: 0.8125rem;
        }

        /* Markdown formatting in assistant messages */
        .assistant h1, .assistant h2, .assistant h3 {
            color: #fafafa;
            margin-top: 0.75em;
            margin-bottom: 0.4em;
        }
        .assistant h1 { font-size: 1.2em; border-bottom: 1px solid #27272a; padding-bottom: 0.25em; }
        .assistant h2 { font-size: 1.1em; }
        .assistant h3 { font-size: 1em; }
        .assistant p { margin: 0.4em 0; }
        .assistant ul, .assistant ol {
            margin: 0.4em 0;
            padding-left: 1.5em;
        }
        .assistant li { margin: 0.2em 0; }
        .assistant code {
            background: #27272a;
            padding: 1px 5px;
            border-radius: 3px;
            font-family: 'SF Mono', 'Consolas', monospace;
            font-size: 0.85em;
            color: #a1a1aa;
        }
        .assistant pre {
            background: #18181b;
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #27272a;
            margin: 0.4em 0;
            font-size: 0.8em;
        }
        .assistant pre code {
            background: none;
            padding: 0;
            color: #a1a1aa;
        }
        .assistant strong { color: #fafafa; font-weight: 600; }
        .assistant em { color: #71717a; }
        .assistant blockquote {
            border-left: 2px solid #3f3f46;
            padding-left: 0.75em;
            margin-left: 0;
            color: #71717a;
            font-size: 0.9em;
        }
        .assistant table { border-collapse: collapse; margin: 0.4em 0; width: 100%; font-size: 0.9em; }
        .assistant th, .assistant td {
            border: 1px solid #27272a;
            padding: 6px;
            text-align: left;
        }
        .assistant th { background: #27272a; color: #fafafa; }
        .assistant a { color: #a1a1aa; text-decoration: underline; }
        .assistant a:hover { color: #fafafa; }

        .system {
            background: transparent;
            color: #52525b;
            font-size: 0.875em;
            text-align: center;
            border: none;
            padding: 8px;
        }
        .agent-header {
            background: #27272a;
            color: #a1a1aa;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 12px 0 8px 0;
            font-weight: 500;
            font-size: 0.875em;
            border: 1px solid #3f3f46;
        }
        .thinking {
            background: #18181b;
            border-left: 2px solid #3f3f46;
            padding: 10px 14px;
            margin: 8px 0;
            font-size: 0.875em;
            color: #71717a;
            border-radius: 0 6px 6px 0;
        }
        .thinking strong { color: #a1a1aa; }
        .thinking code {
            background: #27272a;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', 'Consolas', monospace;
            font-size: 0.85em;
        }

        /* Tool execution card */
        .tool-execution {
            margin: 10px 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #27272a;
            background: #18181b;
        }

        .error {
            background: #450a0a;
            color: #fca5a5;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            border: 1px solid #7f1d1d;
        }

        #input-area {
            display: flex;
            gap: 10px;
            padding: 16px 20px;
            border-top: 1px solid #27272a;
            background: #09090b;
            flex-shrink: 0;
        }
        #user-input {
            flex: 1;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #27272a;
            background: #18181b;
            color: #fafafa;
            font-size: 0.9375rem;
            transition: border-color 0.15s;
        }
        #user-input:focus {
            outline: none;
            border-color: #3f3f46;
        }
        #user-input::placeholder { color: #52525b; }
        #send-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.875rem;
            transition: all 0.15s;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        #send-btn:hover {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }
        #send-btn:disabled {
            background: #27272a;
            color: #52525b;
            cursor: not-allowed;
            box-shadow: none;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        #chat::-webkit-scrollbar { width: 6px; }
        #chat::-webkit-scrollbar-track { background: transparent; }
        #chat::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        #chat::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Ad Platform Crew</h1>
        </header>
        <div id="chat"></div>
        <div id="input-area">
            <input type="text" id="user-input" placeholder="Ask about your AdMob or Ad Manager setup..." onkeypress="if(event.key==='Enter')sendMessage()">
            <button onclick="sendMessage()" id="send-btn">Send</button>
        </div>
    </div>
    <script>
        const chat = document.getElementById('chat');
        const input = document.getElementById('user-input');
        const btn = document.getElementById('send-btn');

        // Configure marked for better rendering
        marked.setOptions({
            breaks: true,  // Convert \\n to <br>
            gfm: true,     // GitHub Flavored Markdown
        });

        function addMessage(text, type, isMarkdown = false) {
            const div = document.createElement('div');
            div.className = 'message ' + type;

            if (isMarkdown) {
                // Render markdown to HTML and sanitize
                const rawHtml = marked.parse(text);
                const cleanHtml = DOMPurify.sanitize(rawHtml);
                div.innerHTML = cleanHtml;
            } else {
                div.textContent = text;
            }

            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
            return div;
        }

        function addAgentHeader(agentRole, taskName) {
            const div = document.createElement('div');
            div.className = 'agent-header';
            div.style.cssText = 'background: linear-gradient(135deg, #1e1b4b 0%, #18181b 100%); color: #a1a1aa; padding: 10px 14px; border-radius: 8px; margin: 16px 0 8px 0; font-weight: 500; font-size: 0.8125rem; border: 1px solid #312e81;';
            div.innerHTML = `<span style="color: #818cf8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;">Agent</span><br><span style="color: #e0e7ff; font-weight: 600;">${agentRole}</span>`;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }

        // Store the current tool container so we can attach output to it
        let currentToolContainer = null;

        function addToolCall(data) {
            const container = document.createElement('div');
            container.className = 'tool-execution';
            container.style.cssText = 'margin: 10px 0; border-radius: 8px; overflow: hidden; border: 1px solid #14532d; background: #18181b;';

            // Header with tool name
            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = 'background: linear-gradient(135deg, #14532d 0%, #18181b 100%); color: #fafafa; padding: 10px 14px; font-weight: 500; font-size: 0.875rem; border-bottom: 1px solid #166534;';
            headerDiv.innerHTML = `<span style="color: #4ade80; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;">Tool</span><br><span style="color: #bbf7d0; font-weight: 600;">${data.tool || 'Unknown'}</span>`;
            container.appendChild(headerDiv);

            // Inputs section
            if (data.input_preview) {
                const inputSection = document.createElement('div');
                inputSection.style.cssText = 'padding: 12px 14px; border-bottom: 1px solid #27272a; background: rgba(20, 83, 45, 0.1);';

                const inputLabel = document.createElement('div');
                inputLabel.style.cssText = 'color: #4ade80; font-size: 0.7rem; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;';
                inputLabel.textContent = 'Input';
                inputSection.appendChild(inputLabel);

                const inputCode = document.createElement('pre');
                inputCode.style.cssText = 'background: #09090b; padding: 10px; border-radius: 6px; margin: 0; overflow-x: auto; font-size: 0.8125rem; color: #86efac; border: 1px solid #14532d;';
                inputCode.textContent = data.input_preview;
                inputSection.appendChild(inputCode);

                if (data.is_truncated && data.input_full) {
                    const expandBtn = document.createElement('button');
                    expandBtn.textContent = 'Show more';
                    expandBtn.style.cssText = 'margin-top: 8px; padding: 4px 10px; background: transparent; color: #4ade80; border: 1px solid #166534; border-radius: 4px; cursor: pointer; font-size: 0.75rem;';

                    const fullCode = document.createElement('pre');
                    fullCode.style.cssText = 'display: none; background: #09090b; padding: 10px; border-radius: 6px; margin-top: 8px; overflow-x: auto; font-size: 0.8125rem; color: #86efac; border: 1px solid #14532d;';
                    fullCode.textContent = data.input_full;

                    let isExpanded = false;
                    expandBtn.onclick = function() {
                        isExpanded = !isExpanded;
                        inputCode.style.display = isExpanded ? 'none' : 'block';
                        fullCode.style.display = isExpanded ? 'block' : 'none';
                        expandBtn.textContent = isExpanded ? 'Show less' : 'Show more';
                    };

                    inputSection.appendChild(expandBtn);
                    inputSection.appendChild(fullCode);
                }

                container.appendChild(inputSection);
            }

            // Placeholder for output (will be filled by addToolResult)
            const outputSection = document.createElement('div');
            outputSection.className = 'tool-output-section';
            outputSection.style.cssText = 'padding: 12px 14px; background: rgba(20, 83, 45, 0.05);';

            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'tool-output-loading';
            loadingDiv.style.cssText = 'color: #4ade80; font-size: 0.8125rem;';
            loadingDiv.innerHTML = '<span style="display: inline-block; animation: pulse 1.5s infinite;">●</span> Running...';
            outputSection.appendChild(loadingDiv);

            container.appendChild(outputSection);

            chat.appendChild(container);
            chat.scrollTop = chat.scrollHeight;

            // Store reference for output attachment
            currentToolContainer = container;
        }

        function addThinking(text, isLegacy = false) {
            const div = document.createElement('div');
            div.className = 'thinking';
            div.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #18181b 100%); border-left: 2px solid #6366f1; padding: 10px 14px; margin: 8px 0; font-size: 0.875rem; color: #a5b4fc; border-radius: 0 6px 6px 0;';

            // Simple text display without extra formatting
            div.innerHTML = '<span style="color: #6366f1; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;">Thinking</span><br><span style="color: #c7d2fe;">' + DOMPurify.sanitize(marked.parse(text)) + '</span>';

            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }

        function addToolResult(data) {
            // Find the output section in the current tool container
            let outputSection = null;
            if (currentToolContainer) {
                outputSection = currentToolContainer.querySelector('.tool-output-section');
            }

            // If no container, create standalone (fallback)
            if (!outputSection) {
                outputSection = document.createElement('div');
                outputSection.style.cssText = 'background: #18181b; padding: 12px 14px; margin: 8px 0; border-radius: 6px; border: 1px solid #27272a;';
                chat.appendChild(outputSection);
            }

            // Clear loading state and update styling for output
            outputSection.innerHTML = '';
            outputSection.style.cssText = 'padding: 12px 14px; background: rgba(120, 53, 15, 0.1); border-top: 1px solid #78350f;';

            // Output label
            const outputLabel = document.createElement('div');
            outputLabel.style.cssText = 'color: #fbbf24; font-size: 0.7rem; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;';
            let labelText = 'Output';
            if (data.data_type === 'json_list' && data.item_count) {
                labelText = `Output · ${data.item_count} items`;
            }
            outputLabel.textContent = labelText;
            outputSection.appendChild(outputLabel);

            // Preview code block
            const previewCode = document.createElement('pre');
            previewCode.style.cssText = 'background: #09090b; padding: 10px; border-radius: 6px; margin: 0; overflow-x: auto; font-size: 0.8125rem; color: #fcd34d; max-height: 200px; overflow-y: auto; border: 1px solid #78350f;';
            previewCode.textContent = data.preview;
            outputSection.appendChild(previewCode);

            // Add expand/collapse button if truncated
            if (data.is_truncated && data.full) {
                const expandBtn = document.createElement('button');
                expandBtn.textContent = 'Show more';
                expandBtn.style.cssText = 'margin-top: 8px; padding: 4px 10px; background: transparent; color: #fbbf24; border: 1px solid #78350f; border-radius: 4px; cursor: pointer; font-size: 0.75rem;';

                const fullCode = document.createElement('pre');
                fullCode.style.cssText = 'display: none; background: #09090b; padding: 10px; border-radius: 6px; margin-top: 8px; overflow-x: auto; font-size: 0.8125rem; color: #fcd34d; max-height: 400px; overflow-y: auto; border: 1px solid #78350f;';
                fullCode.textContent = data.full;

                let isExpanded = false;
                expandBtn.onclick = function() {
                    isExpanded = !isExpanded;
                    previewCode.style.display = isExpanded ? 'none' : 'block';
                    fullCode.style.display = isExpanded ? 'block' : 'none';
                    expandBtn.textContent = isExpanded ? 'Show less' : 'Show more';
                };

                outputSection.appendChild(expandBtn);
                outputSection.appendChild(fullCode);
            }

            chat.scrollTop = chat.scrollHeight;
        }

        addMessage('Ask me about your AdMob or Ad Manager setup', 'system');

        async function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';
            btn.disabled = true;

            const statusMsg = addMessage('🔄 Starting agent crew...', 'system');

            try {
                const eventSource = new EventSource('/chat/stream?message=' + encodeURIComponent(text));

                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    console.log('[UI] Received event:', data.type, data);

                    if (data.type === 'routing') {
                        // Show routing decision
                        if (statusMsg && statusMsg.parentNode) statusMsg.remove();
                        const routeDiv = document.createElement('div');
                        routeDiv.style.cssText = 'background: linear-gradient(135deg, #1e1b4b 0%, #18181b 100%); color: #c4b5fd; padding: 8px 14px; border-radius: 6px; margin: 8px 0; font-size: 0.75rem; border: 1px solid #4c1d95;';
                        routeDiv.innerHTML = '<span style="color: #8b5cf6;">Routing to:</span> <strong style="color: #e9d5ff;">' + data.service + '/' + data.capability + '</strong>';
                        chat.appendChild(routeDiv);
                        chat.scrollTop = chat.scrollHeight;
                    }
                    else if (data.type === 'agent') {
                        addAgentHeader(data.agent, data.task);
                    }
                    else if (data.type === 'tool') {
                        console.log('[UI] Adding tool call:', data.tool);
                        addToolCall(data);
                    }
                    else if (data.type === 'tool_result') {
                        console.log('[UI] Adding tool result');
                        addToolResult(data);
                    }
                    else if (data.type === 'thought') {
                        console.log('[UI] Adding thought:', data.content.substring(0, 50));
                        addThinking(data.content, false);
                    }
                    else if (data.type === 'text') {
                        console.log('[UI] Adding text:', data.content.substring(0, 50));
                        addThinking(data.content, true);
                    }
                    else if (data.type === 'result') {
                        if (statusMsg && statusMsg.parentNode) statusMsg.remove();
                        addMessage(data.content, 'assistant', true);  // Render as markdown
                    }
                    else if (data.type === 'error') {
                        if (statusMsg && statusMsg.parentNode) statusMsg.remove();
                        addMessage('Error: ' + data.content, 'error');
                    }
                    else if (data.type === 'done') {
                        eventSource.close();
                        btn.disabled = false;
                        input.focus();
                    }
                };

                eventSource.onerror = function(err) {
                    console.error('EventSource error:', err);
                    if (statusMsg && statusMsg.parentNode) statusMsg.remove();
                    addMessage('Connection error. Please try again.', 'error');
                    eventSource.close();
                    btn.disabled = false;
                    input.focus();
                };

            } catch (e) {
                if (statusMsg && statusMsg.parentNode) statusMsg.remove();
                addMessage('Error: ' + e.message, 'error');
                btn.disabled = false;
                input.focus();
            }
        }
    </script>
</body>
</html>
'''


@app.route('/chat/stream')
def chat_stream():
    """Stream chat responses using proper CrewAI streaming API."""
    user_message = request.args.get('message', '')

    if not user_message:
        return Response("data: " + json.dumps({"type": "error", "content": "No message provided"}) + "\n\n",
                       mimetype='text/event-stream')

    # Authenticate user and get user_id
    user = get_current_user()
    user_id = user.get("id") if user else None
    print(f"  Chat request from user: {user_id or 'anonymous'}")

    @stream_with_context
    def generate():
        """Generator function for SSE streaming."""
        try:

            # Set global queue for tool hooks
            global _tool_event_queue
            _tool_event_queue = queue.Queue()

            # Route to the appropriate specialist based on query (with user_id for OAuth tokens)
            crew, service, capability = get_crew_for_query(user_message, user_id=user_id)

            # Send routing info to UI
            yield f"data: {json.dumps({'type': 'routing', 'service': service, 'capability': capability})}\n\n"

            streaming = crew.kickoff(inputs={'user_query': user_message})

            current_task = ""
            current_agent = ""
            text_buffer = []
            seen_final_answer = False  # Stop thinking output after Final Answer

            # Iterate over streaming chunks
            for chunk in streaming:
                # Check for tool results from hook
                while not _tool_event_queue.empty():
                    try:
                        event = _tool_event_queue.get_nowait()
                        yield f"data: {json.dumps(event)}\n\n"
                    except queue.Empty:
                        break

                # Show agent/task transitions
                if chunk.agent_role != current_agent or chunk.task_name != current_task:
                    current_agent = chunk.agent_role
                    current_task = chunk.task_name
                    yield f"data: {json.dumps({'type': 'agent', 'agent': current_agent, 'task': current_task})}\n\n"

                # Handle TEXT chunks - buffer into sentences for thinking display
                # Tool calls and results come from hooks, not TEXT parsing
                if chunk.chunk_type == StreamChunkType.TEXT:
                    if chunk.content:
                        # Skip all content after Final Answer (it will come in the result)
                        if seen_final_answer:
                            continue

                        text_buffer.append(chunk.content)
                        full_text = ''.join(text_buffer)

                        # Check for protocol keywords that signal we should process the buffer
                        has_action = 'Action:' in full_text and 'Action Input:' in full_text
                        has_final = 'Final Answer:' in full_text
                        has_observation = 'Observation:' in full_text

                        # Only flush when we hit a protocol boundary or buffer is very long
                        should_process = has_action or has_final or has_observation or len(full_text) > 500

                        if should_process:
                            # Extract thought content - text before any protocol keyword
                            # Agent may or may not prefix with "Thought:"
                            thought = full_text

                            # If there's an Observation, start after it (thought comes after observation)
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

                            # Clean up JSON remnants that leak from previous Action Input
                            # Find where the actual sentence starts (first capital letter after garbage)
                            match = re.search(r'[A-Z][a-z]', thought)
                            if match:
                                thought = thought[match.start():].strip()

                            # Show thought if it's meaningful
                            if len(thought) > 15:
                                # Additional filtering
                                is_just_filler = thought.lower() in ('now', 'next', 'then', 'ok', 'okay', 'done', 'good', 'great', 'i', 'action', 'observation')
                                is_protocol_fragment = thought.lower().strip() in ('action', 'action input', 'observation', 'thought', 'final answer')

                                if not is_just_filler and not is_protocol_fragment:
                                    yield f"data: {json.dumps({'type': 'thought', 'content': thought})}\n\n"

                            # If we hit Final Answer, stop processing thoughts
                            if has_final:
                                seen_final_answer = True

                            text_buffer = []

                # Handle TOOL_CALL chunks (if they come)
                elif chunk.chunk_type == StreamChunkType.TOOL_CALL and chunk.tool_call:
                    # Send tool call with proper field names for expand/collapse
                    tool_input = json.dumps(chunk.tool_call.arguments, indent=2) if chunk.tool_call.arguments else ""
                    is_truncated = len(tool_input) > 200

                    tool_event = {
                        'type': 'tool',
                        'tool': chunk.tool_call.tool_name,
                        'input_preview': tool_input[:200],
                        'input_full': tool_input if is_truncated else None,
                        'is_truncated': is_truncated
                    }
                    yield f"data: {json.dumps(tool_event)}\n\n"

            # Flush any remaining buffered text (only if we haven't seen final answer)
            if text_buffer and not seen_final_answer:
                full_text = ''.join(text_buffer)
                thought = full_text
                if 'Observation:' in thought:
                    thought = thought.split('Observation:')[-1]
                if 'Thought:' in thought:
                    thought = thought.split('Thought:', 1)[1]
                for keyword in ['Action:', 'Action Input:', 'Observation:', 'Final Answer:']:
                    if keyword in thought:
                        thought = thought.split(keyword, 1)[0]
                thought = thought.strip().lstrip('!').strip()
                # Find where the actual sentence starts
                match = re.search(r'[A-Z][a-z]', thought)
                if match:
                    thought = thought[match.start():].strip()
                if len(thought) > 15:
                    yield f"data: {json.dumps({'type': 'thought', 'content': thought})}\n\n"

            # Get final result and send as complete formatted response
            result = streaming.result
            if result and result.raw:
                yield f"data: {json.dumps({'type': 'result', 'content': str(result.raw)})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        finally:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(generate(), mimetype='text/event-stream')


def parse_agent_output(text):
    """Parse agent protocol output and extract thinking, tool calls, observations, and final answer."""
    if not text or len(text) < 5:
        return []

    events = []

    # Extract thought content
    if 'Thought:' in text:
        thought = text.split('Thought:', 1)[1].strip()
        # Stop at next protocol keyword
        for keyword in ['Action:', 'Action Input:', 'Observation:', 'Final Answer:']:
            if keyword in thought:
                thought = thought.split(keyword, 1)[0].strip()
        if thought:
            events.append(('thinking', f"💭 **Thinking:** {thought}"))

    # Extract action (tool call)
    if 'Action:' in text and 'Action Input:' in text:
        action_part = text.split('Action:', 1)[1]
        tool_name = action_part.split('Action Input:', 1)[0].strip()
        tool_input = action_part.split('Action Input:', 1)[1].strip()
        # Stop at next keyword
        for keyword in ['Thought:', 'Observation:', 'Final Answer:']:
            if keyword in tool_input:
                tool_input = tool_input.split(keyword, 1)[0].strip()

        if tool_name:
            events.append(('tool_call', {'tool': tool_name, 'input': tool_input}))

    # Extract observation (tool result)
    if 'Observation:' in text:
        observation = text.split('Observation:', 1)[1].strip()
        # Stop at next protocol keyword
        for keyword in ['Thought:', 'Action:', 'Final Answer:']:
            if keyword in observation:
                observation = observation.split(keyword, 1)[0].strip()
        if observation:
            events.append(('tool_result', observation))

    # Extract final answer
    if 'Final Answer:' in text:
        answer = text.split('Final Answer:', 1)[1].strip()
        if answer:
            events.append(('final_answer', answer))

    return events


def parse_tool_result(result_str):
    """Parse tool result and return formatted event."""
    try:
        # Try to parse as JSON
        result_data = json.loads(result_str)
        full_json = json.dumps(result_data, indent=2)

        if isinstance(result_data, dict):
            preview = json.dumps(result_data, indent=2)[:500]
            is_truncated = len(full_json) > 500
            return {
                'type': 'tool_result',
                'preview': preview,
                'full': full_json if is_truncated else None,
                'data_type': 'json',
                'is_truncated': is_truncated
            }
        elif isinstance(result_data, list):
            preview = json.dumps(result_data[:3], indent=2)
            is_truncated = len(result_data) > 3
            return {
                'type': 'tool_result',
                'preview': preview,
                'full': full_json if is_truncated else None,
                'data_type': 'json_list',
                'item_count': len(result_data),
                'is_truncated': is_truncated
            }
        else:
            return {
                'type': 'tool_result',
                'preview': full_json,
                'full': None,
                'data_type': 'json',
                'is_truncated': False
            }
    except (json.JSONDecodeError, TypeError):
        # Not JSON
        is_truncated = len(result_str) > 300
        preview = result_str[:300] if is_truncated else result_str
        return {
            'type': 'tool_result',
            'preview': preview,
            'full': result_str if is_truncated else None,
            'data_type': 'text',
            'is_truncated': is_truncated
        }


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n  Ad Platform Crew Chat -> http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
