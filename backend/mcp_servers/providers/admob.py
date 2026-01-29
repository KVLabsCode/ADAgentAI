from .admanager import create_google_mcp

# Initialize the AdMob server directly from Discovery JSON
mcp = create_google_mcp("AdMob", "admob_v1beta_discovery.json")

if __name__ == "__main__":
    mcp.run()