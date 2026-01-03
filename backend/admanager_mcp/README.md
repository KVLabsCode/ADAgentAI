# Google Ad Manager MCP Server

A conversational, agent-driven interface for managing Google Ad Manager setup using natural language through the Model Context Protocol (MCP).

## Overview

This MCP server enables publishers to fully configure, manage, and analyze their Ad Manager setup using natural language. It provides real-time access to **ALL 154 Ad Manager API endpoints** through comprehensive MCP tools.

## Features

### Complete API Coverage (154 Tools)

| Resource Group | Tools | Description |
|----------------|-------|-------------|
| Ad Units | 9 | CRUD, batch operations, activate/deactivate/archive |
| Placements | 9 | CRUD, batch operations, activate/deactivate/archive |
| Teams | 8 | CRUD, batch operations, activate/deactivate |
| Sites | 8 | CRUD, batch operations, approval workflow |
| Custom Targeting Keys | 10 | CRUD, batch operations, activate/deactivate |
| Custom Fields | 8 | CRUD, batch operations, activate/deactivate |
| Reports | 6 | Create, run, fetch results |
| Contacts | 6 | CRUD, batch operations |
| Entity Signals Mappings | 6 | CRUD, batch operations |
| Live Stream Events | 11 | Ad breaks management (3 variants) |
| Private Auctions | 4 | CRUD operations |
| Private Auction Deals | 4 | CRUD operations |
| Operations | 4 | Run, list, delete, cancel |
| Web Properties | 3 | Ad review center operations |
| Networks | 2 | List and get |
| Orders | 2 | List and get |
| Line Items | 2 | List and get |
| Companies | 2 | List and get |
| Users | 1 | List users |
| Roles | 2 | List and get |
| And 27 more... | 53 | Targeting options, metadata, devices, etc. |

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Or install individually
pip install mcp httpx pydantic google-auth python-dotenv
```

## Authentication

Set one of the following environment variables:

### Option 1: OAuth Access Token
```bash
export AD_MANAGER_ACCESS_TOKEN="your-oauth-access-token"
```

### Option 2: Service Account (Recommended)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

## Usage

### Run with stdio transport (local)
```bash
python -m admanager_mcp
```

### Run with HTTP transport (remote)
```bash
TRANSPORT=http PORT=8001 python -m admanager_mcp
```

### Test with MCP Inspector
```bash
npx @modelcontextprotocol/inspector python -m admanager_mcp
```

## Tool Naming Convention

All tools follow the pattern: `admanager_{action}_{resource_path}`

Examples:
- `admanager_list_networks_ad_units` - List ad units
- `admanager_create_networks_placements` - Create placement
- `admanager_batch_activate_networks_teams` - Batch activate teams
- `admanager_run_networks_reports` - Run a report

## Example Conversations

### List your networks
```
User: What Ad Manager networks do I have access to?

Agent: Let me check your accessible networks.
[Calls admanager_list_networks]

You have access to 1 network:
- My Publisher Network (code: 123456789)
  Currency: USD, Timezone: America/New_York
```

### View ad units
```
User: Show me all active ad units

Agent: I'll list the ad units in your network.
[Calls admanager_list_networks_ad_units with filter='status = ACTIVE']

Found 15 active ad units:
1. Homepage_Banner (728x90) - ACTIVE
2. Article_Rectangle (300x250) - ACTIVE
...
```

### Generate a report
```
User: Create a report for last week's impressions by ad unit

Agent: I'll create and run a report for you.
[Calls admanager_create_networks_reports]
[Calls admanager_run_networks_reports]
[Calls admanager_fetch_rows_results]

# Report Results
| Ad Unit | Impressions | Clicks | CTR |
|---------|-------------|--------|-----|
| Homepage_Banner | 1,250,000 | 12,500 | 1.0% |
...
```

## Project Structure

```
admanager_mcp/
├── __init__.py          # Package initialization
├── __main__.py          # Module entry point
├── server.py            # Main MCP server (154 tools registered)
├── constants.py         # Configuration constants
├── models.py            # Pydantic input models (154 models)
├── api_client.py        # Ad Manager API client (154 methods)
├── utils.py             # Formatting and helpers
├── requirements.txt     # Dependencies
├── .env.example         # Environment template
└── tools/               # 47 tool modules
    ├── __init__.py      # Tool registration
    ├── adUnits.py       # Ad unit tools (9)
    ├── placements.py    # Placement tools (9)
    ├── teams.py         # Team tools (8)
    ├── reports.py       # Report tools (6)
    └── ...              # 42 more tool modules
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

## Code Generation

This server is auto-generated from the Google Ad Manager API discovery document using:

```bash
python scripts/generate_admanager_mcp.py
```

The generator creates:
- `api_client.py` with all 154 API methods
- `models.py` with 154 Pydantic input models
- `tools/*.py` with 47 tool modules
- `server.py` with complete registration

## API Coverage

**100% coverage** of the Google Ad Manager API v1 (154 endpoints across 47 resource groups).

## License

See LICENSE.txt in the repository root.
