# MCP Tools Catalog

This document provides a summary of the Model Context Protocol (MCP) tools available to the AD Agent AI. These tools are automatically generated from Google Discovery and OpenAPI specifications.

## Architecture Overview

The MCP infrastructure is modular and professional. Each ad network is a dedicated server logic module within the `mcp_servers` package.

- **Specs**: Located in `backend/api_specs/`
- **Logic**: Located in `backend/mcp_servers/providers/`
- **Unified Server**: `backend/mcp_servers/server.py` (Mounts all providers)

## Tool Summary (Verified)

| Provider | Tool Count | CRUD | Primary Use Cases |
| :--- | :--- | :--- | :--- |
| **Google Ad Manager** | 154 | Full | Full enterprise inventory & reporting. |
| **AdMob** | 19 | Full | Mediation, reports, and A/B tests. |
| **Unity LevelPlay** | 16 | Full | Instances v4, Groups, and Placements. |
| **AppLovin MAX** | 13 | C, R, U | Experiments, Ad Review, and Reporting. |
| **InMobi** | 12 | Full | Inventory, Mediation, and Segments. |
| **Liftoff Monetize** | 11 | C, R, U | Publisher Management and Data API. |
| **Mintegral** | 10 | C, R, U | Async Reporting and Targeting. |
| **DT Exchange** | 10 | C, R, U | FairBid Apps and Placements. |
| **Pangle** | 7 | C, R, U | Applications and Ad Slots. |

**Total Verified Tools**: 252

## Advanced Orchestration

In addition to the raw API tools, the **Master Controller** (`mcp_servers/server.py`) includes "Curated Tools" that orchestrate complex cross-network workflows:

- `full_unity_admob_integration`: Automates the creation of Unity placements and their mapping to AdMob mediation.
- `global_revenue_summary`: (In Progress) Aggregates reporting data from all enabled networks.

## Testing

To test and visualize these tools, use the **MCP Inspector**:

```bash
# Test all networks at once
cd backend
uv run fastmcp dev mcp_servers/server.py

# Test a specific network (e.g., Unity)
cd backend
uv run fastmcp dev mcp_servers/providers/unity.py
```