import { readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { MDocument } from "@mastra/rag";
import { envEnum, getEnvConfig } from "@renisa-ai/config/env";
import { defaultLocale } from "@renisa-ai/config/schema";
import { Logger } from "@renisa-ai/utils";
import { embedMany } from "ai";
import { config } from "dotenv";

import { EmbedFactory } from "../providers/embedFactory";
const env = envEnum.default("local").parse(process.env.NODE_ENV);

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
const logger = new Logger(logLevel, 'ingest-kb');

logger.debug(`Ingesting knowledge base for ${env} environment`);

const filesOrDirectories = process.argv.slice(2);

if (filesOrDirectories.length === 0) {
  logger.error("No files or directories provided");
  process.exit(1);
}

const files = filesOrDirectories.flatMap((file) => {
  const stats = statSync(file);
  if (stats.isDirectory()) {
    return readdirSync(file, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => resolve(file, d.name));
  }
  return [file];
});

for (const file of files) {
  const resolved = resolve(file);
  const text = await readFile(resolved, "utf-8");
  const filename = basename(resolved);
  logger.debug(`\nIngesting "${filename}"...`);

  // Create document and chunk it
  const doc = MDocument.fromMarkdown(text);
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 50,
    separators: ["\n\n", "\n", " "],
  });

  const embeddingModel = EmbedFactory.getModel("openai", "small");

  // Generate embeddings
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((chunk) => chunk.text),
  });

  const indexName = "knowledgeBase";
  const { mastra } = await import("../index");
  const vectorStore = mastra.getVector(indexName);

  // Create an index for paper chunks
  await vectorStore.createIndex({
    indexName,
    dimension: 1536,
  });

  // Store embeddings
  await vectorStore.upsert({
    indexName,
    vectors: embeddings,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      source: filename,
      locale: defaultLocale.value,
      version: "v1",
    })),
  });

  logger.debug(`Number of chunks for "${filename}": ${chunks.length}`);
}
