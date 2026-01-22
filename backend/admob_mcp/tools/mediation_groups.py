"""
AdMob Mediation Group Tools

Tools for managing mediation groups and A/B experiments.
Mediation groups control how ad networks compete to fill ad requests.
"""

from mcp.server.fastmcp import FastMCP

from ..api_client import get_client
from ..models import (
    ListMediationGroupsInput, CreateMediationGroupInput, UpdateMediationGroupInput,
    CreateMediationAbExperimentInput, StopMediationAbExperimentInput,
    ResponseFormat
)
from ..utils import (
    handle_api_error,
    format_mediation_groups_markdown,
    format_mediation_group_markdown,
    format_experiment_markdown,
    format_json_response,
    format_create_response_markdown,
    format_update_response_markdown,
    build_pagination_info,
)


def register_mediation_group_tools(mcp: FastMCP) -> None:
    """Register mediation group-related tools with the MCP server."""

    @mcp.tool(
        name="admob_list_mediation_groups",
        annotations={"readOnlyHint": True, "idempotentHint": True}
    )
    async def admob_list_mediation_groups(params: ListMediationGroupsInput) -> str:
        """
        List all mediation groups under an AdMob account.

        Mediation groups define how ad networks compete for ad requests.
        Returns mediation group ID, display name, state, targeting, and lines.

        NOTE: This endpoint requires special access.

        Filter examples:
        - IN(PLATFORM, "ANDROID")
        - IN(FORMAT, "BANNER")
        - IN(STATE, "ENABLED")
        """
        try:
            client = get_client()
            response = await client.list_mediation_groups(
                account_id=params.account_id,
                page_size=params.page_size,
                page_token=params.page_token,
                filter_str=params.filter
            )

            groups = response.get("mediationGroups", [])
            pagination = build_pagination_info(response)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_mediation_groups_markdown(groups, pagination)
            else:
                return format_json_response({"mediationGroups": groups}, pagination)

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_create_mediation_group",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_create_mediation_group(params: CreateMediationGroupInput) -> str:
        """
        Create a new mediation group under an AdMob account.

        Mediation groups control which ad networks compete for ad requests
        and how they're prioritized.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            display_name: Display name (max 120 chars)
            targeting: Targeting configuration with platform, format, ad_unit_ids
            state: ENABLED or DISABLED
        """
        try:
            client = get_client()

            mediation_group_data = {
                "displayName": params.display_name,
                "state": params.state.value,
                "targeting": {
                    "platform": params.targeting.platform.value,
                    "format": params.targeting.format.value,
                    "adUnitIds": params.targeting.ad_unit_ids,
                }
            }

            if params.targeting.targeted_region_codes:
                mediation_group_data["targeting"]["targetedRegionCodes"] = params.targeting.targeted_region_codes

            if params.targeting.excluded_region_codes:
                mediation_group_data["targeting"]["excludedRegionCodes"] = params.targeting.excluded_region_codes

            if params.targeting.idfa_targeting:
                mediation_group_data["targeting"]["idfaTargeting"] = params.targeting.idfa_targeting.value

            # Add mediation group lines (waterfall configuration)
            if params.mediation_group_lines:
                lines_data = {}
                for idx, line in enumerate(params.mediation_group_lines):
                    # Use provided line_id or generate one
                    line_id = line.line_id or f"line_{idx}"
                    line_data = {
                        "displayName": line.display_name,
                        "adSourceId": line.ad_source_id,
                        "cpmMode": line.cpm_mode.value,
                        "state": line.state.value,
                    }
                    if line.cpm_micros is not None:
                        line_data["cpmMicros"] = str(line.cpm_micros)
                    if line.ad_unit_mappings:
                        line_data["adUnitMappings"] = line.ad_unit_mappings
                    if line.experiment_variant:
                        line_data["experimentVariant"] = line.experiment_variant.value
                    lines_data[line_id] = line_data
                mediation_group_data["mediationGroupLines"] = lines_data

            response = await client.create_mediation_group(params.account_id, mediation_group_data)

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_create_response_markdown("Mediation Group", response)
            else:
                return format_json_response({"mediationGroup": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_update_mediation_group",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": True}
    )
    async def admob_update_mediation_group(params: UpdateMediationGroupInput) -> str:
        """
        Update an existing mediation group.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            mediation_group_id: Mediation group ID to update
            display_name: Optional new display name
            state: Optional new state (ENABLED/DISABLED)
            targeting_ad_unit_ids: Optional updated list of ad unit IDs
        """
        try:
            client = get_client()

            # Build update data and mask
            mediation_group_data = {}
            update_fields = []

            if params.display_name:
                mediation_group_data["displayName"] = params.display_name
                update_fields.append("displayName")

            if params.state:
                mediation_group_data["state"] = params.state.value
                update_fields.append("state")

            # Handle targeting updates - prefer full targeting object if provided
            if params.targeting:
                targeting_data = {}
                if params.targeting.ad_unit_ids:
                    targeting_data["adUnitIds"] = params.targeting.ad_unit_ids
                    update_fields.append("targeting.adUnitIds")
                if params.targeting.targeted_region_codes:
                    targeting_data["targetedRegionCodes"] = params.targeting.targeted_region_codes
                    update_fields.append("targeting.targetedRegionCodes")
                if params.targeting.excluded_region_codes:
                    targeting_data["excludedRegionCodes"] = params.targeting.excluded_region_codes
                    update_fields.append("targeting.excludedRegionCodes")
                if params.targeting.idfa_targeting:
                    targeting_data["idfaTargeting"] = params.targeting.idfa_targeting.value
                    update_fields.append("targeting.idfaTargeting")
                if targeting_data:
                    mediation_group_data["targeting"] = targeting_data
            elif params.targeting_ad_unit_ids:
                # Backward compatibility: use shorthand targeting_ad_unit_ids
                mediation_group_data["targeting"] = {"adUnitIds": params.targeting_ad_unit_ids}
                update_fields.append("targeting.adUnitIds")

            # Handle mediation group lines (waterfall) updates
            if params.mediation_group_lines:
                lines_data = {}
                for idx, line in enumerate(params.mediation_group_lines):
                    # Use provided line_id or generate one
                    line_id = line.line_id or f"line_{idx}"
                    line_data = {
                        "displayName": line.display_name,
                        "adSourceId": line.ad_source_id,
                        "cpmMode": line.cpm_mode.value,
                        "state": line.state.value,
                    }
                    if line.cpm_micros is not None:
                        line_data["cpmMicros"] = str(line.cpm_micros)
                    if line.ad_unit_mappings:
                        line_data["adUnitMappings"] = line.ad_unit_mappings
                    if line.experiment_variant:
                        line_data["experimentVariant"] = line.experiment_variant.value
                    lines_data[line_id] = line_data
                mediation_group_data["mediationGroupLines"] = lines_data
                update_fields.append("mediationGroupLines")

            if not update_fields:
                return "Error: No fields to update. Provide at least one field to change."

            update_mask = ",".join(update_fields)

            response = await client.update_mediation_group(
                params.account_id, params.mediation_group_id,
                mediation_group_data, update_mask
            )

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_update_response_markdown("Mediation Group", response)
            else:
                return format_json_response({"mediationGroup": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_create_mediation_ab_experiment",
        annotations={"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False}
    )
    async def admob_create_mediation_ab_experiment(params: CreateMediationAbExperimentInput) -> str:
        """
        Create an A/B testing experiment for a mediation group.

        A/B experiments let you test different mediation configurations to
        optimize ad performance.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            mediation_group_id: Mediation group to experiment on
            display_name: Experiment name
            traffic_percentage: % of traffic for experiment variant (1-99)
        """
        try:
            client = get_client()

            experiment_data = {
                "displayName": params.display_name,
                "trafficPercentage": params.traffic_percentage,
            }

            # Add treatment mediation lines if provided
            if params.treatment_mediation_lines:
                lines_data = {}
                for idx, line in enumerate(params.treatment_mediation_lines):
                    line_id = line.line_id or f"line_{idx}"
                    line_data = {
                        "displayName": line.display_name,
                        "adSourceId": line.ad_source_id,
                        "cpmMode": line.cpm_mode.value,
                        "state": line.state.value,
                    }
                    if line.cpm_micros is not None:
                        line_data["cpmMicros"] = str(line.cpm_micros)
                    if line.ad_unit_mappings:
                        line_data["adUnitMappings"] = line.ad_unit_mappings
                    if line.experiment_variant:
                        line_data["experimentVariant"] = line.experiment_variant.value
                    lines_data[line_id] = line_data
                experiment_data["treatmentMediationLines"] = lines_data

            response = await client.create_mediation_ab_experiment(
                params.account_id, params.mediation_group_id, experiment_data
            )

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_experiment_markdown(response)
            else:
                return format_json_response({"mediationAbExperiment": response})

        except Exception as e:
            return handle_api_error(e)

    @mcp.tool(
        name="admob_stop_mediation_ab_experiment",
        annotations={"readOnlyHint": False, "destructiveHint": True, "idempotentHint": False}
    )
    async def admob_stop_mediation_ab_experiment(params: StopMediationAbExperimentInput) -> str:
        """
        Stop a mediation A/B experiment and choose the winning variant.

        This will apply the chosen variant's configuration to the mediation group.

        NOTE: This endpoint requires special access.

        Args:
            account_id: Publisher account ID
            mediation_group_id: Mediation group with the experiment
            variant_choice: ORIGINAL (keep original) or EXPERIMENT (apply experiment)
        """
        try:
            client = get_client()

            response = await client.stop_mediation_ab_experiment(
                params.account_id, params.mediation_group_id, params.variant_choice.value
            )

            if params.response_format == ResponseFormat.MARKDOWN:
                return format_experiment_markdown(response)
            else:
                return format_json_response({"mediationAbExperiment": response})

        except Exception as e:
            return handle_api_error(e)
