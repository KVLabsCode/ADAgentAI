"""Error handling middleware for MCP tools.

Provides consistent error formatting and exception handling across all tool calls.
Catches exceptions and transforms them into a standard error format.

Standard error format:
    {
        "error": "User-friendly error message",
        "code": "ERROR_CODE",
        "details": {"key": "additional context"}
    }
"""

from functools import wraps
from typing import Callable, TypeVar, Any, Optional
import traceback
import logging

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


class MCPError(Exception):
    """Base exception for MCP tool errors.

    Provides structured error information for consistent error handling.

    Attributes:
        message: User-friendly error message
        code: Error code for programmatic handling
        details: Additional context about the error
        status_code: HTTP-like status code (400, 401, 403, 404, 429, 500, etc.)
    """

    def __init__(
        self,
        message: str,
        code: str = "MCP_ERROR",
        details: Optional[dict[str, Any]] = None,
        status_code: int = 500,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
        self.status_code = status_code

    def to_dict(self) -> dict[str, Any]:
        """Convert to error response dictionary."""
        result: dict[str, Any] = {
            "error": self.message,
            "code": self.code,
        }
        if self.details:
            result["details"] = self.details
        return result


class ValidationError(MCPError):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details={"field": field, **(details or {})} if field else details,
            status_code=400,
        )


class AuthenticationError(MCPError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication required", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            details=details,
            status_code=401,
        )


class AuthorizationError(MCPError):
    """Raised when authorization fails."""

    def __init__(self, message: str = "Permission denied", details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            details=details,
            status_code=403,
        )


class NotFoundError(MCPError):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            code="NOT_FOUND",
            details={"resource": resource, "identifier": identifier, **(details or {})},
            status_code=404,
        )


class RateLimitError(MCPError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after, **(details or {})} if retry_after else details,
            status_code=429,
        )


class ExternalAPIError(MCPError):
    """Raised when an external API call fails."""

    def __init__(self, service: str, message: str, original_error: Optional[str] = None, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=f"{service} API error: {message}",
            code="EXTERNAL_API_ERROR",
            details={
                "service": service,
                "original_error": original_error,
                **(details or {}),
            },
            status_code=502,
        )


def error_handler(func: F) -> F:
    """Decorator for consistent error handling.

    Wraps a function to catch exceptions and return consistent error format.
    MCPError exceptions are passed through with their structure preserved.
    Other exceptions are wrapped in a generic internal error response.

    Usage:
        @error_handler
        async def my_tool(ctx, arg1, arg2):
            # Implementation
            pass

    Returns:
        Wrapped function with error handling
    """
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return await func(*args, **kwargs)
        except MCPError as e:
            logger.warning(f"MCP error in {func.__name__}: {e.code} - {e.message}")
            return e.to_dict()
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}\n{traceback.format_exc()}")
            return {
                "error": "Internal server error",
                "code": "INTERNAL_ERROR",
                "details": {
                    "original": str(e),
                    "type": type(e).__name__,
                },
            }
    return wrapper  # type: ignore


def error_handler_sync(func: F) -> F:
    """Synchronous version of error_handler decorator.

    Usage:
        @error_handler_sync
        def my_sync_function(arg1, arg2):
            # Implementation
            pass
    """
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return func(*args, **kwargs)
        except MCPError as e:
            logger.warning(f"MCP error in {func.__name__}: {e.code} - {e.message}")
            return e.to_dict()
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}\n{traceback.format_exc()}")
            return {
                "error": "Internal server error",
                "code": "INTERNAL_ERROR",
                "details": {
                    "original": str(e),
                    "type": type(e).__name__,
                },
            }
    return wrapper  # type: ignore


def format_error_response(
    error: str,
    code: str,
    details: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Create a standardized error response dictionary.

    Args:
        error: User-friendly error message
        code: Error code for programmatic handling
        details: Additional context

    Returns:
        Formatted error dictionary
    """
    result: dict[str, Any] = {
        "error": error,
        "code": code,
    }
    if details:
        result["details"] = details
    return result
