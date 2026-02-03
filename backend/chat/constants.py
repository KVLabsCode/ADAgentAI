"""Shared constants for the chat package.

Defines which ad networks are supported vs "coming soon" (not yet fully integrated).
Coming soon networks should:
- Be disabled in the approval form UI
- Be filtered out from LLM selections

Network definitions are loaded from backend/shared/supported-networks.json
(single source of truth shared with TypeScript).
"""

import json
from pathlib import Path

# Load supported networks from shared JSON (single source of truth)
_NETWORKS_FILE = Path(__file__).parent.parent / "shared" / "supported-networks.json"
with open(_NETWORKS_FILE) as f:
    _networks = json.load(f)

# SUPPORTED bidding networks (whitelist approach)
# Everything else with (bidding) suffix is coming soon
SUPPORTED_BIDDING = {k for k, v in _networks["bidding"].items() if v}

# SUPPORTED waterfall networks (whitelist approach)
# Everything else without (bidding) suffix is coming soon
# Note: AdMob only has bidding variant, no waterfall
SUPPORTED_WATERFALL = {k for k, v in _networks["waterfall"].items() if v}


def is_coming_soon_bidding(network_name: str) -> bool:
    """Check if a bidding network is coming soon.

    Uses whitelist approach: if not in SUPPORTED_BIDDING, it's coming soon.
    """
    name_lower = network_name.lower().replace("(bidding)", "").strip()
    # Check if any supported network matches
    for supported in SUPPORTED_BIDDING:
        if supported in name_lower:
            return False
    return True


def is_coming_soon_waterfall(network_name: str) -> bool:
    """Check if a waterfall network is coming soon.

    Uses whitelist approach: if not in SUPPORTED_WATERFALL, it's coming soon.
    """
    name_lower = network_name.lower()
    # Check if any supported network matches
    for supported in SUPPORTED_WATERFALL:
        if supported in name_lower:
            return False
    return True
