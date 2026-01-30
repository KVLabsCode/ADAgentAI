"""JIT Credential Injection Dependencies for FastMCP.

Implements Just-In-Time credential fetching using FastMCP's Depends() pattern.
Tokens are fetched from encrypted storage only at execution time and never
persisted in LangGraph state.

Security principles:
1. Credentials are fetched JIT, not stored in graph state
2. Tokens are decrypted only when needed
3. Never logged (even at debug level)
4. Expired tokens trigger graceful refresh or error
"""

import os
import json
import base64
import httpx
from typing import Optional
from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, Field


# API configuration
API_URL = os.environ.get("API_URL", "http://localhost:3001")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


class CredentialsNotFoundError(Exception):
    """Raised when credentials are not found for a user/network."""
    pass


class CredentialsExpiredError(Exception):
    """Raised when credentials have expired and need refresh."""
    pass


@dataclass
class NetworkCredentials:
    """Credentials for a specific ad network.

    Structure varies by network type:
    - OAuth networks (AdMob, GAM): access_token, refresh_token, expires_at
    - API-key networks (AppLovin, Unity): api_key, secret, etc.
    """
    network: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    extra: Optional[dict] = None

    @property
    def is_expired(self) -> bool:
        """Check if OAuth token is expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() >= self.expires_at

    def get_auth_header(self) -> dict:
        """Get the appropriate Authorization header for this network."""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        elif self.api_key:
            # Some networks use API key in header
            return {"X-API-Key": self.api_key}
        return {}


class CredentialRequest(BaseModel):
    """Request context for credential injection."""
    user_id: str = Field(description="User ID requesting credentials")
    organization_id: Optional[str] = Field(default=None, description="Organization scope")
    network: str = Field(description="Network name (admob, gam, applovin, etc.)")


async def fetch_oauth_credentials(
    user_id: str,
    organization_id: Optional[str],
    provider_type: str,
) -> Optional[NetworkCredentials]:
    """Fetch OAuth credentials from connected_providers table.

    Used for AdMob and GAM which use Google OAuth.

    Args:
        user_id: User ID
        organization_id: Optional org scope
        provider_type: 'admob' or 'gam'

    Returns:
        NetworkCredentials or None if not found
    """
    try:
        body = {
            "userId": user_id,
            "provider": provider_type,
        }
        if organization_id:
            body["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{API_URL}/api/providers/internal/token",
                json=body,
                headers={"X-Internal-Key": INTERNAL_API_KEY},
            )

            if response.status_code == 200:
                data = response.json()
                expires_at = None
                if data.get("expiresAt"):
                    expires_at = datetime.fromisoformat(
                        data["expiresAt"].replace("Z", "+00:00")
                    )

                return NetworkCredentials(
                    network=provider_type,
                    access_token=data.get("accessToken"),
                    expires_at=expires_at,
                )
            elif response.status_code == 404:
                return None

    except Exception as e:
        # Log error but don't expose details
        print(f"[credentials] Error fetching OAuth credentials: {type(e).__name__}")

    return None


async def fetch_api_key_credentials(
    user_id: str,
    organization_id: Optional[str],
    network: str,
) -> Optional[NetworkCredentials]:
    """Fetch API-key credentials from ad_sources table.

    Used for AppLovin, Unity, Liftoff, InMobi, Pangle, Mintegral, DT Exchange.

    Args:
        user_id: User ID
        organization_id: Optional org scope
        network: Network name (ad source name)

    Returns:
        NetworkCredentials or None if not found
    """
    try:
        body = {
            "userId": user_id,
            "adSourceName": network,
        }
        if organization_id:
            body["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{API_URL}/api/ad-sources/internal/credentials",
                json=body,
                headers={"x-internal-api-key": INTERNAL_API_KEY},
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("credentials"):
                    cred = data["credentials"]

                    # Map network-specific fields
                    return NetworkCredentials(
                        network=network,
                        api_key=cred.get("api_key") or cred.get("apiKey"),
                        api_secret=cred.get("secret") or cred.get("apiSecret") or cred.get("secret_key"),
                        extra=cred,  # Store full credentials for network-specific needs
                    )
            elif response.status_code == 404:
                return None

    except Exception as e:
        print(f"[credentials] Error fetching API-key credentials: {type(e).__name__}")

    return None


# Networks that use OAuth (Google)
OAUTH_NETWORKS = {"admob", "gam", "admanager"}

# Networks that use API keys
API_KEY_NETWORKS = {"applovin", "unity", "liftoff", "inmobi", "pangle", "mintegral", "dtexchange"}


async def get_credentials(
    user_id: str,
    organization_id: Optional[str],
    network: str,
) -> NetworkCredentials:
    """JIT credential injection - fetch and prepare credentials at execution time.

    This is the main entry point for credential injection. It:
    1. Determines credential type (OAuth vs API-key)
    2. Fetches from appropriate source
    3. Validates expiration
    4. Returns ready-to-use credentials

    Args:
        user_id: User ID requesting credentials
        organization_id: Optional organization scope
        network: Network name (admob, gam, applovin, etc.)

    Returns:
        NetworkCredentials ready for API calls

    Raises:
        CredentialsNotFoundError: If no credentials found
        CredentialsExpiredError: If OAuth token expired
    """
    network_lower = network.lower()

    # Determine credential type and fetch
    if network_lower in OAUTH_NETWORKS:
        # Map 'admanager' to 'gam' for provider lookup
        provider_type = "gam" if network_lower == "admanager" else network_lower
        credentials = await fetch_oauth_credentials(
            user_id, organization_id, provider_type
        )
    elif network_lower in API_KEY_NETWORKS:
        credentials = await fetch_api_key_credentials(
            user_id, organization_id, network_lower
        )
    else:
        raise CredentialsNotFoundError(f"Unknown network: {network}")

    if not credentials:
        raise CredentialsNotFoundError(
            f"No {network} credentials found. Please connect your {network} account in Settings."
        )

    # Check OAuth token expiration
    if credentials.is_expired:
        raise CredentialsExpiredError(
            f"Your {network} credentials have expired. Please reconnect your account."
        )

    return credentials


# FastMCP Depends wrapper for use in tool decorators
def get_network_credentials(network: str):
    """Create a FastMCP Depends-compatible credential fetcher for a specific network.

    Usage in MCP tools:
        @mcp.tool()
        async def admob_list_accounts(
            ctx: Context,
            credentials: NetworkCredentials = Depends(get_network_credentials("admob"))
        ):
            ...

    Args:
        network: Network name to fetch credentials for

    Returns:
        Async function that fetches credentials from context
    """
    async def _get_credentials(ctx) -> NetworkCredentials:
        """Fetch credentials from request context."""
        user_id = ctx.request_context.get("user_id")
        org_id = ctx.request_context.get("organization_id")

        if not user_id:
            raise CredentialsNotFoundError("No user context available")

        return await get_credentials(user_id, org_id, network)

    return _get_credentials
