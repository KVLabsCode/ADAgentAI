"""
Google Ad Manager Tools for CrewAI Agents.

These tools wrap the Ad Manager MCP server functionality for use with CrewAI agents.
Each tool is designed to be self-descriptive and return actionable data.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass
from crewai.tools import tool
from dotenv import load_dotenv

# Add parent directory to path for imports
ADMANAGER_MCP_PATH = Path(__file__).parent.parent.parent / "admanager_mcp"
if str(ADMANAGER_MCP_PATH.parent) not in sys.path:
    sys.path.insert(0, str(ADMANAGER_MCP_PATH.parent))

# Load environment variables
admanager_env_path = ADMANAGER_MCP_PATH / ".env"
if admanager_env_path.exists():
    load_dotenv(admanager_env_path)


@dataclass
class AdManagerResponse:
    """Response from Ad Manager API."""
    success: bool
    data: Any
    error: Optional[str] = None


def _run_async(coro) -> Any:
    """Helper to run async functions in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _get_client():
    """Get the Ad Manager API client."""
    from admanager_mcp.api_client import get_client
    return get_client()


def _format_response(response: AdManagerResponse) -> str:
    """Format response for agent consumption."""
    if not response.success:
        return f"Error: {response.error}"
    if isinstance(response.data, dict):
        return json.dumps(response.data, indent=2)
    elif isinstance(response.data, str):
        return response.data
    else:
        return str(response.data)


# =============================================================================
# NETWORK TOOLS
# =============================================================================

@tool("List Ad Manager Networks")
def list_networks(page_size: int = 20) -> str:
    """
    List all Ad Manager networks accessible with current credentials.

    Use this tool FIRST to discover available networks before performing
    any other operations. Returns network codes needed for other tools.

    Args:
        page_size: Number of networks to return (default 20)

    Returns:
        JSON with network details including network code, display name, and settings
    """
    try:
        client = _get_client()
        # The list_networks API doesn't need a network_code for the initial list
        result = _run_async(client.list_networks("", page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# AD UNIT TOOLS
# =============================================================================

@tool("List Ad Manager Ad Units")
def list_ad_units(network_code: str, page_size: int = 20, filter_str: str = "") -> str:
    """
    List all ad units in an Ad Manager network.

    Args:
        network_code: The network code (e.g., '12345678')
        page_size: Number of ad units to return (default 20)
        filter_str: Optional filter string

    Returns:
        JSON with ad unit details including ID, name, parent, sizes, and status
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_ad_units(
            network_code,
            page_size=page_size,
            filter_str=filter_str if filter_str else None
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Ad Unit")
def get_ad_unit(network_code: str, ad_unit_id: str) -> str:
    """
    Get details for a specific ad unit.

    Args:
        network_code: The network code
        ad_unit_id: The ad unit ID

    Returns:
        JSON with ad unit details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_ad_units(network_code, ad_unit_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Create Ad Manager Ad Unit")
def create_ad_unit(network_code: str, display_name: str, parent_ad_unit: str = "", ad_unit_code: str = "") -> str:
    """
    Create a new ad unit in Ad Manager.

    Args:
        network_code: The network code
        display_name: Display name for the ad unit
        parent_ad_unit: Optional parent ad unit resource name
        ad_unit_code: Optional custom ad unit code

    Returns:
        JSON with created ad unit details
    """
    try:
        client = _get_client()
        data = {"displayName": display_name}
        if parent_ad_unit:
            data["parentAdUnit"] = parent_ad_unit
        if ad_unit_code:
            data["adUnitCode"] = ad_unit_code

        result = _run_async(client.create_networks_ad_units(network_code, data))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Update Ad Manager Ad Unit")
def patch_ad_unit(network_code: str, ad_unit_id: str, updates_json: str) -> str:
    """
    Update an existing ad unit.

    Args:
        network_code: The network code
        ad_unit_id: The ad unit ID to update
        updates_json: JSON string with fields to update

    Returns:
        JSON with updated ad unit details
    """
    try:
        client = _get_client()
        updates = json.loads(updates_json)
        update_mask = ",".join(updates.keys())
        result = _run_async(client.patch_networks_ad_units(
            network_code, ad_unit_id, updates, update_mask
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# PLACEMENT TOOLS
# =============================================================================

@tool("List Ad Manager Placements")
def list_placements(network_code: str, page_size: int = 20, filter_str: str = "") -> str:
    """
    List all placements in an Ad Manager network.

    Placements are groups of ad units for targeting purposes.

    Args:
        network_code: The network code
        page_size: Number of placements to return (default 20)
        filter_str: Optional filter string

    Returns:
        JSON with placement details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_placements(
            network_code,
            page_size=page_size,
            filter_str=filter_str if filter_str else None
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Placement")
def get_placement(network_code: str, placement_id: str) -> str:
    """
    Get details for a specific placement.

    Args:
        network_code: The network code
        placement_id: The placement ID

    Returns:
        JSON with placement details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_placements(network_code, placement_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Create Ad Manager Placement")
def create_placement(network_code: str, display_name: str, description: str = "") -> str:
    """
    Create a new placement in Ad Manager.

    Args:
        network_code: The network code
        display_name: Display name for the placement
        description: Optional description

    Returns:
        JSON with created placement details
    """
    try:
        client = _get_client()
        data = {"displayName": display_name}
        if description:
            data["description"] = description

        result = _run_async(client.create_networks_placements(network_code, data))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# SITE TOOLS
# =============================================================================

@tool("List Ad Manager Sites")
def list_sites(network_code: str, page_size: int = 20, filter_str: str = "") -> str:
    """
    List all sites in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of sites to return (default 20)
        filter_str: Optional filter string

    Returns:
        JSON with site details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_sites(
            network_code,
            page_size=page_size,
            filter_str=filter_str if filter_str else None
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Site")
def get_site(network_code: str, site_id: str) -> str:
    """
    Get details for a specific site.

    Args:
        network_code: The network code
        site_id: The site ID

    Returns:
        JSON with site details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_sites(network_code, site_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# REPORT TOOLS
# =============================================================================

@tool("List Ad Manager Reports")
def list_reports(network_code: str, page_size: int = 20) -> str:
    """
    List all saved reports in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of reports to return (default 20)

    Returns:
        JSON with report details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_reports(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Report")
def get_report(network_code: str, report_id: str) -> str:
    """
    Get details for a specific report.

    Args:
        network_code: The network code
        report_id: The report ID

    Returns:
        JSON with report details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_reports(network_code, report_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Create Ad Manager Report")
def create_report(network_code: str, display_name: str, report_definition_json: str) -> str:
    """
    Create a new report in Ad Manager.

    Args:
        network_code: The network code
        display_name: Display name for the report
        report_definition_json: JSON string with report definition

    Returns:
        JSON with created report details
    """
    try:
        client = _get_client()
        data = json.loads(report_definition_json)
        data["displayName"] = display_name

        result = _run_async(client.create_networks_reports(network_code, data))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Run Ad Manager Report")
def run_report(network_code: str, report_id: str) -> str:
    """
    Execute a report and get the operation ID.

    After running, poll the operation until complete, then fetch results.

    Args:
        network_code: The network code
        report_id: The report ID to run

    Returns:
        JSON with operation details for polling
    """
    try:
        client = _get_client()
        result = _run_async(client.run_networks_reports(network_code, report_id, {}))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Fetch Ad Manager Report Results")
def fetch_report_results(network_code: str, report_id: str, results_id: str) -> str:
    """
    Fetch results from a completed report run.

    Args:
        network_code: The network code
        report_id: The report ID
        results_id: The results ID from the completed operation

    Returns:
        JSON with report data rows
    """
    try:
        client = _get_client()
        result = _run_async(client.fetch_rows_networks_reports_results(
            network_code, report_id, results_id
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# ORDER TOOLS
# =============================================================================

@tool("List Ad Manager Orders")
def list_orders(network_code: str, page_size: int = 20, filter_str: str = "") -> str:
    """
    List all orders in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of orders to return (default 20)
        filter_str: Optional filter string

    Returns:
        JSON with order details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_orders(
            network_code,
            page_size=page_size,
            filter_str=filter_str if filter_str else None
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Order")
def get_order(network_code: str, order_id: str) -> str:
    """
    Get details for a specific order.

    Args:
        network_code: The network code
        order_id: The order ID

    Returns:
        JSON with order details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_orders(network_code, order_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("List Ad Manager Line Items")
def list_line_items(network_code: str, page_size: int = 20, filter_str: str = "") -> str:
    """
    List all line items in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of line items to return (default 20)
        filter_str: Optional filter string

    Returns:
        JSON with line item details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_line_items(
            network_code,
            page_size=page_size,
            filter_str=filter_str if filter_str else None
        ))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Line Item")
def get_line_item(network_code: str, line_item_id: str) -> str:
    """
    Get details for a specific line item.

    Args:
        network_code: The network code
        line_item_id: The line item ID

    Returns:
        JSON with line item details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_line_items(network_code, line_item_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# PRIVATE AUCTION TOOLS
# =============================================================================

@tool("List Ad Manager Private Auctions")
def list_private_auctions(network_code: str, page_size: int = 20) -> str:
    """
    List all private auctions in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of private auctions to return (default 20)

    Returns:
        JSON with private auction details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_private_auctions(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Private Auction")
def get_private_auction(network_code: str, private_auction_id: str) -> str:
    """
    Get details for a specific private auction.

    Args:
        network_code: The network code
        private_auction_id: The private auction ID

    Returns:
        JSON with private auction details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_private_auctions(network_code, private_auction_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Create Ad Manager Private Auction")
def create_private_auction(network_code: str, display_name: str) -> str:
    """
    Create a new private auction in Ad Manager.

    Args:
        network_code: The network code
        display_name: Display name for the private auction

    Returns:
        JSON with created private auction details
    """
    try:
        client = _get_client()
        data = {"displayName": display_name}
        result = _run_async(client.create_networks_private_auctions(network_code, data))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("List Ad Manager Private Auction Deals")
def list_private_auction_deals(network_code: str, page_size: int = 20) -> str:
    """
    List all private auction deals in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of deals to return (default 20)

    Returns:
        JSON with private auction deal details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_private_auction_deals(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Private Auction Deal")
def get_private_auction_deal(network_code: str, deal_id: str) -> str:
    """
    Get details for a specific private auction deal.

    Args:
        network_code: The network code
        deal_id: The deal ID

    Returns:
        JSON with private auction deal details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_private_auction_deals(network_code, deal_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# TARGETING TOOLS
# =============================================================================

@tool("List Ad Manager Custom Targeting Keys")
def list_custom_targeting_keys(network_code: str, page_size: int = 20) -> str:
    """
    List all custom targeting keys in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of keys to return (default 20)

    Returns:
        JSON with custom targeting key details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_custom_targeting_keys(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Get Ad Manager Custom Targeting Key")
def get_custom_targeting_key(network_code: str, key_id: str) -> str:
    """
    Get details for a specific custom targeting key.

    Args:
        network_code: The network code
        key_id: The custom targeting key ID

    Returns:
        JSON with custom targeting key details
    """
    try:
        client = _get_client()
        result = _run_async(client.get_networks_custom_targeting_keys(network_code, key_id))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("Create Ad Manager Custom Targeting Key")
def create_custom_targeting_key(network_code: str, display_name: str, key_type: str = "PREDEFINED") -> str:
    """
    Create a new custom targeting key in Ad Manager.

    Args:
        network_code: The network code
        display_name: Display name for the key
        key_type: Key type (PREDEFINED or FREEFORM)

    Returns:
        JSON with created custom targeting key details
    """
    try:
        client = _get_client()
        data = {
            "displayName": display_name,
            "type": key_type
        }
        result = _run_async(client.create_networks_custom_targeting_keys(network_code, data))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("List Ad Manager Custom Targeting Values")
def list_custom_targeting_values(network_code: str, page_size: int = 20) -> str:
    """
    List all custom targeting values in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of values to return (default 20)

    Returns:
        JSON with custom targeting value details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_custom_targeting_values(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("List Ad Manager Audience Segments")
def list_audience_segments(network_code: str, page_size: int = 20) -> str:
    """
    List all audience segments in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of segments to return (default 20)

    Returns:
        JSON with audience segment details
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_audience_segments(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


@tool("List Ad Manager Geo Targets")
def list_geo_targets(network_code: str, page_size: int = 100) -> str:
    """
    List geo targeting options in an Ad Manager network.

    Args:
        network_code: The network code
        page_size: Number of geo targets to return (default 100)

    Returns:
        JSON with geo target details (countries, regions, cities, etc.)
    """
    try:
        client = _get_client()
        result = _run_async(client.list_networks_geo_targets(network_code, page_size=page_size))
        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# TOOL REGISTRY AND EXPORTS
# =============================================================================

def get_all_tools() -> list:
    """Return all Ad Manager tools for CrewAI agents."""
    return [
        # Network tools
        list_networks,
        # Ad unit tools
        list_ad_units,
        get_ad_unit,
        create_ad_unit,
        patch_ad_unit,
        # Placement tools
        list_placements,
        get_placement,
        create_placement,
        # Site tools
        list_sites,
        get_site,
        # Report tools
        list_reports,
        get_report,
        create_report,
        run_report,
        fetch_report_results,
        # Order tools
        list_orders,
        get_order,
        list_line_items,
        get_line_item,
        # Private auction tools
        list_private_auctions,
        get_private_auction,
        create_private_auction,
        list_private_auction_deals,
        get_private_auction_deal,
        # Targeting tools
        list_custom_targeting_keys,
        get_custom_targeting_key,
        create_custom_targeting_key,
        list_custom_targeting_values,
        list_audience_segments,
        list_geo_targets,
    ]


def get_tool_registry() -> dict:
    """
    Return a registry mapping tool names to tool functions.

    Used by the AgentFactory to filter tools by capability.
    """
    return {
        # Network tools
        "list_networks": list_networks,
        # Ad unit tools
        "list_ad_units": list_ad_units,
        "get_ad_unit": get_ad_unit,
        "create_ad_unit": create_ad_unit,
        "patch_ad_unit": patch_ad_unit,
        # Placement tools
        "list_placements": list_placements,
        "get_placement": get_placement,
        "create_placement": create_placement,
        # Site tools
        "list_sites": list_sites,
        "get_site": get_site,
        # Report tools
        "list_reports": list_reports,
        "get_report": get_report,
        "create_report": create_report,
        "run_report": run_report,
        "fetch_report_results": fetch_report_results,
        # Order tools
        "list_orders": list_orders,
        "get_order": get_order,
        "list_line_items": list_line_items,
        "get_line_item": get_line_item,
        # Private auction tools
        "list_private_auctions": list_private_auctions,
        "get_private_auction": get_private_auction,
        "create_private_auction": create_private_auction,
        "list_private_auction_deals": list_private_auction_deals,
        "get_private_auction_deal": get_private_auction_deal,
        # Targeting tools
        "list_custom_targeting_keys": list_custom_targeting_keys,
        "get_custom_targeting_key": get_custom_targeting_key,
        "create_custom_targeting_key": create_custom_targeting_key,
        "list_custom_targeting_values": list_custom_targeting_values,
        "list_audience_segments": list_audience_segments,
        "list_geo_targets": list_geo_targets,
    }
