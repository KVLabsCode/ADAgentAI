"""
Utility functions for AdMob MCP Server.

Provides formatting helpers, error handling, and response builders.
"""

import json
from typing import Any, Dict, List, Optional

from .api_client import AdMobAPIError
from .constants import CHARACTER_LIMIT


# =============================================================================
# Error Handling
# =============================================================================

def handle_api_error(e: Exception) -> str:
    """Format API errors into actionable, user-friendly messages."""
    if isinstance(e, AdMobAPIError):
        error_msg = f"Error: {e.message}"
        if e.details:
            if "fix" in e.details:
                error_msg += f"\n\nFix: {e.details['fix']}"
            elif "options" in e.details:
                error_msg += "\n\nOptions:\n" + "\n".join(f"  - {opt}" for opt in e.details["options"])
        return error_msg
    return f"Error: Unexpected error occurred: {type(e).__name__}: {str(e)}"


# =============================================================================
# Common Utilities
# =============================================================================

def format_currency(micros: int, currency_code: str = "USD") -> str:
    """Format micros value to currency string."""
    amount = micros / 1_000_000
    symbols = {"USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥"}
    symbol = symbols.get(currency_code, currency_code + " ")
    return f"{symbol}{amount:,.2f}"


def build_pagination_info(response: Dict[str, Any]) -> Dict[str, Any]:
    """Extract pagination info from API response."""
    next_token = response.get("nextPageToken")
    return {
        "has_more": next_token is not None,
        "next_page_token": next_token
    }


def format_json_response(data: Dict[str, Any], pagination: Optional[Dict[str, Any]] = None) -> str:
    """Format data as JSON string with optional pagination."""
    if pagination:
        data["pagination"] = pagination
    return json.dumps(data, indent=2, default=str)


def truncate_output(content: str, limit: int = CHARACTER_LIMIT) -> str:
    """Truncate content if it exceeds the limit."""
    if len(content) <= limit:
        return content
    return content[:limit - 100] + f"\n\n... (truncated, {len(content) - limit + 100} chars omitted)"


# =============================================================================
# Account Formatters
# =============================================================================

def format_account_markdown(account: Dict[str, Any]) -> str:
    """Format a single account as markdown."""
    lines = [
        f"### {account.get('name', 'Unknown')}",
        "",
        f"- **Publisher ID**: `{account.get('publisherId', 'N/A')}`",
        f"- **Currency**: {account.get('currencyCode', 'N/A')}",
        f"- **Timezone**: {account.get('reportingTimeZone', 'N/A')}",
        ""
    ]
    return "\n".join(lines)


def format_accounts_markdown(accounts: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of accounts as markdown."""
    if not accounts:
        return "# Accounts\n\nNo accounts found."

    lines = ["# AdMob Accounts", "", f"Found {len(accounts)} account(s)", ""]
    for account in accounts:
        lines.append(format_account_markdown(account))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# App Formatters
# =============================================================================

def format_app_markdown(app: Dict[str, Any]) -> str:
    """Format a single app as markdown."""
    lines = [
        f"### {app.get('displayName', 'Unknown')}",
        "",
        f"- **App ID**: `{app.get('appId', 'N/A')}`",
        f"- **Platform**: {app.get('platform', 'N/A')}",
        f"- **Store ID**: {app.get('linkedAppInfo', {}).get('appStoreId', 'N/A')}",
        f"- **Approval State**: {app.get('appApprovalState', 'N/A')}",
        ""
    ]
    return "\n".join(lines)


def format_apps_markdown(apps: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of apps as markdown."""
    if not apps:
        return "# Apps\n\nNo apps found."

    lines = ["# Apps", "", f"Found {len(apps)} app(s)", ""]
    for app in apps:
        lines.append(format_app_markdown(app))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Ad Unit Formatters
# =============================================================================

def format_ad_unit_markdown(ad_unit: Dict[str, Any]) -> str:
    """Format a single ad unit as markdown."""
    lines = [
        f"### {ad_unit.get('displayName', 'Unknown')}",
        "",
        f"- **Ad Unit ID**: `{ad_unit.get('adUnitId', 'N/A')}`",
        f"- **Format**: {ad_unit.get('adFormat', 'N/A')}",
        f"- **Ad Types**: {', '.join(ad_unit.get('adTypes', ['N/A']))}",
        f"- **App ID**: `{ad_unit.get('appId', 'N/A')}`",
        ""
    ]
    return "\n".join(lines)


def format_ad_units_markdown(ad_units: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of ad units as markdown."""
    if not ad_units:
        return "# Ad Units\n\nNo ad units found."

    lines = ["# Ad Units", "", f"Found {len(ad_units)} ad unit(s)", ""]
    for ad_unit in ad_units:
        lines.append(format_ad_unit_markdown(ad_unit))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Ad Unit Mapping Formatters
# =============================================================================

def format_ad_unit_mapping_markdown(mapping: Dict[str, Any]) -> str:
    """Format a single ad unit mapping as markdown."""
    lines = [
        f"### {mapping.get('displayName', 'Unknown')}",
        "",
        f"- **Mapping ID**: `{mapping.get('adUnitMappingId', 'N/A')}`",
        f"- **Ad Source ID**: `{mapping.get('adSourceId', 'N/A')}`",
        f"- **State**: {mapping.get('state', 'N/A')}",
        ""
    ]
    return "\n".join(lines)


def format_ad_unit_mappings_markdown(mappings: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of ad unit mappings as markdown."""
    if not mappings:
        return "# Ad Unit Mappings\n\nNo mappings found."

    lines = ["# Ad Unit Mappings", "", f"Found {len(mappings)} mapping(s)", ""]
    for mapping in mappings:
        lines.append(format_ad_unit_mapping_markdown(mapping))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Ad Source Formatters
# =============================================================================

def format_ad_source_markdown(ad_source: Dict[str, Any]) -> str:
    """Format a single ad source as markdown."""
    lines = [
        f"### {ad_source.get('title', 'Unknown')}",
        "",
        f"- **Ad Source ID**: `{ad_source.get('adSourceId', 'N/A')}`",
        f"- **Resource Name**: `{ad_source.get('name', 'N/A')}`",
        ""
    ]
    return "\n".join(lines)


def format_ad_sources_markdown(ad_sources: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of ad sources as markdown."""
    if not ad_sources:
        return "# Ad Sources\n\nNo ad sources found."

    lines = ["# Mediation Ad Sources", "", f"Found {len(ad_sources)} ad source(s)", ""]
    for ad_source in ad_sources:
        lines.append(format_ad_source_markdown(ad_source))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Adapter Formatters
# =============================================================================

def format_adapter_markdown(adapter: Dict[str, Any]) -> str:
    """Format a single adapter as markdown."""
    lines = [
        f"### {adapter.get('title', 'Unknown')}",
        "",
        f"- **Adapter ID**: `{adapter.get('adapterId', 'N/A')}`",
        f"- **Platforms**: {', '.join(adapter.get('supportedPlatforms', ['N/A']))}",
        f"- **Formats**: {', '.join(adapter.get('supportedFormats', ['N/A']))}",
        ""
    ]
    return "\n".join(lines)


def format_adapters_markdown(adapters: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of adapters as markdown."""
    if not adapters:
        return "# Adapters\n\nNo adapters found."

    lines = ["# Ad Source Adapters", "", f"Found {len(adapters)} adapter(s)", ""]
    for adapter in adapters:
        lines.append(format_adapter_markdown(adapter))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Mediation Group Formatters
# =============================================================================

def format_mediation_group_markdown(group: Dict[str, Any]) -> str:
    """Format a single mediation group as markdown."""
    targeting = group.get("targeting", {})
    lines = [
        f"### {group.get('displayName', 'Unknown')}",
        "",
        f"- **Mediation Group ID**: `{group.get('mediationGroupId', 'N/A')}`",
        f"- **State**: {group.get('state', 'N/A')}",
        f"- **Platform**: {targeting.get('platform', 'N/A')}",
        f"- **Format**: {targeting.get('format', 'N/A')}",
        f"- **Ad Units**: {len(targeting.get('adUnitIds', []))} targeted",
        ""
    ]

    # Add mediation lines summary
    lines_data = group.get("mediationGroupLines", {})
    if lines_data:
        lines.append(f"- **Mediation Lines**: {len(lines_data)} configured")

    lines.append("")
    return "\n".join(lines)


def format_mediation_groups_markdown(groups: List[Dict[str, Any]], pagination: Dict[str, Any]) -> str:
    """Format list of mediation groups as markdown."""
    if not groups:
        return "# Mediation Groups\n\nNo mediation groups found."

    lines = ["# Mediation Groups", "", f"Found {len(groups)} mediation group(s)", ""]
    for group in groups:
        lines.append(format_mediation_group_markdown(group))

    if pagination.get("has_more"):
        lines.append(f"*More available. Use page_token='{pagination.get('next_page_token')}'*")

    return "\n".join(lines)


# =============================================================================
# Experiment Formatters
# =============================================================================

def format_experiment_markdown(experiment: Dict[str, Any]) -> str:
    """Format a mediation A/B experiment as markdown."""
    lines = [
        "# Mediation A/B Experiment",
        "",
        f"- **Experiment ID**: `{experiment.get('experimentId', 'N/A')}`",
        f"- **Display Name**: {experiment.get('displayName', 'N/A')}",
        f"- **State**: {experiment.get('state', 'N/A')}",
        f"- **Start Time**: {experiment.get('startTime', 'N/A')}",
        f"- **End Time**: {experiment.get('endTime', 'Not set')}",
        ""
    ]
    return "\n".join(lines)


# =============================================================================
# Report Formatters
# =============================================================================

def format_report_markdown(report_data: Dict[str, Any], report_type: str = "Report") -> str:
    """Format report response as markdown table."""
    lines = [f"# {report_type}", ""]

    # Handle streaming response format
    rows = []
    header = None

    # API returns array of responses for streaming
    if isinstance(report_data, list):
        for item in report_data:
            if "header" in item:
                header = item["header"]
            if "row" in item:
                rows.append(item["row"])
    else:
        # Single response format
        header = report_data.get("header")
        rows = [report_data.get("row")] if report_data.get("row") else []

    if not rows:
        lines.append("No data returned for the specified parameters.")
        return "\n".join(lines)

    lines.append(f"Found {len(rows)} row(s)")
    lines.append("")

    # Build markdown table
    if rows:
        first_row = rows[0]
        dim_values = first_row.get("dimensionValues", {})
        metric_values = first_row.get("metricValues", {})

        # Headers
        headers = list(dim_values.keys()) + list(metric_values.keys())
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")

        # Rows (limit to first 50 for readability)
        for row in rows[:50]:
            dim_vals = row.get("dimensionValues", {})
            metric_vals = row.get("metricValues", {})

            row_values = []
            for h in headers:
                if h in dim_vals:
                    val = dim_vals[h].get("value", dim_vals[h].get("displayLabel", "N/A"))
                elif h in metric_vals:
                    val = metric_vals[h].get("microsValue", metric_vals[h].get("integerValue", "N/A"))
                    # Format currency values
                    if "microsValue" in metric_vals.get(h, {}):
                        val = format_currency(int(val))
                else:
                    val = "N/A"
                row_values.append(str(val))

            lines.append("| " + " | ".join(row_values) + " |")

        if len(rows) > 50:
            lines.append(f"\n*... and {len(rows) - 50} more rows*")

    return truncate_output("\n".join(lines))


# =============================================================================
# Generic Create/Update Response Formatters
# =============================================================================

def format_create_response_markdown(resource_type: str, resource: Dict[str, Any]) -> str:
    """Format a create operation response as markdown."""
    lines = [
        f"# {resource_type} Created Successfully",
        "",
        "```json",
        json.dumps(resource, indent=2, default=str),
        "```"
    ]
    return "\n".join(lines)


def format_update_response_markdown(resource_type: str, resource: Dict[str, Any]) -> str:
    """Format an update operation response as markdown."""
    lines = [
        f"# {resource_type} Updated Successfully",
        "",
        "```json",
        json.dumps(resource, indent=2, default=str),
        "```"
    ]
    return "\n".join(lines)
