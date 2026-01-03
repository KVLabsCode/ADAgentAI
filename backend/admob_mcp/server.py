#!/usr/bin/env python3
"""
AdMob MCP Server

A conversational, agent-driven interface for managing AdMob setup using
natural language through the Model Context Protocol (MCP).

This server provides tools for:
- Listing and inspecting AdMob publisher accounts
- Viewing apps and ad units configuration
- Generating mediation and network performance reports
- Understanding monetization setup and performance

Authentication:
    Set one of the following environment variables:
    - ADMOB_ACCESS_TOKEN: OAuth 2.0 access token
    - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file

Usage:
    # Run with stdio transport (for local use)
    python -m admob_mcp.server

    # Run with HTTP transport (for remote access)
    TRANSPORT=http python -m admob_mcp.server

Author: Koushik Ks
Version: 1.0.0
"""

import os
import sys
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Look for .env in the admob_mcp directory or parent
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()  # Try default locations
except ImportError:
    pass  # dotenv not installed, use system env vars

from .tools import (
    register_account_tools,
    register_app_tools,
    register_ad_unit_tools,
    register_ad_source_tools,
    register_mediation_group_tools,
    register_report_tools,
)
from .constants import API_VERSION


# Initialize the MCP server
mcp = FastMCP(
    "admob_mcp",
    instructions=f"""
You are an AdMob assistant that helps publishers manage their AdMob setup through natural language.

**API Version**: {API_VERSION} (Complete v1beta API with full read/write capabilities)

You can help with:
1. **Account Management**: List and inspect AdMob publisher accounts
2. **App Management**: View and create apps in AdMob with platform and approval status
3. **Ad Unit Management**: List, create ad units with formats/types; manage ad unit mappings to ad sources
4. **Ad Sources & Adapters**: Discover available mediation ad networks and their SDK adapters
5. **Mediation Groups**: List, create, update mediation groups that control network competition
6. **A/B Experiments**: Create and manage mediation A/B tests to optimize performance
7. **Performance Reports**: Generate mediation, network, and campaign reports with various dimensions/metrics

**Typical Workflow:**
1. List accounts to get the account_id (admob_list_accounts)
2. Use that account_id for all subsequent operations

**For Mediation Setup:**
- admob_list_ad_sources - Discover available ad networks (Facebook, AppLovin, Unity, etc.)
- admob_list_adapters - Get SDK adapter info for specific ad sources
- admob_list_mediation_groups - View existing mediation waterfall configurations
- admob_create_mediation_group - Create new mediation group with targeting
- admob_update_mediation_group - Modify existing mediation groups

**For A/B Testing:**
- admob_create_mediation_ab_experiment - Start A/B test on a mediation group
- admob_stop_mediation_ab_experiment - End test and apply winning variant

**For Reports:**
- Mediation reports: Performance by ad source/network in waterfall
- Network reports: Overall AdMob network performance
- Campaign reports: House ads and cross-promotion performance

NOTE: Some write operations (create/update) require special API access. Contact your Google account manager if you encounter permission errors.

Always explain results in plain language and suggest next steps or optimizations when appropriate.
""",
)


def register_all_tools() -> None:
    """Register all AdMob tools with the MCP server."""
    register_account_tools(mcp)
    register_app_tools(mcp)
    register_ad_unit_tools(mcp)
    register_ad_source_tools(mcp)
    register_mediation_group_tools(mcp)
    register_report_tools(mcp)


def check_auth_config() -> bool:
    """Check if authentication is configured."""
    if os.environ.get("ADMOB_ACCESS_TOKEN"):
        return True
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        creds_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        if os.path.exists(creds_path):
            return True
        print(f"Warning: GOOGLE_APPLICATION_CREDENTIALS file not found: {creds_path}", file=sys.stderr)
        return False
    return False


def main() -> None:
    """Main entry point for the AdMob MCP server."""
    # Check authentication configuration
    if not check_auth_config():
        print(
            "Warning: No authentication configured. Set one of:\n"
            "  - ADMOB_ACCESS_TOKEN: OAuth 2.0 access token\n"
            "  - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON\n",
            file=sys.stderr
        )

    # Register all tools
    register_all_tools()

    # Determine transport from environment
    transport = os.environ.get("TRANSPORT", "stdio").lower()

    if transport == "http":
        port = int(os.environ.get("PORT", "8000"))
        print(f"Starting AdMob MCP server on http://localhost:{port}/mcp", file=sys.stderr)
        mcp.run(transport="streamable_http", port=port)
    else:
        print("Starting AdMob MCP server with stdio transport", file=sys.stderr)
        mcp.run()


if __name__ == "__main__":
    main()
