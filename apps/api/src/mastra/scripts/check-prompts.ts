#!/usr/bin/env tsx

/**
 * @deprecated This script is deprecated and no longer used.
 *
 * DEPRECATION NOTICE:
 * This script checked if Langfuse has prompts, but we've changed the workflow:
 * - Runtime ALWAYS fetches prompts directly from Langfuse server
 * - Local cache is only for development reference
 * - Use sync-prompts-down.ts to download prompts from Langfuse to local cache
 *
 * Migration:
 * - Instead of checking if Langfuse has prompts, use sync-prompts-down.ts
 *
 * This file will be removed in a future cleanup.
 *
 * ---
 *
 * Check Prompts in Langfuse
 *
 * This script verifies that all required prompts exist in Langfuse.
 * It's designed to run during development startup to ensure prompts are synced.
 *
 * Exit codes:
 * - 0: All prompts found
 * - 1: Missing prompts (with instructions to sync)
 * - 2: Langfuse connection error
 */

import { resolve } from "node:path";

import { LangfuseClient } from "@langfuse/client";
import { getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/utils";
import { config } from "dotenv";

// Load environment variables
const env = process.env.NODE_ENV || "local";
config({
  path: resolve(
    import.meta.dirname,
    "..",
    "..",
    "..",
    env === "staging"
      ? ".env.staging"
      : env === "production"
        ? ".env.production"
        : ".env"
  ),
});

const { logLevel: topLogLevel } = getEnvConfig();
const topLevelLogger = new Logger(topLogLevel, 'check-prompts');

const requiredPrompts = [
  "FNOL Agent",
  // Add more required prompts here
];

async function checkPrompts() {
  const { langfuse, logLevel } = getEnvConfig();
  const logger = new Logger(logLevel, 'check-prompts');

  logger.debug(`\n🔍 Checking prompts in Langfuse (${env} environment)...\n`);

  if (!langfuse.config.publicKey || !langfuse.config.secretKey) {
    logger.error("⚠️  Langfuse credentials not found in environment");
    logger.error("   Skipping prompt check. Agents will use local fallback prompts.\n");
    process.exit(0); // Don't fail startup, just warn
  }

  const client = new LangfuseClient({
    publicKey: langfuse.config.publicKey,
    secretKey: langfuse.config.secretKey,
    baseUrl: langfuse.config.baseUrl,
  });

  const missingPrompts: string[] = [];
  const foundPrompts: string[] = [];

  for (const promptName of requiredPrompts) {
    try {
      // Try to get the prompt with the configured label (e.g., "production", "local")
      // Falls back to "latest" if the label doesn't exist
      const prompt = await client.prompt.get(promptName, {
        label: langfuse.label || "latest",
        cacheTtlSeconds: 0, // Disable cache for startup check
      });

      if (prompt) {
        foundPrompts.push(promptName);
        logger.debug(`✅ ${promptName} (version ${prompt.version})`);
      }
    } catch (error) {
      missingPrompts.push(promptName);
      logger.debug(`❌ ${promptName} - NOT FOUND`);
    }
  }

  logger.debug("\n" + "─".repeat(60));
  logger.debug(`\n📊 Summary:`);
  logger.debug(`   ✅ Found: ${foundPrompts.length}`);
  if (missingPrompts.length > 0) {
    logger.debug(`   ❌ Missing: ${missingPrompts.length}`);
  }
  logger.debug(`   Total: ${requiredPrompts.length}\n`);

  if (missingPrompts.length > 0) {
    logger.debug("⚠️  Some prompts are missing in Langfuse!");
    logger.debug("\n📝 To sync prompts to Langfuse, run:\n");
    logger.debug(`   pnpm --filter api sync-prompts\n`);
    logger.debug("💡 Agents will use local fallback prompts until synced.\n");

    // Don't fail startup, just warn
    process.exit(0);
  }

  logger.debug("✅ All prompts are synced to Langfuse!\n");

  await client.flush();
  process.exit(0);
}

checkPrompts().catch((error) => {
  topLevelLogger.error("\n❌ Error checking prompts:", error instanceof Error ? error.message : error);
  topLevelLogger.error("   Continuing startup with local fallback prompts.\n");
  process.exit(0); // Don't fail startup
});
