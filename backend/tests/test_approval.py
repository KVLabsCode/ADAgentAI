"""Unit tests for approval handlers.

Tests the file-based approval state management used by the tool approval system.
"""

import pytest
from chat.approval.handlers import (
    create_pending_approval,
    resolve_approval,
    get_pending_approval,
    get_modified_params,
    has_pending_approvals,
    poll_approval_status,
    add_pre_approved_tool,
    check_and_consume_pre_approval,
    clear_pre_approved_tools,
    add_blocked_tool,
    is_tool_blocked,
    clear_blocked_tools,
    cleanup_approval_files,
    _PENDING_APPROVALS_FILE,
)


@pytest.fixture(autouse=True)
def cleanup():
    """Clean up approval files before and after each test."""
    cleanup_approval_files()
    yield
    cleanup_approval_files()


# =============================================================================
# Pending Approval Tests
# =============================================================================

class TestPendingApproval:
    """Tests for creating and resolving pending approvals."""

    def test_create_pending_approval(self):
        """Should create a pending approval and return an ID."""
        approval_id = create_pending_approval(
            tool_name="admob_create_ad_unit",
            tool_input='{"name": "Test Ad Unit"}'
        )

        assert approval_id is not None
        assert len(approval_id) == 8  # UUID[:8]

        # Verify it's retrievable
        approval = get_pending_approval(approval_id)
        assert approval is not None
        assert approval["tool_name"] == "admob_create_ad_unit"
        assert approval["approved"] is None  # Pending

    def test_resolve_approval_approved(self):
        """Should approve a pending approval."""
        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{"x": 1}'
        )

        success = resolve_approval(approval_id, approved=True)
        assert success is True

        approval = get_pending_approval(approval_id)
        assert approval["approved"] is True

    def test_resolve_approval_denied(self):
        """Should deny a pending approval."""
        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{"x": 1}'
        )

        success = resolve_approval(approval_id, approved=False)
        assert success is True

        approval = get_pending_approval(approval_id)
        assert approval["approved"] is False

    def test_resolve_approval_with_modified_params(self):
        """Should store modified params when approving."""
        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{"name": "original"}'
        )

        success = resolve_approval(
            approval_id,
            approved=True,
            modified_params={"name": "modified"}
        )
        assert success is True

        approval = get_pending_approval(approval_id)
        assert approval["approved"] is True
        assert approval["modified_params"] == {"name": "modified"}

    def test_resolve_nonexistent_approval(self):
        """Should return False for unknown approval ID."""
        success = resolve_approval("fake-id-123", approved=True)
        assert success is False

    def test_get_modified_params(self):
        """Should retrieve modified params after approval."""
        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{"name": "original"}'
        )

        resolve_approval(
            approval_id,
            approved=True,
            modified_params={"name": "modified", "extra": "value"}
        )

        params = get_modified_params(approval_id)
        assert params == {"name": "modified", "extra": "value"}

    def test_get_modified_params_none_when_not_modified(self):
        """Should return None when no modifications were made."""
        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{"name": "test"}'
        )

        resolve_approval(approval_id, approved=True)

        params = get_modified_params(approval_id)
        assert params is None

    def test_has_pending_approvals(self):
        """Should detect presence of pending approvals."""
        assert has_pending_approvals() is False

        approval_id = create_pending_approval(
            tool_name="test_tool",
            tool_input='{}'
        )

        assert has_pending_approvals() is True

        # Resolve and clean up
        resolve_approval(approval_id, approved=True)

    def test_multiple_pending_approvals(self):
        """Should handle multiple concurrent pending approvals."""
        id1 = create_pending_approval("tool_a", '{"a": 1}')
        id2 = create_pending_approval("tool_b", '{"b": 2}')
        id3 = create_pending_approval("tool_c", '{"c": 3}')

        # All should be retrievable
        assert get_pending_approval(id1) is not None
        assert get_pending_approval(id2) is not None
        assert get_pending_approval(id3) is not None

        # Resolve one
        resolve_approval(id2, approved=False)

        # Others should still be pending
        assert get_pending_approval(id1)["approved"] is None
        assert get_pending_approval(id2)["approved"] is False
        assert get_pending_approval(id3)["approved"] is None


class TestPollApprovalStatus:
    """Tests for non-blocking approval status polling."""

    def test_poll_pending_returns_none(self):
        """Should return None for pending approval."""
        approval_id = create_pending_approval("test_tool", '{}')

        result = poll_approval_status(approval_id)
        assert result is None  # Still pending

        # Approval should still exist
        assert get_pending_approval(approval_id) is not None

    def test_poll_approved_returns_true_and_cleans_up(self):
        """Should return True for approved and clean up."""
        approval_id = create_pending_approval("test_tool", '{}')
        resolve_approval(approval_id, approved=True)

        result = poll_approval_status(approval_id)
        assert result is True

        # Approval should be cleaned up
        assert get_pending_approval(approval_id) is None

    def test_poll_denied_returns_false_and_cleans_up(self):
        """Should return False for denied and clean up."""
        approval_id = create_pending_approval("test_tool", '{}')
        resolve_approval(approval_id, approved=False)

        result = poll_approval_status(approval_id)
        assert result is False

        # Approval should be cleaned up
        assert get_pending_approval(approval_id) is None

    def test_poll_nonexistent_returns_none(self):
        """Should return None for unknown approval ID."""
        result = poll_approval_status("nonexistent-id")
        assert result is None


# =============================================================================
# Pre-Approval Tests
# =============================================================================

class TestPreApproval:
    """Tests for pre-approval management (stream-handled approvals)."""

    def test_add_and_check_pre_approved(self):
        """Should mark tool as pre-approved and consume it."""
        add_pre_approved_tool("admob_create_ad_unit")

        # First check should consume it
        result = check_and_consume_pre_approval("admob_create_ad_unit")
        assert result is True

        # Second check should return False (consumed)
        result = check_and_consume_pre_approval("admob_create_ad_unit")
        assert result is False

    def test_check_not_pre_approved(self):
        """Should return False for non-pre-approved tool."""
        result = check_and_consume_pre_approval("some_other_tool")
        assert result is False

    def test_clear_pre_approved_tools(self):
        """Should clear all pre-approved tools."""
        add_pre_approved_tool("tool_a")
        add_pre_approved_tool("tool_b")

        clear_pre_approved_tools()

        assert check_and_consume_pre_approval("tool_a") is False
        assert check_and_consume_pre_approval("tool_b") is False


# =============================================================================
# Blocked Tools Tests
# =============================================================================

class TestBlockedTools:
    """Tests for blocked tools management (denied execution)."""

    def test_add_and_check_blocked(self):
        """Should mark tool as blocked and detect it."""
        add_blocked_tool("dangerous_tool", "User denied")

        is_blocked, reason = is_tool_blocked("dangerous_tool")
        assert is_blocked is True
        assert reason == "User denied"

    def test_not_blocked_tool(self):
        """Should return False for non-blocked tool."""
        is_blocked, reason = is_tool_blocked("safe_tool")
        assert is_blocked is False
        assert reason == ""

    def test_clear_blocked_tools(self):
        """Should clear all blocked tools."""
        add_blocked_tool("tool_a", "Denied A")
        add_blocked_tool("tool_b", "Denied B")

        clear_blocked_tools()

        is_blocked_a, _ = is_tool_blocked("tool_a")
        is_blocked_b, _ = is_tool_blocked("tool_b")
        assert is_blocked_a is False
        assert is_blocked_b is False


# =============================================================================
# Cleanup Tests
# =============================================================================

class TestCleanup:
    """Tests for approval file cleanup."""

    def test_cleanup_removes_files(self):
        """Should remove all approval state files."""
        # Create some state
        create_pending_approval("test_tool", '{}')
        add_pre_approved_tool("pre_tool")
        add_blocked_tool("blocked_tool", "reason")

        # Verify files exist
        assert _PENDING_APPROVALS_FILE.exists()

        # Clean up
        cleanup_approval_files()

        # Verify files are removed
        assert not _PENDING_APPROVALS_FILE.exists()

    def test_cleanup_handles_missing_files(self):
        """Should not error when files don't exist."""
        cleanup_approval_files()  # First cleanup
        cleanup_approval_files()  # Second cleanup should not error


# =============================================================================
# Integration Tests
# =============================================================================

class TestApprovalWorkflow:
    """Integration tests for the full approval workflow."""

    def test_full_approval_workflow(self):
        """Should handle complete approval workflow."""
        # 1. Create pending approval
        approval_id = create_pending_approval(
            tool_name="admob_create_ad_unit",
            tool_input='{"name": "New Ad Unit", "app_id": "app-123"}'
        )

        # 2. Verify it's pending
        approval = get_pending_approval(approval_id)
        assert approval["approved"] is None
        assert approval["tool_name"] == "admob_create_ad_unit"

        # 3. Poll shows pending
        assert poll_approval_status(approval_id) is None

        # 4. Resolve with modifications
        success = resolve_approval(
            approval_id,
            approved=True,
            modified_params={"name": "Modified Name"}
        )
        assert success is True

        # 5. Verify modified params before poll
        params = get_modified_params(approval_id)
        assert params == {"name": "Modified Name"}

        # 6. Poll returns True and cleans up
        result = poll_approval_status(approval_id)
        assert result is True

        # 7. Approval is cleaned up
        assert get_pending_approval(approval_id) is None

    def test_full_denial_workflow(self):
        """Should handle complete denial workflow."""
        # 1. Create pending approval
        approval_id = create_pending_approval(
            tool_name="admob_delete_ad_unit",
            tool_input='{"ad_unit_id": "unit-456"}'
        )

        # 2. Deny it
        success = resolve_approval(approval_id, approved=False)
        assert success is True

        # 3. Block the tool
        add_blocked_tool("admob_delete_ad_unit", "User denied deletion")

        # 4. Verify blocked
        is_blocked, reason = is_tool_blocked("admob_delete_ad_unit")
        assert is_blocked is True
        assert "denied" in reason.lower()

        # 5. Poll returns False
        result = poll_approval_status(approval_id)
        assert result is False
