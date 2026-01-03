#!/usr/bin/env python
"""Main entry point for Ad Platform Crew."""

from ad_platform_crew.crew import AdPlatformCrew


def run():
    """Run the crew."""
    inputs = {"user_query": "Show my AdMob setup"}
    AdPlatformCrew().crew().kickoff(inputs=inputs)


if __name__ == "__main__":
    run()
