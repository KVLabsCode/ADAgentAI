import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { systemConfig, adminAuditLog } from "../../db/schema";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const config = new Hono();

// All config routes require authentication and admin role
config.use("*", requireAuth);
config.use("*", requireAdmin);

// Default configuration values
const DEFAULT_CONFIG: Record<string, unknown> = {
  defaultResponseStyle: "detailed",
  defaultContextMode: "soft",
  toolExecutionTimeout: 30, // seconds
  maxTokensPerResponse: 4096,
  safeModeDefault: false,
  maintenanceMode: false,
};

// Config keys that are allowed to be modified
const ALLOWED_KEYS = Object.keys(DEFAULT_CONFIG);

/**
 * GET /admin/config - Get all system configuration
 */
config.get("/", async (c) => {
  const adminUser = c.get("user");

  try {
    // Fetch all config entries
    const entries = await db.select().from(systemConfig);

    // Build config object with defaults
    const configObject: Record<string, unknown> = { ...DEFAULT_CONFIG };
    const metadata: Record<string, { updatedAt: Date; updatedBy: string | null }> = {};

    for (const entry of entries) {
      if (ALLOWED_KEYS.includes(entry.key)) {
        // Value is stored as JSONB, so it's already parsed
        configObject[entry.key] = entry.value.value ?? entry.value;
        metadata[entry.key] = {
          updatedAt: entry.updatedAt,
          updatedBy: entry.updatedBy,
        };
      }
    }

    // Log admin access
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "view_system_config",
      metadata: {},
    });

    return c.json({
      config: configObject,
      metadata,
      defaults: DEFAULT_CONFIG,
    });
  } catch (error) {
    console.error("[Admin/Config] Error fetching config:", error);
    return c.json({ error: "Failed to fetch configuration" }, 500);
  }
});

// Validation schema for updating config
const updateConfigSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});

/**
 * PUT /admin/config/:key - Update a single config value
 */
config.put("/:key", zValidator("json", z.object({ value: z.unknown() })), async (c) => {
  const adminUser = c.get("user");
  const key = c.req.param("key");
  const { value } = c.req.valid("json");

  try {
    // Validate key is allowed
    if (!ALLOWED_KEYS.includes(key)) {
      return c.json({ error: `Unknown config key: ${key}` }, 400);
    }

    // Validate value type based on key
    const expectedType = typeof DEFAULT_CONFIG[key];
    if (typeof value !== expectedType) {
      return c.json(
        { error: `Invalid value type for ${key}. Expected ${expectedType}, got ${typeof value}` },
        400
      );
    }

    // Additional validation for specific keys
    if (key === "toolExecutionTimeout" && (typeof value !== "number" || value < 5 || value > 300)) {
      return c.json({ error: "Tool execution timeout must be between 5 and 300 seconds" }, 400);
    }
    if (key === "maxTokensPerResponse" && (typeof value !== "number" || value < 256 || value > 16384)) {
      return c.json({ error: "Max tokens must be between 256 and 16384" }, 400);
    }
    if (key === "defaultResponseStyle" && !["concise", "detailed"].includes(value as string)) {
      return c.json({ error: "Response style must be 'concise' or 'detailed'" }, 400);
    }
    if (key === "defaultContextMode" && !["soft", "strict"].includes(value as string)) {
      return c.json({ error: "Context mode must be 'soft' or 'strict'" }, 400);
    }

    // Upsert config entry
    await db
      .insert(systemConfig)
      .values({
        key,
        value: { value } as Record<string, unknown>,
        updatedBy: adminUser.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemConfig.key,
        set: {
          value: { value } as Record<string, unknown>,
          updatedBy: adminUser.id,
          updatedAt: new Date(),
        },
      });

    // Log config change
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "update_system_config",
      metadata: { key, value, previousValue: DEFAULT_CONFIG[key] },
    });

    return c.json({
      success: true,
      key,
      value,
      updatedAt: new Date(),
      updatedBy: adminUser.id,
    });
  } catch (error) {
    console.error("[Admin/Config] Error updating config:", error);
    return c.json({ error: "Failed to update configuration" }, 500);
  }
});

// Batch update schema
const batchUpdateSchema = z.object({
  updates: z.array(updateConfigSchema),
});

/**
 * PUT /admin/config - Batch update multiple config values
 */
config.put("/", zValidator("json", batchUpdateSchema), async (c) => {
  const adminUser = c.get("user");
  const { updates } = c.req.valid("json");

  try {
    const results: Array<{ key: string; success: boolean; error?: string }> = [];

    for (const { key, value } of updates) {
      // Validate key is allowed
      if (!ALLOWED_KEYS.includes(key)) {
        results.push({ key, success: false, error: `Unknown config key: ${key}` });
        continue;
      }

      // Validate value type
      const expectedType = typeof DEFAULT_CONFIG[key];
      if (typeof value !== expectedType) {
        results.push({
          key,
          success: false,
          error: `Invalid type. Expected ${expectedType}, got ${typeof value}`,
        });
        continue;
      }

      // Upsert config entry
      try {
        await db
          .insert(systemConfig)
          .values({
            key,
            value: { value } as Record<string, unknown>,
            updatedBy: adminUser.id,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: systemConfig.key,
            set: {
              value: { value } as Record<string, unknown>,
              updatedBy: adminUser.id,
              updatedAt: new Date(),
            },
          });

        results.push({ key, success: true });
      } catch (err) {
        results.push({ key, success: false, error: "Database error" });
      }
    }

    // Log batch config change
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "batch_update_system_config",
      metadata: { updates: results },
    });

    return c.json({
      success: results.every((r) => r.success),
      results,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("[Admin/Config] Error batch updating config:", error);
    return c.json({ error: "Failed to update configuration" }, 500);
  }
});

/**
 * POST /admin/config/reset - Reset all config to defaults
 */
config.post("/reset", async (c) => {
  const adminUser = c.get("user");

  try {
    // Get current values for audit log
    const currentEntries = await db.select().from(systemConfig);
    const currentValues: Record<string, unknown> = {};
    for (const entry of currentEntries) {
      currentValues[entry.key] = entry.value;
    }

    // Delete all config entries (they'll use defaults)
    for (const key of ALLOWED_KEYS) {
      await db.delete(systemConfig).where(eq(systemConfig.key, key));
    }

    // Log reset
    await db.insert(adminAuditLog).values({
      adminUserId: adminUser.id,
      action: "reset_system_config",
      metadata: { previousValues: currentValues, newValues: DEFAULT_CONFIG },
    });

    return c.json({
      success: true,
      config: DEFAULT_CONFIG,
      message: "Configuration reset to defaults",
    });
  } catch (error) {
    console.error("[Admin/Config] Error resetting config:", error);
    return c.json({ error: "Failed to reset configuration" }, 500);
  }
});

export default config;
