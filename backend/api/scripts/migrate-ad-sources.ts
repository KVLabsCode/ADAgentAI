/**
 * Migration script: Link existing ad source credentials to AdMob providers
 *
 * This script:
 * 1. Renames the network_credentials table to ad_sources
 * 2. Renames the network_name column to ad_source_name
 * 3. Adds the provider_id column with FK to connected_providers
 * 4. Links existing ad sources to their user's AdMob provider
 *
 * Run with: bun run scripts/migrate-ad-sources.ts
 */

import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting ad sources migration...\n");

  try {
    // Step 1: Rename table network_credentials to ad_sources
    console.log("Step 1: Renaming table network_credentials → ad_sources...");
    await db.execute(sql`
      ALTER TABLE IF EXISTS "network_credentials" RENAME TO "ad_sources"
    `);
    console.log("  ✓ Table renamed\n");

    // Step 2: Rename column network_name to ad_source_name
    console.log("Step 2: Renaming column network_name → ad_source_name...");
    await db.execute(sql`
      ALTER TABLE "ad_sources" RENAME COLUMN "network_name" TO "ad_source_name"
    `);
    console.log("  ✓ Column renamed\n");

    // Step 3: Add provider_id column
    console.log("Step 3: Adding provider_id column...");
    await db.execute(sql`
      ALTER TABLE "ad_sources"
      ADD COLUMN IF NOT EXISTS "provider_id" uuid REFERENCES "connected_providers"("id") ON DELETE CASCADE
    `);
    console.log("  ✓ Column added\n");

    // Step 4: Create new indexes
    console.log("Step 4: Creating new indexes...");
    await db.execute(sql`
      DROP INDEX IF EXISTS "network_credentials_user_org_idx"
    `);
    await db.execute(sql`
      DROP INDEX IF EXISTS "network_credentials_network_idx"
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "ad_sources_user_org_idx" ON "ad_sources" ("user_id", "organization_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "ad_sources_provider_id_idx" ON "ad_sources" ("provider_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "ad_sources_name_idx" ON "ad_sources" ("ad_source_name")
    `);
    console.log("  ✓ Indexes created\n");

    // Step 5: Link existing ad sources to AdMob providers
    console.log("Step 5: Linking existing ad sources to AdMob providers...");
    const result = await db.execute(sql`
      UPDATE "ad_sources" AS as_table
      SET "provider_id" = cp.id
      FROM "connected_providers" cp
      WHERE as_table."user_id" = cp."user_id"
        AND (
          (as_table."organization_id" IS NULL AND cp."organization_id" IS NULL)
          OR as_table."organization_id" = cp."organization_id"
        )
        AND cp."provider" = 'admob'
        AND as_table."provider_id" IS NULL
    `);
    console.log(`  ✓ Ad sources linked\n`);

    // Step 6: Report results
    console.log("Step 6: Checking migration results...");
    const linkedCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM "ad_sources" WHERE "provider_id" IS NOT NULL
    `);
    const unlinkedCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM "ad_sources" WHERE "provider_id" IS NULL
    `);

    const linked = (linkedCount.rows[0] as { count: string }).count;
    const unlinked = (unlinkedCount.rows[0] as { count: string }).count;

    console.log(`  Linked ad sources: ${linked}`);
    console.log(`  Unlinked ad sources: ${unlinked}`);

    if (Number(unlinked) > 0) {
      console.log("\n  ⚠️  Some ad sources remain unlinked (user may not have AdMob connected)");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
