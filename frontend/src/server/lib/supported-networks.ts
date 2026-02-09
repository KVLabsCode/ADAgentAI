/**
 * Supported Networks Configuration
 *
 * Single source of truth for supported ad networks.
 * This file is shared with Python (backend/chat/constants.py)
 */

// Import JSON directly so bundlers (webpack/turbopack) can inline it
import networksData from "../shared/supported-networks.json";

interface NetworkConfig {
  bidding: Record<string, boolean>;
  waterfall: Record<string, boolean>;
}

export const supportedNetworks = networksData as NetworkConfig;
