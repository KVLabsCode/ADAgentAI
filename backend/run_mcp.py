"""Entry point for running the MCP server."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_servers.server import server

if __name__ == "__main__":
    server.run()
