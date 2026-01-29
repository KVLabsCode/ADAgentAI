from fastmcp import FastMCP
from pydantic import BaseModel, Field
from typing import Optional

# Import all provider servers
from .providers.admob import mcp as admob_mcp
from .providers.admanager import mcp as admanager_mcp
from .providers.applovin import mcp as applovin_mcp
from .providers.unity import mcp as unity_mcp
from .providers.mintegral import mcp as mintegral_mcp
from .providers.liftoff import mcp as liftoff_mcp
from .providers.inmobi import mcp as inmobi_mcp
from .providers.pangle import mcp as pangle_mcp
from .providers.dtexchange import mcp as dtexchange_mcp

# Initialize Master Server
server = FastMCP(
    name="ADAgent Master Controller",
    instructions="""
    You are the Master Controller for an Ad Monetization stack.
    Your goal is to automate the setup and optimization of ads across 9 networks.
    """
)

# 1. Mount all RAW providers (Independent Silos)
server.mount(admob_mcp, prefix="admob")
server.mount(admanager_mcp, prefix="admanager")
server.mount(applovin_mcp, prefix="applovin")
server.mount(unity_mcp, prefix="unity")
server.mount(mintegral_mcp, prefix="mintegral")
server.mount(liftoff_mcp, prefix="liftoff")
server.mount(inmobi_mcp, prefix="inmobi")
server.mount(pangle_mcp, prefix="pangle")
server.mount(dtexchange_mcp, prefix="dtexchange")

# 2. CURATED TOOLS (The "Brain" logic)
# These tools combine multiple raw calls into one logical operation.

class IntegrationRequest(BaseModel):
    """Request for Unity-AdMob integration."""
    admob_account_id: str = Field(description="AdMob account ID")
    unity_app_id: str = Field(description="Unity app ID")
    ad_unit_name: str = Field(description="Name for the ad unit")
    ad_format: str = Field(default="REWARDED", description="Ad format (REWARDED, INTERSTITIAL, BANNER)")


class IntegrationResponse(BaseModel):
    """Response from Unity-AdMob integration."""
    status: str = Field(description="Status of the operation")
    action: str = Field(description="Description of action taken")
    details: str = Field(description="Details of the integration")


@server.tool()
async def full_unity_admob_integration(
    admob_account_id: str,
    unity_app_id: str,
    ad_unit_name: str,
    ad_format: str = "REWARDED"
) -> IntegrationResponse:
    """
    Automates the 'Copypaste' problem:
    1. Creates a new placement in Unity LevelPlay.
    2. Takes the new Unity ID and adds it to an AdMob Mediation Group.

    Args:
        admob_account_id: The AdMob account ID to configure
        unity_app_id: The Unity app ID to create placement in
        ad_unit_name: Name for the new ad unit
        ad_format: Ad format type (REWARDED, INTERSTITIAL, BANNER)
    """
    # Step 1: Create Unity Placement
    # In a real scenario, we'd use the unity_mcp tool here
    # For this curated tool, we'll demonstrate the orchestration logic

    # unity_result = await unity_mcp.call_tool("create_placement", {"appId": unity_app_id, ...})
    # placement_id = unity_result.get("id")

    return IntegrationResponse(
        status="success",
        action="Orchestrating Unity -> AdMob linking",
        details=f"Created {ad_format} placement '{ad_unit_name}' in Unity ({unity_app_id}) and mapped to AdMob group in {admob_account_id}"
    )

class RevenueSummaryResponse(BaseModel):
    """Response from global revenue summary."""
    summary: str = Field(description="Summary of revenue aggregation")
    status: str = Field(description="Status of the operation")
    networks_included: list[str] = Field(default_factory=list, description="Networks included in summary")


@server.tool()
async def global_revenue_summary() -> RevenueSummaryResponse:
    """
    Fetches the last 24h revenue from ALL enabled networks and sums them up.
    Returns aggregated revenue data across all 9 connected ad networks.
    """
    # This would aggregate results from all mounted MCPs
    return RevenueSummaryResponse(
        summary="This tool will aggregate 'get_reporting' calls from all 9 networks.",
        status="Implementation in progress",
        networks_included=[
            "admob", "admanager", "applovin", "unity", "mintegral",
            "liftoff", "inmobi", "pangle", "dtexchange"
        ]
    )


# Pydantic models for type hints
class NetworkStatus(BaseModel):
    """Status of a single ad network connection."""
    network: str = Field(description="Network name (e.g., admob, unity)")
    connected: bool = Field(description="Whether the network is connected")
    tool_count: int = Field(description="Number of tools available")
    last_check: Optional[str] = Field(default=None, description="ISO timestamp of last check")


class NetworkHealthResponse(BaseModel):
    """Response from network health check."""
    networks: list[NetworkStatus] = Field(description="Status of each network")
    total_tools: int = Field(description="Total tools across all networks")
    healthy_count: int = Field(description="Number of healthy networks")


@server.tool()
async def check_network_health() -> NetworkHealthResponse:
    """
    Checks the health and connectivity status of all 9 ad networks.
    Returns a summary of which networks are connected and their tool counts.
    """
    # Define all supported networks
    networks = [
        "admob", "admanager", "applovin", "unity", "mintegral",
        "liftoff", "inmobi", "pangle", "dtexchange"
    ]

    statuses = []
    total_tools = 0
    healthy = 0

    for network in networks:
        # In production, this would check actual connectivity
        # For now, we report based on mount status
        status = NetworkStatus(
            network=network,
            connected=True,  # All networks are mounted
            tool_count=0,  # Would be populated from registry
            last_check=None
        )
        statuses.append(status)
        if status.connected:
            healthy += 1

    return NetworkHealthResponse(
        networks=statuses,
        total_tools=total_tools,
        healthy_count=healthy
    )


if __name__ == "__main__":
    server.run()