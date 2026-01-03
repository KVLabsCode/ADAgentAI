"""
Google Ad Manager MCP Server

A Model Context Protocol (MCP) server for managing Google Ad Manager
through natural language.

This package provides:
- Network management tools
- Ad unit and placement management
- Order and line item viewing
- Report creation and execution
- Company and user management
- Custom targeting and site management

For usage, see the server module or run:
    python -m admanager_mcp
"""

from .server import mcp, main

__version__ = "1.0.0"
__all__ = ["mcp", "main"]
