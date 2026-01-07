"""Provider and session helpers for API communication."""

import os
from typing import Optional

import httpx
from fastapi import Request


API_URL = os.environ.get("API_URL", "http://localhost:3001")


async def get_user_providers(user_id: str) -> list[dict]:
    """Fetch connected providers for a user from the main API."""
    if not user_id:
        return []

    try:
        internal_api_key = os.environ.get("INTERNAL_API_KEY", "")
        if not internal_api_key:
            return []

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/providers/internal/list",
                params={"userId": user_id},
                headers={"x-internal-api-key": internal_api_key},
            )
            if response.status_code == 200:
                return response.json().get("providers", [])
        return []
    except Exception as e:
        print(f"  Error fetching providers: {e}")
        return []


async def validate_user_session(request: Request) -> Optional[str]:
    """Validate user session and return user_id if valid."""
    try:
        cookies = dict(request.cookies)
        if not cookies:
            return None

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{API_URL}/api/auth/get-session",
                cookies=cookies,
            )
            if response.status_code == 200:
                session_data = response.json()
                return session_data.get("user", {}).get("id")
        return None
    except Exception as e:
        print(f"  Session validation error: {e}")
        return None
