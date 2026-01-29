"""Pydantic adapter for AdMob Mediation Group transformations.

Transforms flat UI inputs into nested API structure required by AdMob,
and reverse transforms API responses for approval form display.

UI Input (flat):
    {
        display_name: "My Group",
        bidding_lines: [...],
        waterfall_lines: [...],
        cpm_floor: 1.50,
        platform: "ANDROID",
        ad_format: "BANNER"
    }

API Output (nested):
    {
        "displayName": "My Group",
        "mediationGroupLines": [...merged...],
        "targeting": {
            "platform": "ANDROID",
            "format": "BANNER"
        },
        "mediationAbExperimentState": "CONTROL_ONLY"
    }
"""

from typing import Literal, Optional, Any
from pydantic import BaseModel, Field, model_validator, model_serializer


class AdUnitMapping(BaseModel):
    """Mapping between ad source and ad unit."""
    ad_unit_id: str = Field(..., description="AdMob ad unit resource name")
    ad_source_ad_unit_id: Optional[str] = Field(
        None,
        description="Ad source's ad unit ID (for non-AdMob sources)"
    )

    def to_api(self) -> dict:
        """Convert to API format."""
        result = {"adUnitId": self.ad_unit_id}
        if self.ad_source_ad_unit_id:
            result["adSourceAdUnitId"] = self.ad_source_ad_unit_id
        return result

    @classmethod
    def from_api(cls, data: dict) -> "AdUnitMapping":
        """Create from API response."""
        return cls(
            ad_unit_id=data.get("adUnitId", ""),
            ad_source_ad_unit_id=data.get("adSourceAdUnitId"),
        )


class BiddingLineUI(BaseModel):
    """Bidding line configuration for UI input.

    Bidding lines don't have CPM floors - they participate in real-time bidding.
    """
    ad_source_id: str = Field(..., description="Ad source ID (e.g., '5450213213286189855' for AdMob Network)")
    ad_unit_mappings: list[AdUnitMapping] = Field(
        default_factory=list,
        description="Mappings between ad source and ad units"
    )
    state: Literal["ENABLED", "DISABLED"] = Field(
        default="ENABLED",
        description="Line state"
    )

    def to_api(self) -> dict:
        """Convert to API line format."""
        return {
            "id": self.ad_source_id,
            "adSourceId": self.ad_source_id,
            "state": self.state,
            "adUnitMappings": [m.to_api() for m in self.ad_unit_mappings],
        }

    @classmethod
    def from_api(cls, data: dict) -> "BiddingLineUI":
        """Create from API response."""
        return cls(
            ad_source_id=data.get("adSourceId", ""),
            state=data.get("state", "ENABLED"),
            ad_unit_mappings=[
                AdUnitMapping.from_api(m)
                for m in data.get("adUnitMappings", [])
            ],
        )


class WaterfallLineUI(BaseModel):
    """Waterfall line configuration for UI input.

    Waterfall lines have CPM floors and are served in priority order.
    """
    ad_source_id: str = Field(..., description="Ad source ID")
    cpm_floor: float = Field(
        ...,
        ge=0,
        description="CPM floor in dollars (e.g., 1.50)"
    )
    ad_unit_mappings: list[AdUnitMapping] = Field(
        default_factory=list,
        description="Mappings between ad source and ad units"
    )
    state: Literal["ENABLED", "DISABLED"] = Field(
        default="ENABLED",
        description="Line state"
    )

    def to_api(self) -> dict:
        """Convert to API line format with CPM in micros."""
        return {
            "id": self.ad_source_id,
            "adSourceId": self.ad_source_id,
            "state": self.state,
            "cpmFloorMicros": str(int(self.cpm_floor * 1_000_000)),
            "adUnitMappings": [m.to_api() for m in self.ad_unit_mappings],
        }

    @classmethod
    def from_api(cls, data: dict) -> "WaterfallLineUI":
        """Create from API response with CPM converted from micros."""
        cpm_micros = int(data.get("cpmFloorMicros", "0"))
        return cls(
            ad_source_id=data.get("adSourceId", ""),
            cpm_floor=cpm_micros / 1_000_000,
            state=data.get("state", "ENABLED"),
            ad_unit_mappings=[
                AdUnitMapping.from_api(m)
                for m in data.get("adUnitMappings", [])
            ],
        )


class MediationGroupAdapter(BaseModel):
    """Transforms flat UI inputs to nested AdMob API structure.

    This adapter handles the bidirectional transformation between:
    - User-friendly flat fields in approval forms
    - Nested API structure required by AdMob mediation endpoints

    Example:
        # UI → API
        adapter = MediationGroupAdapter(
            display_name="My Group",
            platform="ANDROID",
            ad_format="BANNER",
            bidding_lines=[BiddingLineUI(ad_source_id="123", ...)],
        )
        api_payload = adapter.to_api()

        # API → UI
        adapter = MediationGroupAdapter.from_api(api_response)
    """

    # UI Flat Fields
    display_name: str = Field(..., min_length=1, max_length=80)
    platform: Literal["ANDROID", "IOS"] = Field(..., description="Target platform")
    ad_format: Literal["BANNER", "INTERSTITIAL", "REWARDED", "REWARDED_INTERSTITIAL", "APP_OPEN", "NATIVE"] = Field(
        ...,
        description="Ad format"
    )
    bidding_lines: list[BiddingLineUI] = Field(
        default_factory=list,
        description="Bidding lines (real-time bidding, no CPM floor)"
    )
    waterfall_lines: list[WaterfallLineUI] = Field(
        default_factory=list,
        description="Waterfall lines (priority-based with CPM floors)"
    )
    ad_unit_ids: list[str] = Field(
        default_factory=list,
        description="Target ad unit IDs (used in targeting)"
    )

    # Optional fields
    state: Literal["ENABLED", "DISABLED"] = Field(
        default="ENABLED",
        description="Mediation group state"
    )

    @model_validator(mode="after")
    def validate_lines(self) -> "MediationGroupAdapter":
        """Validate at least one mediation line exists."""
        if not self.bidding_lines and not self.waterfall_lines:
            raise ValueError("At least one bidding or waterfall line is required")
        return self

    @model_serializer(mode="plain")
    def serialize(self) -> dict:
        """Serialize to dict (default Pydantic behavior)."""
        return {
            "display_name": self.display_name,
            "platform": self.platform,
            "ad_format": self.ad_format,
            "bidding_lines": [line.model_dump() for line in self.bidding_lines],
            "waterfall_lines": [line.model_dump() for line in self.waterfall_lines],
            "ad_unit_ids": self.ad_unit_ids,
            "state": self.state,
        }

    def to_api(self) -> dict:
        """Transform to AdMob API shape.

        Merges bidding and waterfall lines into mediationGroupLines,
        builds nested targeting structure, and converts units.

        Returns:
            Dict ready for AdMob mediation group create/update API
        """
        # Merge all lines
        lines: dict[str, dict] = {}

        # Add bidding lines (no CPM floor)
        for line in self.bidding_lines:
            lines[line.ad_source_id] = line.to_api()

        # Add waterfall lines (with CPM floor)
        for line in self.waterfall_lines:
            lines[line.ad_source_id] = line.to_api()

        # Build targeting object
        targeting: dict[str, Any] = {
            "platform": self.platform,
            "format": self.ad_format,
        }

        # Add ad unit IDs to targeting if specified
        if self.ad_unit_ids:
            targeting["adUnitIds"] = self.ad_unit_ids

        return {
            "displayName": self.display_name,
            "state": self.state,
            "mediationGroupLines": lines,
            "targeting": targeting,
            "mediationAbExperimentState": "CONTROL_ONLY",
        }

    @classmethod
    def from_api(cls, api_response: dict) -> "MediationGroupAdapter":
        """Reverse transform API response for approval form display.

        Splits merged mediationGroupLines back into bidding/waterfall,
        extracts targeting fields, and converts units.

        Args:
            api_response: AdMob mediation group API response

        Returns:
            MediationGroupAdapter with flat UI fields
        """
        # Split lines back to bidding/waterfall based on presence of cpmFloorMicros
        bidding_lines: list[BiddingLineUI] = []
        waterfall_lines: list[WaterfallLineUI] = []

        lines_data = api_response.get("mediationGroupLines", {})

        # Handle both dict format (keyed by ad source ID) and list format
        if isinstance(lines_data, dict):
            lines_list = list(lines_data.values())
        else:
            lines_list = lines_data

        for line in lines_list:
            if "cpmFloorMicros" in line and line["cpmFloorMicros"]:
                waterfall_lines.append(WaterfallLineUI.from_api(line))
            else:
                bidding_lines.append(BiddingLineUI.from_api(line))

        # Extract targeting
        targeting = api_response.get("targeting", {})
        platform = targeting.get("platform", "ANDROID")
        ad_format = targeting.get("format", "BANNER")
        ad_unit_ids = targeting.get("adUnitIds", [])

        return cls(
            display_name=api_response.get("displayName", ""),
            platform=platform,
            ad_format=ad_format,
            bidding_lines=bidding_lines,
            waterfall_lines=waterfall_lines,
            ad_unit_ids=ad_unit_ids,
            state=api_response.get("state", "ENABLED"),
        )

    def get_ui_schema(self) -> dict:
        """Generate RJSF UI schema hints for approval form.

        Returns:
            UI schema dict for react-jsonschema-form
        """
        return {
            "display_name": {
                "ui:autofocus": True,
                "ui:placeholder": "Enter mediation group name",
            },
            "platform": {
                "ui:widget": "radio",
            },
            "ad_format": {
                "ui:widget": "select",
            },
            "bidding_lines": {
                "ui:options": {
                    "orderable": True,
                    "addable": True,
                    "removable": True,
                },
                "items": {
                    "ad_source_id": {
                        "ui:widget": "entitySelect",
                        "ui:options": {
                            "fetchType": "bidding_ad_sources",
                        },
                    },
                },
            },
            "waterfall_lines": {
                "ui:options": {
                    "orderable": True,
                    "addable": True,
                    "removable": True,
                },
                "items": {
                    "ad_source_id": {
                        "ui:widget": "entitySelect",
                        "ui:options": {
                            "fetchType": "waterfall_ad_sources",
                        },
                    },
                    "cpm_floor": {
                        "ui:help": "CPM floor in dollars (e.g., 1.50)",
                    },
                },
            },
            "ad_unit_ids": {
                "ui:widget": "entitySelect",
                "ui:options": {
                    "fetchType": "ad_units",
                    "multiSelect": True,
                },
            },
        }
