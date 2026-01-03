"""
AdMob Tools for CrewAI Agents.

These tools wrap the MCP server functionality for use with CrewAI agents.
Each tool is designed to be self-descriptive and return actionable data.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Optional
from crewai.tools import tool

from .mcp_client import get_mcp_client, MCPResponse


def _run_async(coro) -> Any:
    """Helper to run async functions in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _format_response(response: MCPResponse) -> str:
    """Format MCP response for agent consumption."""
    if not response.success:
        return f"Error: {response.error}"

    if isinstance(response.data, dict):
        return json.dumps(response.data, indent=2)
    elif isinstance(response.data, str):
        return response.data
    else:
        return str(response.data)


@tool("List AdMob Accounts")
def list_accounts(page_size: int = 20) -> str:
    """
    List all AdMob publisher accounts accessible with current credentials.

    Use this tool FIRST to discover available accounts before performing
    any other operations. Returns account IDs needed for other tools.

    Args:
        page_size: Number of accounts to return (1-100, default 20)

    Returns:
        JSON with account details including publisher IDs, currency, and timezone
    """
    client = get_mcp_client()
    response = _run_async(client.list_accounts(page_size=page_size))
    return _format_response(response)


@tool("Get AdMob Account Details")
def get_account(account_id: str) -> str:
    """
    Get detailed information for a specific AdMob account.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')

    Returns:
        JSON with account name, publisher ID, currency code, and reporting timezone
    """
    client = get_mcp_client()
    response = _run_async(client.get_account(account_id=account_id))
    return _format_response(response)


@tool("List AdMob Apps")
def list_apps(account_id: str, page_size: int = 20) -> str:
    """
    List all apps registered under an AdMob account.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        page_size: Number of apps to return (1-100, default 20)

    Returns:
        JSON with app details including app ID, platform (iOS/Android),
        approval state, app store ID, and display name
    """
    client = get_mcp_client()
    response = _run_async(client.list_apps(account_id=account_id, page_size=page_size))
    return _format_response(response)


@tool("List AdMob Ad Units")
def list_ad_units(account_id: str, page_size: int = 20) -> str:
    """
    List all ad units configured under an AdMob account.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        page_size: Number of ad units to return (1-100, default 20)

    Returns:
        JSON with ad unit details including ad unit ID, format
        (BANNER, INTERSTITIAL, REWARDED, etc.), associated app ID,
        display name, and ad types (RICH_MEDIA, VIDEO)
    """
    client = get_mcp_client()
    response = _run_async(client.list_ad_units(account_id=account_id, page_size=page_size))
    return _format_response(response)


@tool("Create AdMob App")
def create_app(account_id: str, app_store_id: str, display_name: str = "") -> str:
    """
    Create a new app in AdMob by linking it from an app store.

    NOTE: This endpoint requires special access. If you see a 403 permission
    denied error, contact your Google account manager for access.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        app_store_id: App store ID (e.g., 'com.example.app' for Android,
                     '123456789' for iOS)
        display_name: Optional display name for the app

    Returns:
        JSON with created app details
    """
    client = get_mcp_client()
    response = _run_async(client.create_app(
        account_id=account_id,
        app_store_id=app_store_id,
        display_name=display_name if display_name else None
    ))
    return _format_response(response)


@tool("Create AdMob Ad Unit")
def create_ad_unit(
    account_id: str,
    app_id: str,
    display_name: str,
    ad_format: str,
    ad_types: str = ""
) -> str:
    """
    Create a new ad unit under an AdMob account.

    NOTE: This endpoint requires special access.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        app_id: App ID this ad unit belongs to
        display_name: Display name for the ad unit (max 80 chars)
        ad_format: Format type (BANNER, INTERSTITIAL, REWARDED, REWARDED_INTERSTITIAL,
                  NATIVE, APP_OPEN)
        ad_types: Comma-separated ad types (RICH_MEDIA, VIDEO), optional

    Returns:
        JSON with created ad unit details
    """
    client = get_mcp_client()
    types_list = ad_types.split(",") if ad_types else None
    response = _run_async(client.create_ad_unit(
        account_id=account_id,
        app_id=app_id,
        display_name=display_name,
        ad_format=ad_format,
        ad_types=types_list
    ))
    return _format_response(response)


@tool("List Ad Unit Mappings")
def list_ad_unit_mappings(account_id: str, ad_unit_id: str, page_size: int = 20) -> str:
    """
    List ad unit mappings for a specific ad unit.

    Ad unit mappings connect ad units to ad sources (ad networks) for mediation.

    NOTE: This endpoint requires special access.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        ad_unit_id: Ad unit ID to get mappings for
        page_size: Number of mappings to return (1-100, default 20)

    Returns:
        JSON with ad unit mapping details including ad source connections
    """
    client = get_mcp_client()
    response = _run_async(client.list_ad_unit_mappings(
        account_id=account_id,
        ad_unit_id=ad_unit_id,
        page_size=page_size
    ))
    return _format_response(response)


@tool("Create Ad Unit Mapping")
def create_ad_unit_mapping(
    account_id: str,
    ad_unit_id: str,
    ad_source_id: str,
    display_name: str
) -> str:
    """
    Create an ad unit mapping to connect an ad unit to an ad source.

    NOTE: This endpoint requires special access.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        ad_unit_id: Ad unit ID to create mapping for
        ad_source_id: Ad source (network) ID to connect
        display_name: Display name for the mapping

    Returns:
        JSON with created ad unit mapping details
    """
    client = get_mcp_client()
    response = _run_async(client.create_ad_unit_mapping(
        account_id=account_id,
        ad_unit_id=ad_unit_id,
        ad_source_id=ad_source_id,
        display_name=display_name
    ))
    return _format_response(response)


@tool("Batch Create Ad Unit Mappings")
def batch_create_ad_unit_mappings(
    account_id: str,
    mappings_json: str
) -> str:
    """
    Batch create ad unit mappings (up to 100 at once).

    Create multiple ad unit mappings in a single request.
    Useful for setting up mediation across many ad units quickly.

    NOTE: This endpoint requires special access.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        mappings_json: JSON array of mappings, each with:
                       - adUnitId: Ad unit ID
                       - adUnitMapping: {adSourceId, displayName, adUnitConfigurations?}
                       Example: '[{"adUnitId":"...", "adUnitMapping":{"adSourceId":"...", "displayName":"..."}}]'

    Returns:
        JSON with created ad unit mappings
    """
    import json as json_lib
    client = get_mcp_client()
    try:
        mappings = json_lib.loads(mappings_json)
    except json_lib.JSONDecodeError as e:
        return f"Error: Invalid JSON - {e}"

    response = _run_async(client.batch_create_ad_unit_mappings(
        account_id=account_id,
        mappings=mappings
    ))
    return _format_response(response)


@tool("List Mediation Ad Sources")
def list_ad_sources(account_id: str, page_size: int = 100) -> str:
    """
    List all mediation ad sources (ad networks) available for an account.

    Ad sources are the ad networks that can be used in mediation groups,
    including AdMob, Facebook Audience Network, AppLovin, Unity Ads,
    ironSource, Vungle, Chartboost, and many more.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        page_size: Number of ad sources to return (1-10000, default 100)

    Returns:
        JSON with ad source details including ad source ID, name, and title
    """
    client = get_mcp_client()
    response = _run_async(client.list_ad_sources(account_id=account_id, page_size=page_size))
    return _format_response(response)


@tool("List Ad Source Adapters")
def list_adapters(account_id: str, ad_source_id: str, page_size: int = 100) -> str:
    """
    List adapters for a specific ad source.

    Adapters are SDK integrations that enable an ad source to work with
    AdMob mediation. Shows supported platforms and ad formats.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        ad_source_id: Ad source ID to get adapters for
        page_size: Number of adapters to return (1-10000, default 100)

    Returns:
        JSON with adapter details including supported platforms and formats
    """
    client = get_mcp_client()
    response = _run_async(client.list_adapters(
        account_id=account_id,
        ad_source_id=ad_source_id,
        page_size=page_size
    ))
    return _format_response(response)


@tool("List Mediation Groups")
def list_mediation_groups(account_id: str, page_size: int = 20, filter_str: Optional[str] = None) -> str:
    """
    List all mediation groups under an AdMob account.

    Mediation groups define how ad networks compete for ad requests.
    Returns mediation group ID, display name, state, targeting, and lines.

    NOTE: This endpoint requires special access.

    Filter examples:
    - IN(PLATFORM, "ANDROID")
    - IN(FORMAT, "BANNER")
    - IN(STATE, "ENABLED")

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        page_size: Number of groups to return (1-100, default 20)
        filter_str: Optional filter string

    Returns:
        JSON with mediation group details
    """
    client = get_mcp_client()
    response = _run_async(client.list_mediation_groups(
        account_id=account_id,
        page_size=page_size,
        filter_str=filter_str
    ))
    return _format_response(response)


@tool("Create Mediation Group")
def create_mediation_group(
    account_id: str,
    display_name: str,
    platform: str,
    ad_format: str,
    ad_unit_ids: str,
    state: str = "ENABLED"
) -> str:
    """
    Create a new mediation group under an AdMob account.

    Mediation groups control which ad networks compete for ad requests
    and how they're prioritized.

    NOTE: This endpoint requires special access.

    Args:
        account_id: Publisher account ID
        display_name: Display name (max 120 chars)
        platform: Target platform (IOS, ANDROID)
        ad_format: Ad format (BANNER, INTERSTITIAL, REWARDED, etc.)
        ad_unit_ids: Comma-separated list of ad unit IDs to include
        state: ENABLED or DISABLED (default ENABLED)

    Returns:
        JSON with created mediation group details
    """
    client = get_mcp_client()
    targeting = {
        "platform": platform,
        "format": ad_format,
        "adUnitIds": ad_unit_ids.split(","),
    }
    response = _run_async(client.create_mediation_group(
        account_id=account_id,
        display_name=display_name,
        targeting=targeting,
        state=state
    ))
    return _format_response(response)


@tool("Update Mediation Group")
def update_mediation_group(
    account_id: str,
    mediation_group_id: str,
    display_name: str = "",
    state: str = "",
    ad_unit_ids: str = ""
) -> str:
    """
    Update an existing mediation group.

    NOTE: This endpoint requires special access.

    Args:
        account_id: Publisher account ID
        mediation_group_id: Mediation group ID to update
        display_name: Optional new display name
        state: Optional new state (ENABLED/DISABLED)
        ad_unit_ids: Optional comma-separated list of updated ad unit IDs

    Returns:
        JSON with updated mediation group details
    """
    client = get_mcp_client()

    mediation_group_data = {}
    update_fields = []

    if display_name:
        mediation_group_data["displayName"] = display_name
        update_fields.append("displayName")

    if state:
        mediation_group_data["state"] = state
        update_fields.append("state")

    if ad_unit_ids:
        mediation_group_data["targeting"] = {"adUnitIds": ad_unit_ids.split(",")}
        update_fields.append("targeting.adUnitIds")

    if not update_fields:
        return "Error: No fields to update. Provide at least one field to change."

    update_mask = ",".join(update_fields)

    response = _run_async(client.update_mediation_group(
        account_id=account_id,
        mediation_group_id=mediation_group_id,
        mediation_group_data=mediation_group_data,
        update_mask=update_mask
    ))
    return _format_response(response)


@tool("Create Mediation A/B Experiment")
def create_mediation_ab_experiment(
    account_id: str,
    mediation_group_id: str,
    display_name: str,
    traffic_percentage: int
) -> str:
    """
    Create an A/B testing experiment for a mediation group.

    A/B experiments let you test different mediation configurations to
    optimize ad performance.

    NOTE: This endpoint requires special access.

    Args:
        account_id: Publisher account ID
        mediation_group_id: Mediation group to experiment on
        display_name: Experiment name
        traffic_percentage: Percentage of traffic for experiment variant (1-99)

    Returns:
        JSON with created experiment details
    """
    client = get_mcp_client()
    response = _run_async(client.create_mediation_ab_experiment(
        account_id=account_id,
        mediation_group_id=mediation_group_id,
        display_name=display_name,
        traffic_percentage=traffic_percentage
    ))
    return _format_response(response)


@tool("Stop Mediation A/B Experiment")
def stop_mediation_ab_experiment(
    account_id: str,
    mediation_group_id: str,
    variant_choice: str
) -> str:
    """
    Stop a mediation A/B experiment and choose the winning variant.

    This will apply the chosen variant's configuration to the mediation group.

    NOTE: This endpoint requires special access.

    Args:
        account_id: Publisher account ID
        mediation_group_id: Mediation group with the experiment
        variant_choice: ORIGINAL (keep original) or EXPERIMENT (apply experiment)

    Returns:
        JSON with stopped experiment details
    """
    client = get_mcp_client()
    response = _run_async(client.stop_mediation_ab_experiment(
        account_id=account_id,
        mediation_group_id=mediation_group_id,
        variant_choice=variant_choice
    ))
    return _format_response(response)


@tool("Generate Mediation Report")
def generate_mediation_report(
    account_id: str,
    days_back: int = 7,
    dimensions: str = "DATE,AD_SOURCE",
    metrics: str = "ESTIMATED_EARNINGS,IMPRESSIONS,OBSERVED_ECPM",
) -> str:
    """
    Generate a mediation performance report showing ad source performance.

    Use this to analyze how different ad networks/sources are performing.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        days_back: Number of days to look back (default 7)
        dimensions: Comma-separated dimensions (DATE, AD_SOURCE, AD_UNIT, APP,
                   MEDIATION_GROUP, COUNTRY, FORMAT, PLATFORM)
        metrics: Comma-separated metrics (ESTIMATED_EARNINGS, IMPRESSIONS,
                AD_REQUESTS, CLICKS, OBSERVED_ECPM, MATCH_RATE)

    Returns:
        JSON report with performance data by the specified dimensions
    """
    client = get_mcp_client()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    response = _run_async(
        client.generate_mediation_report(
            account_id=account_id,
            start_date={
                "year": start_date.year,
                "month": start_date.month,
                "day": start_date.day,
            },
            end_date={
                "year": end_date.year,
                "month": end_date.month,
                "day": end_date.day,
            },
            dimensions=dimensions.split(","),
            metrics=metrics.split(","),
        )
    )
    return _format_response(response)


@tool("Generate Network Report")
def generate_network_report(
    account_id: str,
    days_back: int = 7,
    dimensions: str = "DATE,AD_UNIT",
    metrics: str = "ESTIMATED_EARNINGS,IMPRESSIONS,IMPRESSION_RPM",
) -> str:
    """
    Generate an overall network performance report.

    Use this for high-level revenue and performance analysis.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        days_back: Number of days to look back (default 7)
        dimensions: Comma-separated dimensions (DATE, AD_UNIT, APP,
                   COUNTRY, FORMAT, PLATFORM, AD_TYPE)
        metrics: Comma-separated metrics (ESTIMATED_EARNINGS, IMPRESSIONS,
                AD_REQUESTS, CLICKS, IMPRESSION_RPM, MATCH_RATE, SHOW_RATE)

    Returns:
        JSON report with overall network performance data
    """
    client = get_mcp_client()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    response = _run_async(
        client.generate_network_report(
            account_id=account_id,
            start_date={
                "year": start_date.year,
                "month": start_date.month,
                "day": start_date.day,
            },
            end_date={
                "year": end_date.year,
                "month": end_date.month,
                "day": end_date.day,
            },
            dimensions=dimensions.split(","),
            metrics=metrics.split(","),
        )
    )
    return _format_response(response)


@tool("Generate Campaign Report")
def generate_campaign_report(
    account_id: str,
    days_back: int = 7,
    dimensions: str = "DATE,CAMPAIGN_ID",
    metrics: str = "IMPRESSIONS,CLICKS,INSTALLS",
) -> str:
    """
    Generate a campaign performance report.

    Campaign reports show performance of your house ads and cross-promotion campaigns.

    Args:
        account_id: The publisher account ID (e.g., 'pub-1234567890123456')
        days_back: Number of days to look back (default 7)
        dimensions: Comma-separated dimensions (DATE, CAMPAIGN_ID, CAMPAIGN_NAME,
                   AD_ID, AD_NAME, COUNTRY, FORMAT)
        metrics: Comma-separated metrics (IMPRESSIONS, CLICKS, CLICK_THROUGH_RATE,
                INSTALLS, ESTIMATED_COST, AVERAGE_CPI)

    Returns:
        JSON report with campaign performance data
    """
    client = get_mcp_client()

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    response = _run_async(
        client.generate_campaign_report(
            account_id=account_id,
            start_date={
                "year": start_date.year,
                "month": start_date.month,
                "day": start_date.day,
            },
            end_date={
                "year": end_date.year,
                "month": end_date.month,
                "day": end_date.day,
            },
            dimensions=dimensions.split(","),
            metrics=metrics.split(","),
        )
    )
    return _format_response(response)


def get_all_tools() -> list:
    """Return all AdMob tools for CrewAI agents."""
    return [
        # Account tools
        list_accounts,
        get_account,
        # App tools
        list_apps,
        create_app,
        # Ad unit tools
        list_ad_units,
        create_ad_unit,
        list_ad_unit_mappings,
        create_ad_unit_mapping,
        batch_create_ad_unit_mappings,
        # Ad source tools
        list_ad_sources,
        list_adapters,
        # Mediation group tools
        list_mediation_groups,
        create_mediation_group,
        update_mediation_group,
        # A/B experiment tools
        create_mediation_ab_experiment,
        stop_mediation_ab_experiment,
        # Report tools
        generate_mediation_report,
        generate_network_report,
        generate_campaign_report,
    ]


def get_read_only_tools() -> list:
    """Return only read/list tools (safe for analysis, no write operations)."""
    return [
        # Account tools
        list_accounts,
        get_account,
        # App tools
        list_apps,
        # Ad unit tools
        list_ad_units,
        list_ad_unit_mappings,
        # Ad source tools
        list_ad_sources,
        list_adapters,
        # Mediation group tools
        list_mediation_groups,
        # Report tools
        generate_mediation_report,
        generate_network_report,
        generate_campaign_report,
    ]


def get_tool_registry() -> dict:
    """
    Return a registry mapping tool names to tool functions.

    Used by the AgentFactory to filter tools by capability.
    """
    return {
        # Account tools
        "list_accounts": list_accounts,
        "get_account": get_account,
        # App tools
        "list_apps": list_apps,
        "create_app": create_app,
        # Ad unit tools
        "list_ad_units": list_ad_units,
        "create_ad_unit": create_ad_unit,
        "list_ad_unit_mappings": list_ad_unit_mappings,
        "create_ad_unit_mapping": create_ad_unit_mapping,
        "batch_create_ad_unit_mappings": batch_create_ad_unit_mappings,
        # Ad source tools
        "list_ad_sources": list_ad_sources,
        "list_adapters": list_adapters,
        # Mediation group tools
        "list_mediation_groups": list_mediation_groups,
        "create_mediation_group": create_mediation_group,
        "update_mediation_group": update_mediation_group,
        # A/B experiment tools
        "create_mediation_ab_experiment": create_mediation_ab_experiment,
        "stop_mediation_ab_experiment": stop_mediation_ab_experiment,
        # Report tools
        "generate_mediation_report": generate_mediation_report,
        "generate_network_report": generate_network_report,
        "generate_campaign_report": generate_campaign_report,
    }
