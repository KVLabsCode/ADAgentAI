"""
AdMob Report Tools

Tools for generating mediation, network, and campaign reports.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    GenerateMediationReportInput, GenerateNetworkReportInput,
    GenerateCampaignReportInput, ResponseFormat
)
from ..utils import (
    handle_api_error,
    format_report_markdown,
    format_json_response,
)


def register_report_tools(mcp: FastMCP) -> None:
    """Register report-related tools with the MCP server."""

    @mcp.tool(
        name="admob_generate_mediation_report",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_generate_mediation_report(params: GenerateMediationReportInput) -> str:
        """
        Generate a mediation performance report.

        Mediation reports show how different ad sources (networks) perform
        in your mediation waterfall.

        Dimensions: DATE, MONTH, WEEK, AD_SOURCE, AD_SOURCE_INSTANCE, AD_UNIT,
        APP, MEDIATION_GROUP, COUNTRY, FORMAT, PLATFORM

        Metrics: AD_REQUESTS, CLICKS, ESTIMATED_EARNINGS, IMPRESSIONS,
        IMPRESSION_CTR, MATCHED_REQUESTS, MATCH_RATE, OBSERVED_ECPM
        """
        try:
            client = get_client()

            report_spec = {
                "dateRange": {
                    "startDate": {
                        "year": params.start_date.year,
                        "month": params.start_date.month,
                        "day": params.start_date.day
                    },
                    "endDate": {
                        "year": params.end_date.year,
                        "month": params.end_date.month,
                        "day": params.end_date.day
                    }
                },
                "dimensions": params.dimensions,
                "metrics": params.metrics,
                "maxReportRows": params.max_report_rows
            }

            # Add optional dimension filters
            if params.dimension_filters:
                report_spec["dimensionFilters"] = [
                    {
                        "dimension": f.dimension,
                        "matchesAny": {"values": f.values}
                    }
                    for f in params.dimension_filters
                ]

            # Add optional sort conditions
            if params.sort_conditions:
                sort_conditions = []
                for s in params.sort_conditions:
                    condition = {"order": s.order.value}
                    if s.dimension:
                        condition["dimension"] = s.dimension
                    if s.metric:
                        condition["metric"] = s.metric
                    sort_conditions.append(condition)
                report_spec["sortConditions"] = sort_conditions

            # Add optional localization settings
            if params.localization_settings:
                localization = {}
                if params.localization_settings.currency_code:
                    localization["currencyCode"] = params.localization_settings.currency_code
                if params.localization_settings.language_code:
                    localization["languageCode"] = params.localization_settings.language_code
                if localization:
                    report_spec["localizationSettings"] = localization

            # Add optional timezone
            if params.time_zone:
                report_spec["timeZone"] = params.time_zone

            response = await client.generate_mediation_report(params.account_id, report_spec)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_report_markdown(response, "Mediation Report")
            else:
                return format_json_response({"report": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_generate_network_report",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_generate_network_report(params: GenerateNetworkReportInput) -> str:
        """
        Generate a network performance report.

        Network reports show overall ad performance across your AdMob network.

        Dimensions: DATE, MONTH, WEEK, AD_UNIT, APP, AD_TYPE, COUNTRY,
        FORMAT, PLATFORM, MOBILE_OS_VERSION, GMA_SDK_VERSION

        Metrics: AD_REQUESTS, CLICKS, ESTIMATED_EARNINGS, IMPRESSIONS,
        IMPRESSION_CTR, IMPRESSION_RPM, MATCHED_REQUESTS, MATCH_RATE, SHOW_RATE
        """
        try:
            client = get_client()

            report_spec = {
                "dateRange": {
                    "startDate": {
                        "year": params.start_date.year,
                        "month": params.start_date.month,
                        "day": params.start_date.day
                    },
                    "endDate": {
                        "year": params.end_date.year,
                        "month": params.end_date.month,
                        "day": params.end_date.day
                    }
                },
                "dimensions": params.dimensions,
                "metrics": params.metrics,
                "maxReportRows": params.max_report_rows
            }

            # Add optional dimension filters
            if params.dimension_filters:
                report_spec["dimensionFilters"] = [
                    {
                        "dimension": f.dimension,
                        "matchesAny": {"values": f.values}
                    }
                    for f in params.dimension_filters
                ]

            # Add optional sort conditions
            if params.sort_conditions:
                sort_conditions = []
                for s in params.sort_conditions:
                    condition = {"order": s.order.value}
                    if s.dimension:
                        condition["dimension"] = s.dimension
                    if s.metric:
                        condition["metric"] = s.metric
                    sort_conditions.append(condition)
                report_spec["sortConditions"] = sort_conditions

            # Add optional localization settings
            if params.localization_settings:
                localization = {}
                if params.localization_settings.currency_code:
                    localization["currencyCode"] = params.localization_settings.currency_code
                if params.localization_settings.language_code:
                    localization["languageCode"] = params.localization_settings.language_code
                if localization:
                    report_spec["localizationSettings"] = localization

            # Add optional timezone
            if params.time_zone:
                report_spec["timeZone"] = params.time_zone

            response = await client.generate_network_report(params.account_id, report_spec)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_report_markdown(response, "Network Report")
            else:
                return format_json_response({"report": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_generate_campaign_report",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_generate_campaign_report(params: GenerateCampaignReportInput) -> str:
        """
        Generate a campaign performance report.

        Campaign reports show performance of your house ads and cross-promotion campaigns.

        Dimensions: DATE, CAMPAIGN_ID, CAMPAIGN_NAME, AD_ID, AD_NAME,
        PLACEMENT_ID, PLACEMENT_NAME, PLACEMENT_PLATFORM, COUNTRY, FORMAT

        Metrics: IMPRESSIONS, CLICKS, CLICK_THROUGH_RATE, INSTALLS,
        ESTIMATED_COST, AVERAGE_CPI, INTERACTIONS
        """
        try:
            client = get_client()

            report_spec = {
                "dateRange": {
                    "startDate": {
                        "year": params.start_date.year,
                        "month": params.start_date.month,
                        "day": params.start_date.day
                    },
                    "endDate": {
                        "year": params.end_date.year,
                        "month": params.end_date.month,
                        "day": params.end_date.day
                    }
                },
                "dimensions": params.dimensions,
                "metrics": params.metrics,
                "languageCode": params.language_code
            }

            # Add optional dimension filters
            if params.dimension_filters:
                report_spec["dimensionFilters"] = [
                    {
                        "dimension": f.dimension,
                        "matchesAny": {"values": f.values}
                    }
                    for f in params.dimension_filters
                ]

            # Add optional sort conditions
            if params.sort_conditions:
                sort_conditions = []
                for s in params.sort_conditions:
                    condition = {"order": s.order.value}
                    if s.dimension:
                        condition["dimension"] = s.dimension
                    if s.metric:
                        condition["metric"] = s.metric
                    sort_conditions.append(condition)
                report_spec["sortConditions"] = sort_conditions

            # Add optional localization settings
            if params.localization_settings:
                localization = {}
                if params.localization_settings.currency_code:
                    localization["currencyCode"] = params.localization_settings.currency_code
                if params.localization_settings.language_code:
                    localization["languageCode"] = params.localization_settings.language_code
                if localization:
                    report_spec["localizationSettings"] = localization

            # Add optional timezone
            if params.time_zone:
                report_spec["timeZone"] = params.time_zone

            response = await client.generate_campaign_report(params.account_id, report_spec)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_report_markdown(response, "Campaign Report")
            else:
                return format_json_response({"report": response})

        except Exception as e:
            return handle_api_error(e)
