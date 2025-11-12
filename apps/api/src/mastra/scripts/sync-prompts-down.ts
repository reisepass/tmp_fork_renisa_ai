/**
 * @deprecated This script is deprecated and no longer used.
 *
 * DEPRECATION NOTICE:
 * Prompt syncing has been disabled. The application always fetches prompts
 * directly from Langfuse at runtime. No local caching is needed.
 *
 * This file will be removed in a future cleanup.
 *
 * ---
 *
 * Sync Prompts Down - Download prompts from Langfuse for local development reference
 *
 * This script downloads prompts from Langfuse server (the single source of truth)
 * and saves them locally for development reference only.
 *
 * IMPORTANT:
 * - Runtime ALWAYS fetches from Langfuse server directly
 * - Local copies are for development reference/debugging ONLY
 * - To change prompts, edit them in Langfuse web UI
 */

import { LangfuseClient } from "@langfuse/client";
import { getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/utils";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { logLevel } = getEnvConfig();
const topLevelLogger = new Logger(logLevel, 'sync-prompts-down');

// List of all prompts used in the application
const PROMPT_NAMES = [
  "Orchestrator",
  "Intent Classifier",
  "Data Extractor",
  "Data Validator",
  "FNOL Agent", // Add any new prompts here
] as const;

interface PromptInfo {
  name: string;
  label?: string;
  version: number;
  content: string;
  config: Record<string, unknown>;
}

async function syncPromptsDown() {
  const {
    langfuse: { label, config },
    logLevel,
  } = getEnvConfig();
  const logger = new Logger(logLevel, 'sync-prompts-down');

  logger.debug("🔄 Starting prompt sync from Langfuse...\n");

  const langfuse = new LangfuseClient(config);

  // Create prompts directory if it doesn't exist
  const promptsDir = join(__dirname, "..", "prompts", "cache");
  await mkdir(promptsDir, { recursive: true });

  const results: {
    success: string[];
    failed: string[];
  } = {
    success: [],
    failed: [],
  };

  for (const promptName of PROMPT_NAMES) {
    try {
      logger.debug(`📥 Fetching: ${promptName} (label: ${label || "latest"})...`);

      let prompt;
      let usedLabel = label;

      try {
        // Try with label first
        if (label) {
          prompt = await langfuse.prompt.get(promptName, { label });
        } else {
          prompt = await langfuse.prompt.get(promptName);
        }
      } catch (error) {
        // Fall back to latest if label not found
        if (label) {
          logger.debug(`   ⚠️  Label '${label}' not found, falling back to latest`);
          prompt = await langfuse.prompt.get(promptName);
          usedLabel = "latest";
        } else {
          throw error;
        }
      }

      // Extract prompt info
      const promptInfo: PromptInfo = {
        name: promptName,
        label: usedLabel,
        version: prompt.version,
        content: prompt.prompt,
        config: prompt.config || {},
      };

      // Save to file
      const filename = promptName.replace(/\s+/g, "-").toLowerCase();
      const filepath = join(promptsDir, `${filename}.json`);

      await writeFile(filepath, JSON.stringify(promptInfo, null, 2), "utf-8");

      logger.debug(`   ✅ Saved to: ${filepath}`);
      logger.debug(`   📝 Version: ${prompt.version}`);
      results.success.push(promptName);
    } catch (error) {
      logger.error(`   ❌ Failed to fetch ${promptName}:`, error instanceof Error ? error.message : String(error));
      results.failed.push(promptName);
    }

    logger.debug("");
  }

  // Create README
  const readmePath = join(promptsDir, "README.md");
  await writeFile(
    readmePath,
    `# Prompt Cache

**⚠️ DEVELOPMENT REFERENCE ONLY ⚠️**

These files are cached copies of prompts from Langfuse for local development reference.

## Important Notes

- **Single Source of Truth**: Langfuse server is the ONLY source of truth
- **Runtime Behavior**: The application ALWAYS fetches prompts from Langfuse at runtime
- **Local Copies**: These cached files are for development/debugging reference ONLY
- **Making Changes**: To change prompts, edit them in the Langfuse web UI at ${config.baseUrl || "https://cloud.langfuse.com"}

## Syncing

Run this command to update the local cache:

\`\`\`bash
pnpm --filter api sync-prompts
\`\`\`

## Last Sync

Generated: ${new Date().toISOString()}
Environment Label: ${label || "latest"}

## Prompts

${PROMPT_NAMES.map((name) => `- ${name}`).join("\n")}
`,
    "utf-8"
  );

  // Print summary
  logger.debug("────────────────────────────────────────────────────────────\n");
  logger.debug("📊 Summary:");
  logger.debug(`   ✅ Success: ${results.success.length}`);
  logger.debug(`   ❌ Failed: ${results.failed.length}`);
  logger.debug(`   📁 Location: ${promptsDir}`);
  logger.debug(`   🏷️  Label: ${label || "latest"}`);

  if (results.success.length > 0) {
    logger.debug("\n✅ Successfully synced:");
    results.success.forEach((name) => logger.debug(`   - ${name}`));
  }

  if (results.failed.length > 0) {
    logger.debug("\n❌ Failed to sync:");
    results.failed.forEach((name) => logger.debug(`   - ${name}`));
    process.exit(1);
  }

  logger.debug("\n✨ Prompt sync complete!\n");
}

syncPromptsDown().catch((error) => {
  topLevelLogger.error("Fatal error:", error);
  process.exit(1);
});
