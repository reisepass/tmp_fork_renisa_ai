#!/usr/bin/env tsx

/**
 * Sync Prompts to Langfuse
 *
 * This script syncs local prompt definitions to Langfuse for versioning and management.
 * It ensures that:
 * 1. Prompts are version-controlled in Git
 * 2. Prompts are synced to Langfuse for runtime use
 * 3. Historical versions are preserved in Langfuse
 * 4. Conflicts are detected when server has newer versions
 *
 * Sync Behavior:
 * - Uses SHA-256 hash comparison to detect changes (prompt text + config)
 * - Only creates new versions when content actually changes
 * - Skips upload if local and remote hashes match
 * - Detects conflicts if server version > local baseVersion
 *
 * Conflict Detection:
 * - Each prompt definition includes a `baseVersion` field
 * - This tracks which Langfuse version the local prompt is based on
 * - If server has newer versions (e.g., from UI edits), sync is aborted
 * - Prevents accidentally overwriting server-side changes
 * - Follow the resolution steps in the error message to merge changes
 *
 * Runtime Behavior (Important!):
 * - Agents ALWAYS fetch the latest version from Langfuse at runtime
 * - Manual edits in Langfuse UI will be used immediately by agents
 * - This sync is one-way: local → Langfuse
 * - If you edit in Langfuse UI, those changes won't be pulled back to local code
 *
 * Usage:
 *   pnpm sync-prompts [--env local|staging|production] [--dry-run]
 *   pnpm fetch-prompt "FNOL Agent" 27  # To pull a specific version
 */

import { LangfuseClient } from "@langfuse/client";
import { envEnum, getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/utils";
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { resolve } from "node:path";
import { getFnolInstructions } from "../agents/fnol-agent/instructions";

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith("--env="))?.split("=")[1];
const isDryRun = args.includes("--dry-run");

const env = envEnum.default("local").parse(envArg || process.env.NODE_ENV);

// Load environment variables
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

const { langfuse, logLevel } = getEnvConfig();
const logger = new Logger(logLevel, 'sync-prompts');

logger.debug(`\n🔄 Syncing prompts to Langfuse (${env} environment)${isDryRun ? " [DRY RUN]" : ""}\n`);

if (!langfuse.config.publicKey || !langfuse.config.secretKey) {
  logger.error("❌ Langfuse credentials not found in environment");
  logger.error("   Please ensure LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set");
  process.exit(1);
}

const client = new LangfuseClient({
  publicKey: langfuse.config.publicKey,
  secretKey: langfuse.config.secretKey,
  baseUrl: langfuse.config.baseUrl,
});

/**
 * Prompt definitions
 * Each prompt has:
 * - name: Unique identifier in Langfuse
 * - prompt: The actual prompt text
 * - config: Model configuration (optional)
 * - labels: Tags for organization
 * - baseVersion: The Langfuse version this local prompt is based on (for conflict detection)
 */
const prompts = [
  {
    name: "FNOL Agent",
    prompt: getFnolInstructions(),
    config: {
      model: "openrouter/google/gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 2000,
    },
    labels: ["fnol", "claims", "agent", env],
    tags: ["fnol", "v0"],
    baseVersion: 27, // Track which Langfuse version this local prompt is based on
  },
  // Add more prompts here as needed
  // {
  //   name: "Orchestrator",
  //   prompt: getOrchestratorInstructions(),
  //   ...
  // },
];

/**
 * Calculate SHA-256 hash of prompt content
 * This creates a deterministic hash based on prompt text and config
 */
function calculatePromptHash(prompt: string, config?: Record<string, any>): string {
  // Create a canonical representation by:
  // 1. Sorting config keys for consistent ordering
  // 2. Combining prompt text with config JSON
  const sortedConfig = config
    ? JSON.stringify(config, Object.keys(config).sort())
    : "{}";

  const content = `${prompt}::${sortedConfig}`;

  return createHash("sha256").update(content).digest("hex");
}

/**
 * Result of syncing a single prompt
 */
type SyncResult = "created" | "skipped" | "error" | "conflict";

/**
 * Sync a single prompt to Langfuse
 * Only creates a new version if the content has changed
 * Detects conflicts if server has newer versions than baseVersion
 */
async function syncPrompt(promptDef: {
  name: string;
  prompt: string;
  config?: Record<string, any>;
  labels?: string[];
  tags?: string[];
  baseVersion?: number;
}): Promise<SyncResult> {
  const { name, prompt, config, labels, tags, baseVersion } = promptDef;

  logger.debug(`📝 Syncing prompt: ${name}`);

  // Calculate hash of local prompt
  const localHash = calculatePromptHash(prompt, config);

  if (isDryRun) {
    logger.debug(`   [DRY RUN] Would sync prompt with ${prompt.length} characters`);
    logger.debug(`   Local hash: ${localHash.substring(0, 12)}...`);
    logger.debug(`   Config:`, JSON.stringify(config, null, 2));
    logger.debug(`   Labels:`, labels?.join(", ") || "none");
    logger.debug(`   Tags:`, tags?.join(", ") || "none");
    return "created";
  }

  try {
    // Fetch the latest version to compare
    let existingPrompt;
    try {
      // Use the prompt manager API to fetch the latest version
      existingPrompt = await client.prompt.get(name, {
        label: "latest",
        cacheTtlSeconds: 0, // Disable caching for sync script
      });
    } catch (error) {
      // Prompt doesn't exist yet, will create new one
      logger.debug(`   ℹ️  Prompt "${name}" not found, creating new version`);
      logger.debug(`   Local hash: ${localHash.substring(0, 12)}...`);
    }

    // Check if content has changed by comparing hashes
    if (existingPrompt) {
      const remoteHash = calculatePromptHash(
        existingPrompt.prompt,
        existingPrompt.config
      );

      if (localHash === remoteHash) {
        logger.debug(
          `   ⏭️  Skipped "${name}" - no changes detected (version ${existingPrompt.version})`
        );
        logger.debug(`   Hash: ${localHash.substring(0, 12)}...`);
        return "skipped";
      }

      // CONFLICT DETECTION: Check if server has been modified since baseVersion
      if (baseVersion && existingPrompt.version > baseVersion) {
        logger.debug(
          `   ⚠️  CONFLICT DETECTED for "${name}"!`
        );
        logger.debug(`   Local is based on version: ${baseVersion}`);
        logger.debug(`   Server is at version: ${existingPrompt.version}`);
        logger.debug(`   Server has ${existingPrompt.version - baseVersion} newer version(s)`);
        logger.debug("");
        logger.debug(`   ❌ Aborting sync to prevent overwriting server changes.`);
        logger.debug(`   💡 To resolve:`);
        logger.debug(`      1. Review server changes in Langfuse UI`);
        logger.debug(`      2. Pull latest version: pnpx tsx src/mastra/scripts/fetch-prompt-version.ts "${name}" ${existingPrompt.version}`);
        logger.debug(`      3. Merge your local changes with server version`);
        logger.debug(`      4. Update baseVersion in sync-prompts.ts to ${existingPrompt.version}`);
        logger.debug(`      5. Run sync again`);
        logger.debug("");
        return "conflict";
      }

      // Content has changed - will create new version
      // Note: At runtime, agents will always fetch the latest version from Langfuse
      // regardless of when it was created (UI edits or code syncs)
      logger.debug(
        `   🔄 Content changed, creating new version (current: ${existingPrompt.version})`
      );
      logger.debug(`   Local hash:  ${localHash.substring(0, 12)}...`);
      logger.debug(`   Remote hash: ${remoteHash.substring(0, 12)}...`);
      if (baseVersion) {
        logger.debug(`   Based on version: ${baseVersion}`);
      }
    }

    // Create a new version of the prompt in Langfuse using the correct API
    // Reference: https://langfuse.com/docs/prompts/get-started
    await client.createPrompt({
      name,
      prompt,
      config: config || {},
      labels: labels || [],
      tags: tags || [],
    });

    logger.debug(`   ✅ Successfully synced "${name}"`);
    return "created";
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`   ❌ Failed to sync "${name}":`, error.message);
      logger.error(`   Stack:`, error.stack);
    } else {
      logger.error(`   ❌ Failed to sync "${name}":`, error);
    }
    throw error;
  }
}

/**
 * Main sync function
 */
async function main() {
  logger.debug(`Found ${prompts.length} prompt(s) to sync\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let conflictCount = 0;
  let errorCount = 0;

  for (const promptDef of prompts) {
    try {
      const result = await syncPrompt(promptDef);
      if (result === "created") {
        createdCount++;
      } else if (result === "skipped") {
        skippedCount++;
      } else if (result === "conflict") {
        conflictCount++;
      }
    } catch (error) {
      errorCount++;
    }
    logger.debug(""); // Empty line between prompts
  }

  logger.debug("─".repeat(60));
  logger.debug(`\n📊 Summary:`);
  logger.debug(`   ✅ Created: ${createdCount}`);
  logger.debug(`   ⏭️  Skipped: ${skippedCount}`);
  if (conflictCount > 0) {
    logger.debug(`   ⚠️  Conflicts: ${conflictCount}`);
  }
  if (errorCount > 0) {
    logger.debug(`   ❌ Errors: ${errorCount}`);
  }
  logger.debug(`   Total: ${prompts.length}\n`);

  if (conflictCount > 0) {
    logger.debug("⚠️  Some prompts have conflicts with server versions!");
    logger.debug("   Please resolve conflicts before syncing.\n");
  }

  if (isDryRun) {
    logger.debug("ℹ️  This was a dry run. No changes were made to Langfuse.");
    logger.debug("   Run without --dry-run to actually sync prompts.\n");
  }

  // Flush Langfuse client to ensure all data is sent
  if (!isDryRun) {
    logger.debug("🔄 Flushing Langfuse client...");
    await client.flush();
    logger.debug("✅ Done!\n");
  }

  // Exit with error if there were conflicts or errors
  process.exit(conflictCount > 0 || errorCount > 0 ? 1 : 0);
}

// Run the script
main().catch((error) => {
  logger.error("\n❌ Fatal error:", error);
  process.exit(1);
});
