#!/usr/bin/env tsx

/**
 * Push Updated Orchestrator Prompt to Langfuse
 *
 * This script pushes the updated orchestrator prompt with:
 * - Labels: latest, development, staging
 * - Updated documentation for fnolAgentLite tool
 */

import { LangfuseClient } from "@langfuse/client";
import { getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/utils";
import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

// Load environment variables
config({
  path: resolve(import.meta.dirname, "..", "..", "..", ".env"),
});

const { langfuse, logLevel } = getEnvConfig();
const logger = new Logger(logLevel, 'push-orchestrator-prompt');

logger.debug(`\n📤 Pushing updated Orchestrator prompt to Langfuse\n`);

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

async function pushPrompt() {
  try {
    // Read the updated prompt
    const promptPath = resolve(import.meta.dirname, "..", "..", "..", "orchestrator-prompt-updated.txt");
    const promptText = readFileSync(promptPath, "utf-8");

    logger.debug(`📝 Prompt loaded (${promptText.length} characters)\n`);

    // Create a new prompt version
    await client.createPrompt({
      name: "Orchestrator",
      prompt: promptText,
      config: {
        model: "openrouter/google/gemini-2.5-flash",
        temperature: 0.7,
      },
      labels: ["latest", "development", "staging"],
      tags: ["orchestrator", "fnol-lite-update"],
    });

    logger.debug("✅ Prompt successfully pushed to Langfuse");
    logger.debug(`   Name: Orchestrator`);
    logger.debug(`   Labels: latest, development, staging`);
    logger.debug(`   Tags: orchestrator, fnol-lite-update`);
    logger.debug("");

    await client.flush();
  } catch (error) {
    logger.error("❌ Error pushing prompt:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

pushPrompt();
