"""Text parsing utilities for extracting content from agent protocol text."""

import re


def extract_thought(full_text: str) -> str:
    """Extract thinking content from agent protocol text.

    Handles multiple formats:
    - "Thought: ..." (ReAct format)
    - "THINKING: ..." (alternative marker)
    - Plain reasoning text before "Action:" (no marker)
    """
    thought = full_text.strip()

    # If there's an Observation, start after the last one (thoughts follow observations)
    if 'Observation:' in thought:
        thought = thought.split('Observation:')[-1].strip()

    # Try multiple thinking markers (case-insensitive matching)
    marker_found = False
    for marker in ['Thought:', 'THINKING:', 'Thinking:']:
        if marker in thought:
            thought = thought.split(marker, 1)[1]
            marker_found = True
            break

    # If no marker but has Action:, the text before Action: is the reasoning
    if not marker_found:
        if 'Action:' in thought:
            thought = thought.split('Action:', 1)[0]
        elif 'Final Answer:' in thought:
            thought = thought.split('Final Answer:', 1)[0]
        # If no markers at all, this might just be reasoning text - keep it
    else:
        # Stop at Action: (end of thought in ReAct format)
        if 'Action:' in thought:
            thought = thought.split('Action:', 1)[0]
        # Stop at Final Answer: (alternative end marker)
        if 'Final Answer:' in thought:
            thought = thought.split('Final Answer:', 1)[0]

    thought = thought.strip()

    # Remove routing metadata (e.g., "ROUTE: admob_mediation")
    thought = re.sub(r'\n*ROUTE:\s*\w+[\w_/]*\s*$', '', thought, flags=re.IGNORECASE).strip()

    # Filter out protocol filler phrases (not actual reasoning)
    skip_patterns = [
        r'^I now know the final answer',
        r'^I have enough information',
        r'^I have all the information',
    ]
    for pattern in skip_patterns:
        if re.match(pattern, thought, re.IGNORECASE):
            return ""

    return thought


def extract_json_with_nested_braces(text: str, start_marker: str = "Action Input:") -> str:
    """Extract JSON from text that may contain nested braces.

    Finds the start marker, then extracts from first { to matching }.
    Handles nested objects and strings with escaped characters.
    """
    try:
        # Find the start marker
        marker_idx = text.find(start_marker)
        if marker_idx == -1:
            return "{}"

        # Find the first { after the marker
        start_idx = text.find("{", marker_idx)
        if start_idx == -1:
            # No JSON object, try to get simple value
            after_marker = text[marker_idx + len(start_marker):].strip()
            # Take until newline or next protocol marker
            end_idx = len(after_marker)
            for marker in ["\nObservation:", "\nThought:", "\nAction:", "\n\n"]:
                idx = after_marker.find(marker)
                if idx != -1 and idx < end_idx:
                    end_idx = idx
            return after_marker[:end_idx].strip() or "{}"

        # Count braces to find matching }
        brace_count = 0
        end_idx = start_idx
        in_string = False
        escape_next = False

        for i, char in enumerate(text[start_idx:], start_idx):
            if escape_next:
                escape_next = False
                continue

            if char == '\\' and in_string:
                escape_next = True
                continue

            if char == '"' and not escape_next:
                in_string = not in_string
                continue

            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break

        if brace_count == 0 and end_idx > start_idx:
            return text[start_idx:end_idx]
        return "{}"
    except Exception:
        return "{}"


def extract_action_from_text(text: str) -> tuple[str | None, str | None]:
    """Extract Action and Action Input from agent protocol text.

    Returns:
        Tuple of (action_name, action_input) or (None, None) if not found.
    """
    action_match = re.search(r'Action:\s*([^\n]+)', text)
    if not action_match:
        return None, None

    action_name = action_match.group(1).strip()
    action_input = extract_json_with_nested_braces(text, "Action Input:")

    return action_name, action_input
