"""CrewAI LLM hooks for capturing agent thinking/reasoning.

Uses CrewAI's @after_llm_call hook to properly extract thinking
from agent responses, rather than parsing raw stream output.
"""

from crewai.hooks import after_llm_call

from ..streaming.state import push_event
from ..streaming.events import ThinkingEvent
from ..utils.parsing import extract_thought


def register_llm_hooks():
    """Explicit function to ensure LLM hooks are registered."""
    print("[STARTUP] CrewAI LLM hooks registered (capture_thinking)")


@after_llm_call
def capture_thinking(context):
    """Capture agent thinking from LLM response and emit to UI.

    This hook fires after each LLM call completes, giving us access
    to the full response including Thought/Action/Final Answer format.
    """
    response = context.response
    if not response:
        return

    # Extract thinking using the ReAct format parser
    resp_str = str(response)
    thinking = extract_thought(resp_str)

    if thinking and len(thinking) > 30:
        push_event(ThinkingEvent(content=thinking).model_dump(mode='json'))
        print(f"  [LLM-HOOK] Thinking: {thinking[:60]}...", flush=True)
