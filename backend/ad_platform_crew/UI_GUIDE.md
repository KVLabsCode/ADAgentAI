# Ad Platform Crew UI Guide

This guide covers the optional UI interface for interacting with Ad Platform Crew.

## CrewAI Chat UI (Recommended)

A modern web-based chat interface specifically built for CrewAI crews.

**Features:**
- Real-time chat interface at `http://localhost:5000`
- Conversation history and management
- Multiple concurrent conversations
- Typing indicators and live updates
- Built-in support for CrewAI crews

**Requirements:**
- Python 3.9+
- CrewAI 0.98.0+
- `crewai-chat-ui` package

---

## Quick Start

### Installation

1. **Install UI dependencies:**
   ```bash
   cd admob_crew
   pip install -e ".[ui]"
   ```

   Or run the setup script:
   ```bash
   python scripts/setup_ui.py
   ```

2. **Configure environment variables:**
   Create or update `admob_crew/.env`:
   ```bash
   ANTHROPIC_API_KEY=your_anthropic_key
   ADMOB_DEVELOPER_TOKEN=your_admob_token
   ```

---

## Using CrewAI Chat UI

### Launch the Chat UI

```bash
# Option 1: Using the launcher script
python -m admob_crew.ui_launcher --ui chat

# Option 2: Using the installed command
admob-crew-ui --ui chat

# Option 3: Direct command (if installed globally)
crewai-chat-ui
```

### How It Works

1. The chat UI automatically detects your `crew.py` file
2. Loads your AdMob Crew instance
3. Uses the configured `chat_llm` for orchestration
4. Provides a web interface for natural language interactions

### Chat UI Features

**Conversation Management:**
- Create new chat threads
- View conversation history
- Delete old conversations
- Switch between multiple threads

**Real-time Interaction:**
- Live typing indicators
- Streaming responses
- Cross-thread notifications

### Example Queries

Once the chat UI is running, you can ask:

```
"List all my AdMob apps"
"Show me the ad units for app xyz"
"What's the performance of my mediation groups?"
"Create a new ad unit for rewarded video"
"Analyze revenue trends for the last 7 days"
```

---

## Configuration

### Chat LLM Setting

The `chat_llm` parameter in `crew.py` determines which LLM is used for chat orchestration:

```python
@crew
def crew(self) -> Crew:
    return Crew(
        agents=self.agents,
        tasks=self.tasks,
        process=Process.sequential,
        verbose=True,
        chat_llm="anthropic/claude-sonnet-4-20250514",  # Chat UI LLM
    )
```

This is configured in `admob_crew/config/settings.py`:

```python
@dataclass
class CrewConfig:
    chat_llm: str = "anthropic/claude-sonnet-4-20250514"
```

You can override this via environment variable:
```bash
CREW_CHAT_LLM=anthropic/claude-opus-4-20250514
```

---

## Troubleshooting

### Chat UI Issues

**Problem:** `crewai-chat-ui` command not found

**Solution:**
```bash
pip install crewai-chat-ui
# OR
pip install -e ".[ui]" from admob_crew directory
```

**Problem:** Chat UI can't find `crew.py`

**Solution:** Make sure you're running the command from the `admob_crew` directory or its parent.

**Problem:** No response from crew

**Solution:** Check that:
- `chat_llm` is configured in settings
- Your API keys are set in `.env`
- The crew instance is properly initialized

---

## Advanced Usage

### Custom Chat UI Port

If you need to change the default port (5000):

```bash
# Set environment variable before launching
export CREWAI_CHAT_UI_PORT=8080
crewai-chat-ui
```

---

## Next Steps

1. **Try the Chat UI** - Best for getting started quickly
2. **Integrate with your workflow** - Use the UI for day-to-day interactions

For more information:
- CrewAI Chat UI: https://github.com/zinyando/crewai_chat_ui
- CrewAI Documentation: https://docs.crewai.com/
