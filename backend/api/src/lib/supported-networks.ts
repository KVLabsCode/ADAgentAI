/**
 * Supported Networks Configuration
 *
 * Single source of truth loaded from backend/shared/supported-networks.json
 * This file is shared with Python (backend/chat/constants.py)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

interface NetworkConfig {
  bidding: Record<string, boolean>;
  waterfall: Record<string, boolean>;
}

const networksPath = resolve(__dirname, "../../../shared/supported-networks.json");
const networksData = JSON.parse(readFileSync(networksPath, "utf-8")) as NetworkConfig;

export const supportedNetworks = networksData;
