#!/usr/bin/env tsx

/**
 * Fetch a specific prompt version from Langfuse
 */

import { LangfuseClient } from "@langfuse/client";
import { getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/utils";
import { config } from "dotenv";
import { resolve } from "node:path";

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

const { logLevel } = getEnvConfig();
const logger = new Logger(logLevel, 'fetch-prompt-version');

const promptName = process.argv[2] || "FNOL Agent";
const version = parseInt(process.argv[3] || "25", 10);

async function fetchPromptVersion() {
  const { langfuse } = getEnvConfig();
  const client = new LangfuseClient(langfuse.config);

  logger.debug(`\n📥 Fetching prompt: ${promptName} (version ${version})\n`);

  try {
    const prompt = await client.prompt.get(promptName, {
      version,
      cacheTtlSeconds: 0,
    });

    logger.debug("=".repeat(60));
    logger.debug(`PROMPT: ${prompt.name}`);
    logger.debug(`VERSION: ${prompt.version}`);
    logger.debug("=".repeat(60));
    logger.debug("");
    logger.debug(prompt.prompt);
    logger.debug("");
    logger.debug("=".repeat(60));

    await client.flush();
  } catch (error) {
    logger.error("❌ Error fetching prompt:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

fetchPromptVersion();
