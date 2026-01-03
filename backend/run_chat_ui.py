"""
Run crewai-chat-ui with patched directory filter.

The default crewai-chat-ui excludes directories containing 'build' as a substring,
which incorrectly filters out our 'mcp-builder' directory. This script patches
the filter function before starting the server.
"""
import os
import sys
from pathlib import Path

# Set LLM to use Anthropic Claude (must be set before importing crewai)
os.environ.setdefault("MODEL", "anthropic/claude-sonnet-4-20250514")

# Patch the filter function before importing the server
def patched_is_user_project_file(file_path: Path) -> bool:
    """Filter out virtual environment paths and other system paths."""
    path_str = str(file_path).lower()

    # Use path parts for exact matching instead of substring matching
    path_parts = Path(path_str).parts

    excluded_dirs = {
        ".venv",
        "venv",
        "env",
        "site-packages",
        "__pycache__",
        ".git",
        "dist",
        "build",
        "egg-info",
    }

    # Check if any path component exactly matches an excluded directory
    return not any(part in excluded_dirs for part in path_parts)


# Apply the patch
import crewai_chat_ui.crew_loader as crew_loader
crew_loader.is_user_project_file = patched_is_user_project_file

# Also patch it in server module if it was imported separately
import crewai_chat_ui.server as server
if hasattr(server, 'is_user_project_file'):
    server.is_user_project_file = patched_is_user_project_file


def main():
    """Run the patched crewai-chat-ui server."""
    from crewai_chat_ui.server import main as server_main
    server_main()


if __name__ == "__main__":
    main()
