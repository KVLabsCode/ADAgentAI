"""Shared constants for the chat package.

Defines which ad networks are supported vs "coming soon" (not yet fully integrated).
Coming soon networks should:
- Be disabled in the approval form UI
- Be filtered out from LLM selections
"""

# SUPPORTED bidding networks (whitelist approach)
# Everything else with (bidding) suffix is coming soon
SUPPORTED_BIDDING = {
    "admob network",           # Special case - no (bidding) suffix
    "liftoff monetize",        # Liftoff Monetize (bidding)
    "inmobi (sdk)",            # InMobi (SDK) (bidding)
    "pangle",                  # Pangle (bidding)
    "mintegral",               # Mintegral (bidding)
}

# SUPPORTED waterfall networks (whitelist approach)
# Everything else without (bidding) suffix is coming soon
# Note: AdMob only has bidding variant, no waterfall
SUPPORTED_WATERFALL = {
    "liftoff monetize",
    "inmobi",
    "pangle",
    "mintegral",
    "applovin",
    "dt exchange",
}


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
