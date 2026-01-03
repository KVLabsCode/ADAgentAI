"""
Ad Platform Crew CLI - Conversational Interface.

Provides a command-line chat interface for interacting with
the Ad Platform Control Plane.
"""

import sys
import argparse
from typing import Optional

from .crew import AdPlatformCrew


WELCOME_MESSAGE = """
+======================================================================+
|                    Ad Platform Control Plane                         |
|         Conversational Agent for Ad Platform Management              |
+======================================================================+

I can help you with:
  - Inspecting your AdMob setup (accounts, apps, ad units)
  - Managing Google Ad Manager inventory
  - Analyzing performance and revenue
  - Generating reports and insights

Type your question or command, or use these shortcuts:
  /help      - Show available commands
  /quit      - Exit the application

"""

HELP_MESSAGE = """
Available Commands:
-------------------
  /help                   Show this help message
  /quit, /exit            Exit the application

Examples:
---------
  "What apps do I have?"
  "Show me my AdMob setup"
  "List my Ad Manager ad units"
  "Which ad units are underperforming?"
"""


class AdPlatformCLI:
    """Command-line interface for Ad Platform Crew."""

    def __init__(self, verbose: bool = True):
        """Initialize the CLI."""
        self.verbose = verbose
        self._crew_instance: Optional[AdPlatformCrew] = None

    def _ensure_crew(self) -> AdPlatformCrew:
        """Lazy initialization of the crew."""
        if self._crew_instance is None:
            print("Initializing Ad Platform agents...")
            self._crew_instance = AdPlatformCrew()
            print("Ready!\n")
        return self._crew_instance

    def _handle_command(self, command: str) -> Optional[str]:
        """
        Handle slash commands.

        Returns:
            Response string, or None to continue prompting
        """
        parts = command[1:].split(maxsplit=1)
        cmd = parts[0].lower()

        if cmd in ("quit", "exit", "q"):
            print("\nGoodbye!")
            sys.exit(0)

        if cmd == "help":
            return HELP_MESSAGE

        return f"Unknown command: /{cmd}\nType /help for available commands."

    def _handle_query(self, query: str) -> str:
        """Handle natural language queries."""
        crew_builder = self._ensure_crew()
        crew = crew_builder.crew()
        result = crew.kickoff(inputs={"user_query": query})
        return str(result)

    def run_interactive(self) -> None:
        """Run the interactive chat loop."""
        print(WELCOME_MESSAGE)

        while True:
            try:
                user_input = input("You: ").strip()

                if not user_input:
                    continue

                if user_input.startswith("/"):
                    response = self._handle_command(user_input)
                else:
                    response = self._handle_query(user_input)

                if response:
                    print(f"\nAgent: {response}\n")

            except KeyboardInterrupt:
                print("\n\nInterrupted. Type /quit to exit.")
            except EOFError:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"\nError: {e}\n")
                if self.verbose:
                    import traceback
                    traceback.print_exc()

    def run_single(self, query: str) -> str:
        """Run a single query and return the result."""
        if query.startswith("/"):
            return self._handle_command(query) or ""
        return self._handle_query(query)


# Backwards compatibility alias
AdMobCLI = AdPlatformCLI


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="Ad Platform Control Plane - Conversational Agent Interface",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  ad-platform-crew                    Start interactive chat
  ad-platform-crew "Show my apps"     Run single query
        """,
    )

    parser.add_argument(
        "query",
        nargs="?",
        help="Single query to execute (starts interactive mode if not provided)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        default=True,
        help="Enable verbose output (default: True)",
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Disable verbose output",
    )

    args = parser.parse_args()

    verbose = not args.quiet and args.verbose
    cli = AdPlatformCLI(verbose=verbose)

    # Single query or interactive mode
    if args.query:
        result = cli.run_single(args.query)
        print(result)
    else:
        cli.run_interactive()


if __name__ == "__main__":
    main()
