"""Provider and session helpers for API communication."""

import os
from typing import Optional

import httpx
from fastapi import Request


API_URL = os.environ.get("API_URL", "http://localhost:3001")


async def get_user_providers(user_id: str, organization_id: Optional[str] = None) -> list[dict]:
    """Fetch connected providers for a user from the main API."""
    if not user_id:
        return []

    try:
        internal_api_key = os.environ.get("INTERNAL_API_KEY", "")
        if not internal_api_key:
            return []

        params = {"userId": user_id}
        if organization_id:
            params["organizationId"] = organization_id

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/list",
                params=params,
                headers={"x-internal-api-key": internal_api_key},
            )
            if response.status_code == 200:
                return response.json().get("providers", [])
        return []
    except Exception:
        return []


async def validate_user_session(request: Request) -> Optional[str]:
    """Validate user session via Neon Auth token and return user_id if valid.

    Supports token from:
    1. x-stack-access-token header (Neon Auth JWT)
    2. Authorization header (Bearer token)
    """
    try:
        # Get token from headers
        token = request.headers.get("x-stack-access-token")
        if not token:
            # Try Authorization header
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]

        if not token:
            return None

        # Validate token via internal API endpoint
        internal_api_key = os.environ.get("INTERNAL_API_KEY", "")
        if not internal_api_key:
            return None

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{API_URL}/api/chat/internal/validate-token",
                json={"token": token},
                headers={"X-Internal-Key": internal_api_key},
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("valid"):
                    return data.get("user", {}).get("id")
        return None
    except Exception as e:
        print(f"[validate_user_session] Error: {e}")
        return None
