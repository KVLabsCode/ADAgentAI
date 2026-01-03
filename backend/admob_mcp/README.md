# AdMob MCP Server

A conversational, agent-driven interface for managing AdMob setup using natural language through the Model Context Protocol (MCP).

## Overview

This MCP server enables publishers to fully configure, manage, and analyze their AdMob setup using natural language. It provides real-time access to AdMob data through a set of well-designed tools.

## Features

### Read Capabilities
- **List Accounts**: View all AdMob publisher accounts
- **List Apps**: See all apps registered under an account with platform and approval status
- **List Ad Units**: View ad unit configurations with formats and media types
- **Mediation Reports**: Generate detailed reports on ad source performance (eCPM, fill rate, earnings)
- **Network Reports**: Analyze overall AdMob network performance (impressions, RPM, earnings)

### Planned Write Capabilities (Requires API Access)
- Create and update ad units
- Create and update mediation groups
- Modify targeting, floors, and segmentation

> **Note**: Write API access requires enablement by an internal Google POC.

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or install individually
pip install mcp httpx pydantic google-auth
```

## Authentication

Set one of the following environment variables:

### Option 1: OAuth Access Token
```bash
export ADMOB_ACCESS_TOKEN="your-oauth-access-token"
```

### Option 2: Service Account
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

## Usage

### Run with stdio transport (local)
```bash
python -m admob_mcp
```

### Run with HTTP transport (remote)
```bash
TRANSPORT=http PORT=8000 python -m admob_mcp
```

### Test with MCP Inspector
```bash
npx @modelcontextprotocol/inspector python -m admob_mcp
```

## Available Tools

| Tool | Description |
|------|-------------|
| `admob_list_accounts` | List AdMob publisher accounts |
| `admob_get_account` | Get details for a specific account |
| `admob_list_apps` | List apps under an account |
| `admob_list_ad_units` | List ad units under an account |
| `admob_generate_mediation_report` | Generate mediation performance report |
| `admob_generate_network_report` | Generate network performance report |

## Example Conversations

### List your apps
```
User: What apps do I have in AdMob?

Agent: Let me check your AdMob account.
[Calls admob_list_accounts]
[Calls admob_list_apps with account_id]

You have 3 apps:
1. My Game (Android) - Approved
2. My Game (iOS) - Approved
3. Test App (Android) - In Review
```

### Generate a report
```
User: Show me my earnings for last week by country

Agent: I'll generate a network report for you.
[Calls admob_generate_network_report with dimensions=["DATE", "COUNTRY"]]

# Network Report
**Date Range**: 2024-12-23 to 2024-12-29

| Country | Impressions | Earnings | RPM |
|---------|-------------|----------|-----|
| US | 125,432 | $456.78 | $3.64 |
| UK | 45,231 | $123.45 | $2.73 |
...
```

## Project Structure

```
admob_mcp/
├── __init__.py          # Package initialization
├── __main__.py          # Module entry point
├── server.py            # Main MCP server
├── constants.py         # Configuration constants
├── models.py            # Pydantic input models
├── api_client.py        # AdMob API client with OAuth
├── utils.py             # Formatting and helper functions
├── requirements.txt     # Dependencies
└── tools/
    ├── __init__.py      # Tools package
    ├── accounts.py      # Account tools
    ├── apps.py          # App tools
    ├── ad_units.py      # Ad unit tools
    └── reports.py       # Report generation tools
```

## Response Formats

All tools support two response formats:
- **markdown** (default): Human-readable formatted output
- **json**: Machine-readable structured data

Specify format using `response_format` parameter.

## Error Handling

The server provides actionable error messages:
- Authentication errors with setup instructions
- Permission errors with access requirements
- Rate limiting with retry guidance
- Invalid parameters with correction suggestions

## License

See LICENSE.txt in the repository root.
