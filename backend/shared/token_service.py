"""
Token Service - Fetches OAuth tokens from the API with auto-refresh.

This replaces manual token management in .env files. Tokens are stored
in the database and automatically refreshed when needed.

Usage:
    from shared.token_service import get_access_token

    token = await get_access_token("admob", user_id="user-uuid")
    # or for service account fallback:
    token = await get_access_token("admob")
"""

import os
import httpx
from typing import Optional
from datetime import datetime, timedelta, timezone

# Cache tokens in memory to reduce API calls
_token_cache: dict[str, dict] = {}
_cache_buffer = timedelta(minutes=5)  # Refresh 5 min before expiry


class TokenError(Exception):
    """Raised when token fetching fails."""
    pass


async def get_access_token(
    provider: str,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
) -> str:
    """
    Get a valid OAuth access token for a provider.

    Priority:
    1. If user_id provided: Fetch from API (stored in DB, auto-refreshed)
    2. Fallback to environment variable (ADMOB_ACCESS_TOKEN / GAM_ACCESS_TOKEN)
    3. Fallback to service account (GOOGLE_APPLICATION_CREDENTIALS)

    Args:
        provider: "admob" or "gam"
        user_id: Optional user ID to fetch user-specific tokens
        organization_id: Optional organization ID for org-scoped provider lookup

    Returns:
        Valid access token string

    Raises:
        TokenError: If no valid token can be obtained
    """
    cache_key = f"{provider}:{user_id or 'default'}:{organization_id or 'personal'}"

    # Check cache first
    if cache_key in _token_cache:
        cached = _token_cache[cache_key]
        expires_at_str = cached.get("expires_at")
        if expires_at_str:
            # Handle ISO format with 'Z' suffix (replace with +00:00 for fromisoformat)
            if expires_at_str.endswith("Z"):
                expires_at_str = expires_at_str[:-1] + "+00:00"
            try:
                expires_at = datetime.fromisoformat(expires_at_str)
                # Make comparison timezone-aware
                now = datetime.now(timezone.utc)
                if expires_at > now + _cache_buffer:
                    return cached["access_token"]
            except ValueError:
                pass

    # Method 1: Fetch from API (user-specific tokens with auto-refresh)
    if user_id:
        token_data = await _fetch_token_from_api(provider, user_id, organization_id)
        if token_data:
            _token_cache[cache_key] = token_data
            return token_data["access_token"]

    # Method 2: Environment variable (legacy/testing)
    env_key = f"{provider.upper()}_ACCESS_TOKEN"
    if os.environ.get(env_key):
        return os.environ[env_key]

    # Method 3: Service account
    token = await _get_service_account_token(provider)
    if token:
        return token

    raise TokenError(
        f"No valid token for {provider}. "
        f"Connect the provider via OAuth or set {env_key} environment variable."
    )


async def _fetch_token_from_api(
    provider: str,
    user_id: str,
    organization_id: Optional[str] = None,
) -> Optional[dict]:
    """Fetch token from the API's internal endpoint."""
    api_url = os.environ.get("API_URL", "http://localhost:3001")
    internal_key = os.environ.get("INTERNAL_API_KEY")

    if not internal_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            payload = {"userId": user_id, "provider": provider}
            if organization_id:
                payload["organizationId"] = organization_id
            response = await client.post(
                f"{api_url}/api/providers/internal/token",
                headers={"X-Internal-Key": internal_key},
                json=payload,
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "access_token": data["accessToken"],
                    "expires_at": data.get("expiresAt"),
                }
            else:
                return None
    except Exception:
        return None


async def _get_service_account_token(provider: str) -> Optional[str]:
    """Get token using service account credentials."""
    import json
    import tempfile

    # Check for JSON credentials in env
    credentials_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if credentials_json and not credentials_path:
        # Write JSON to temp file
        try:
            creds_data = json.loads(credentials_json)
            fd, temp_path = tempfile.mkstemp(suffix=".json")
            with os.fdopen(fd, 'w') as f:
                json.dump(creds_data, f)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = temp_path
            credentials_path = temp_path
        except json.JSONDecodeError:
            return None

    if not credentials_path:
        return None

    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request

        # Scopes based on provider
        scopes = {
            "admob": ["https://www.googleapis.com/auth/admob.readonly"],
            "gam": ["https://www.googleapis.com/auth/dfp"],
        }

        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=scopes.get(provider, [])
        )

        if credentials.expired or not credentials.token:
            credentials.refresh(Request())

        return credentials.token
    except ImportError:
        return None
    except Exception:
        return None


def clear_token_cache(provider: Optional[str] = None, user_id: Optional[str] = None):
    """Clear cached tokens."""
    global _token_cache

    if provider and user_id:
        cache_key = f"{provider}:{user_id}"
        _token_cache.pop(cache_key, None)
    elif provider:
        _token_cache = {k: v for k, v in _token_cache.items() if not k.startswith(f"{provider}:")}
    else:
        _token_cache = {}
