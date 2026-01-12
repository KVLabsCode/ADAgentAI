"""Entity validation for tool inputs.

Validates that tool inputs reference valid entities from the user's available
accounts and apps. Prevents LLM hallucination of entity IDs.
"""

import re
import logging
from typing import Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# Entity ID patterns for validation
ENTITY_PATTERNS = {
    "admob_publisher_id": re.compile(r"pub-\d{16}"),
    "admob_app_id": re.compile(r"ca-app-pub-\d+~\d+"),
    "admob_ad_unit_id": re.compile(r"ca-app-pub-\d+/\d+"),
    "gam_network_code": re.compile(r"\d{6,12}"),
}

# Tool parameter names that contain entity references
ENTITY_PARAM_MAPPING = {
    # AdMob parameters
    "account_id": "admob_publisher_id",
    "publisher_id": "admob_publisher_id",
    "app_id": "admob_app_id",
    "ad_unit_id": "admob_ad_unit_id",
    # GAM parameters
    "network_code": "gam_network_code",
}


@dataclass
class ValidationResult:
    """Result of entity validation."""

    valid: bool
    entity_type: str | None = None
    entity_id: str | None = None
    message: str | None = None
    available_options: list[str] | None = None  # IDs with friendly names


def format_account_with_name(account: dict) -> str:
    """Format account ID with friendly name.

    Examples:
        "pub-1234567890123456 (My AdMob Account)"
        "123456 (My GAM Network)"
    """
    account_type = account.get("type", account.get("provider", ""))
    name = account.get("name", account.get("displayName", "Unknown"))

    if account_type == "admob" or "publisherId" in account or "publisher_id" in account:
        pub_id = account.get("publisherId", account.get("publisher_id", ""))
        if pub_id:
            return f"{pub_id} ({name})"
    elif account_type == "gam" or "networkCode" in account or "network_code" in account:
        network_code = account.get("networkCode", account.get("network_code", ""))
        if network_code:
            return f"{network_code} ({name})"

    # Fallback
    identifier = account.get("identifier", account.get("id", "unknown"))
    return f"{identifier} ({name})"


def format_app_with_name(app: dict) -> str:
    """Format app ID with friendly name and platform.

    Examples:
        "ca-app-pub-1234567890123456~1111111111 (Cool Game - Android)"
        "ca-app-pub-1234567890123456~2222222222 (Cool Game iOS - iOS)"
    """
    app_id = app.get("id", "")
    name = app.get("name", "Unknown App")
    platform = app.get("platform", "")

    if platform:
        return f"{app_id} ({name} - {platform})"
    return f"{app_id} ({name})"


def get_formatted_accounts(
    accounts: list[dict], account_type: str | None = None
) -> list[str]:
    """Get formatted account list with friendly names.

    Args:
        accounts: List of account dicts
        account_type: Filter by type ("admob", "gam", or None for all)

    Returns:
        List of formatted strings like "pub-xxx (Account Name)"
    """
    result = []
    for acc in accounts:
        acc_type = acc.get("type", acc.get("provider", ""))
        if account_type and acc_type != account_type:
            continue
        result.append(format_account_with_name(acc))
    return result


def get_formatted_apps(apps: list[dict], limit: int = 10) -> list[str]:
    """Get formatted app list with friendly names.

    Args:
        apps: List of app dicts
        limit: Maximum number of apps to return

    Returns:
        List of formatted strings like "ca-app-pub-xxx~111 (App Name - Platform)"
    """
    return [format_app_with_name(app) for app in apps[:limit]]


@dataclass
class ValidationContext:
    """Context for entity validation from graph state."""

    available_accounts: list[dict]
    available_apps: list[dict]
    context_mode: str  # "soft" or "strict"


def extract_entity_ids(tool_input: dict[str, Any]) -> list[tuple[str, str, str]]:
    """Extract entity IDs from tool input parameters.

    Args:
        tool_input: The tool's input parameters

    Returns:
        List of tuples: (param_name, entity_type, entity_id)
    """
    found_entities = []

    def scan_value(param_name: str, value: Any, depth: int = 0):
        if depth > 5:  # Prevent infinite recursion
            return

        if isinstance(value, str):
            # Check if parameter name maps to an entity type
            entity_type = ENTITY_PARAM_MAPPING.get(param_name.lower())
            if entity_type:
                found_entities.append((param_name, entity_type, value))
            else:
                # Scan for entity patterns in the string value
                for etype, pattern in ENTITY_PATTERNS.items():
                    matches = pattern.findall(value)
                    for match in matches:
                        found_entities.append((param_name, etype, match))

        elif isinstance(value, dict):
            for k, v in value.items():
                scan_value(k, v, depth + 1)

        elif isinstance(value, list):
            for item in value:
                scan_value(param_name, item, depth + 1)

    for param_name, value in tool_input.items():
        scan_value(param_name, value)

    return found_entities


def validate_admob_publisher_id(
    entity_id: str, context: ValidationContext
) -> ValidationResult:
    """Validate AdMob publisher ID against available accounts."""
    # Normalize ID format
    normalized_id = entity_id if entity_id.startswith("pub-") else f"pub-{entity_id}"

    # Get AdMob accounts
    admob_accounts = [
        acc for acc in context.available_accounts
        if acc.get("type") == "admob" or acc.get("provider") == "admob"
        or "publisherId" in acc or "publisher_id" in acc
    ]

    available_ids = [
        acc.get("publisherId", acc.get("publisher_id", ""))
        for acc in admob_accounts
    ]

    # Normalize available IDs too
    available_ids = [
        aid if aid.startswith("pub-") else f"pub-{aid}" for aid in available_ids if aid
    ]

    if normalized_id in available_ids:
        return ValidationResult(valid=True, entity_type="admob_publisher_id", entity_id=entity_id)

    # Build friendly formatted options
    formatted_options = get_formatted_accounts(admob_accounts, account_type="admob")

    return ValidationResult(
        valid=False,
        entity_type="admob_publisher_id",
        entity_id=entity_id,
        message=f"Publisher ID '{entity_id}' not found in your available AdMob accounts",
        available_options=formatted_options,
    )


def validate_admob_app_id(entity_id: str, context: ValidationContext) -> ValidationResult:
    """Validate AdMob app ID against available apps."""
    available_ids = [app.get("id", "") for app in context.available_apps]

    if entity_id in available_ids:
        return ValidationResult(valid=True, entity_type="admob_app_id", entity_id=entity_id)

    # Build friendly formatted options with names
    formatted_options = get_formatted_apps(context.available_apps, limit=10)

    return ValidationResult(
        valid=False,
        entity_type="admob_app_id",
        entity_id=entity_id,
        message=f"App ID '{entity_id}' not found in your available apps",
        available_options=formatted_options,
    )


def validate_admob_ad_unit_id(
    entity_id: str, context: ValidationContext
) -> ValidationResult:
    """Validate AdMob ad unit ID.

    Ad unit IDs are derived from app IDs, so we validate the app portion.
    Format: ca-app-pub-XXXXXXXXXXXXXXXXXX/YYYYYYYYYY
    """
    # Extract the app portion (everything before the last /)
    if "/" in entity_id:
        app_portion = entity_id.rsplit("/", 1)[0]
        # Check if the app portion matches any available app
        available_app_ids = [app.get("id", "") for app in context.available_apps]

        # Ad unit app portion should match app ID format
        for app_id in available_app_ids:
            # Convert ca-app-pub-XXX~YYY to ca-app-pub-XXX (the shared prefix)
            if "~" in app_id:
                app_prefix = app_id.split("~")[0]
                if app_portion.startswith(app_prefix):
                    return ValidationResult(
                        valid=True, entity_type="admob_ad_unit_id", entity_id=entity_id
                    )

    # Can't validate without app context - allow but log
    logger.warning(f"Cannot validate ad unit ID '{entity_id}' - no matching app found")
    return ValidationResult(
        valid=True,  # Allow since we can't fully validate
        entity_type="admob_ad_unit_id",
        entity_id=entity_id,
    )


def validate_gam_network_code(
    entity_id: str, context: ValidationContext
) -> ValidationResult:
    """Validate GAM network code against available networks."""
    # Get GAM accounts
    gam_accounts = [
        acc for acc in context.available_accounts
        if acc.get("type") == "gam" or acc.get("provider") == "gam"
        or "networkCode" in acc or "network_code" in acc
    ]

    available_codes = [
        acc.get("networkCode", acc.get("network_code", ""))
        for acc in gam_accounts
    ]

    if entity_id in available_codes:
        return ValidationResult(valid=True, entity_type="gam_network_code", entity_id=entity_id)

    # Build friendly formatted options
    formatted_options = get_formatted_accounts(gam_accounts, account_type="gam")

    return ValidationResult(
        valid=False,
        entity_type="gam_network_code",
        entity_id=entity_id,
        message=f"Network code '{entity_id}' not found in your available GAM networks",
        available_options=formatted_options,
    )


# Validator dispatch
VALIDATORS = {
    "admob_publisher_id": validate_admob_publisher_id,
    "admob_app_id": validate_admob_app_id,
    "admob_ad_unit_id": validate_admob_ad_unit_id,
    "gam_network_code": validate_gam_network_code,
}


def validate_entity_references(
    tool_name: str,
    tool_input: dict[str, Any],
    available_accounts: list[dict],
    available_apps: list[dict],
    context_mode: str = "soft",
) -> tuple[bool, str | None, list[dict[str, Any]] | None]:
    """Validate all entity references in tool input.

    Args:
        tool_name: Name of the tool being called
        tool_input: The tool's input parameters
        available_accounts: List of user's available accounts
        available_apps: List of user's available apps
        context_mode: "soft" (warn but proceed) or "strict" (block invalid)

    Returns:
        Tuple of (is_valid, error_message, validation_errors)
        - In soft mode: returns (True, None, None) but logs warnings
        - In strict mode: returns (False, error_message, errors) for invalid entities
        - validation_errors contains detailed info with friendly names for building responses
    """
    context = ValidationContext(
        available_accounts=available_accounts,
        available_apps=available_apps,
        context_mode=context_mode,
    )

    # Extract entity IDs from input
    entities = extract_entity_ids(tool_input)

    if not entities:
        return True, None, None

    validation_errors: list[dict[str, Any]] = []

    for param_name, entity_type, entity_id in entities:
        validator = VALIDATORS.get(entity_type)
        if not validator:
            continue

        result = validator(entity_id, context)

        if not result.valid:
            error_detail = {
                "param": param_name,
                "type": entity_type,
                "id": entity_id,
                "message": result.message,
                "available": result.available_options,  # Now includes friendly names
            }
            validation_errors.append(error_detail)

            if context_mode == "soft":
                logger.warning(
                    f"[validators] Entity validation warning in {tool_name}: "
                    f"{result.message} (proceeding in soft mode)"
                )
            else:
                logger.error(
                    f"[validators] Entity validation failed in {tool_name}: "
                    f"{result.message}"
                )

    if validation_errors:
        if context_mode == "strict":
            # Build error message with alternatives
            error_messages = []
            for err in validation_errors:
                msg = err["message"]
                if err["available"]:
                    # Show up to 5 alternatives with friendly names
                    options = ", ".join(str(opt) for opt in err["available"][:5])
                    msg += f". Valid options: {options}"
                error_messages.append(msg)

            return False, "; ".join(error_messages), validation_errors
        else:
            # Soft mode - log but allow
            return True, None, None

    return True, None, None


def build_validation_error_response(
    tool_name: str,
    error_message: str,
    valid_alternatives: list[str] | None = None,
) -> dict[str, Any]:
    """Build a structured error response for invalid entity references.

    Args:
        tool_name: Name of the tool that failed validation
        error_message: The validation error message
        valid_alternatives: List of valid alternatives with friendly names

    Returns:
        Structured error response dict matching P-119 spec:
        {
          "status": "error",
          "error_type": "entity_not_found",
          "message": "The app 'ca-app-pub-xxx~999' is not available",
          "valid_alternatives": ["ca-app-pub-xxx~111 (Cool Game)", ...]
        }
    """
    response: dict[str, Any] = {
        "status": "error",
        "error_type": "entity_not_found",
        "tool": tool_name,
        "message": error_message,
    }

    if valid_alternatives:
        response["valid_alternatives"] = valid_alternatives

    response["suggestion"] = (
        "Please use one of the valid entity IDs listed above, "
        "or check your context settings to enable additional accounts/apps."
    )

    return response


def build_detailed_validation_error(
    tool_name: str,
    validation_errors: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build detailed error response with all validation failures.

    Args:
        tool_name: Name of the tool that failed validation
        validation_errors: List of error details from validate_entity_references

    Returns:
        Detailed error response with all invalid entities and alternatives
    """
    # Pick the first error for the main message
    first_error = validation_errors[0] if validation_errors else {}
    entity_id = first_error.get("id", "unknown")
    entity_type = first_error.get("type", "entity")

    # Determine friendly entity type name
    type_names = {
        "admob_publisher_id": "AdMob account",
        "admob_app_id": "app",
        "admob_ad_unit_id": "ad unit",
        "gam_network_code": "GAM network",
    }
    friendly_type = type_names.get(entity_type, "entity")

    return {
        "status": "error",
        "error_type": "entity_not_found",
        "tool": tool_name,
        "message": f"The {friendly_type} '{entity_id}' is not available",
        "valid_alternatives": first_error.get("available", []),
        "all_errors": [
            {
                "entity_type": err.get("type"),
                "entity_id": err.get("id"),
                "message": err.get("message"),
                "alternatives": err.get("available", []),
            }
            for err in validation_errors
        ],
    }
