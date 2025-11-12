import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { getEnvConfig } from "@renisa-ai/config/env";

import { postgresStore } from "../../memory";
import { fetchPrompt, getAgentDefaultOptions } from "../../utils";
import { getFnolInstructions } from "../fnol-agent/instructions";

const { isDevelopment, isLocal } = getEnvConfig();

/**
 * FNOL Agent Lite - Simplified First Notice of Loss agent
 *
 * This is a simplified version that:
 * - Uses basic threadMemory (no pgVector, no embedder)
 * - Removes semantic recall
 * - Removes working memory
 * - Keeps only last 5 messages
 * - Data collection handled in tool wrapper (like orchestrator pattern)
 *
 * Design principles:
 * - NEVER invent dates or costs
 * - Extract data from EVERY message
 * - Track what's already been asked
 * - Only ask for missing required fields
 * - Validate extracted data strictly
 */
export const fnolAgentLite = new Agent({
  name: "fnol-agent-lite",
  async instructions({ runtimeContext, mastra }) {
    try {
      // Try to fetch from Langfuse first
      return await fetchPrompt({
        promptName: "FNOL Agent",
        runtimeContext,
        logger: mastra?.getLogger(),
      });
    } catch (error) {
      // Fallback to local instructions if Langfuse unavailable
      const logger = mastra?.getLogger();
      logger?.warn("Failed to fetch FNOL prompt from Langfuse, using local fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      return getFnolInstructions();
    }
  },
  model: "openrouter/google/gemini-2.5-flash",
  tools: {},
  defaultGenerateOptions: (options) => {
    // Track start time for LLM call
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    if (isDevelopment || isLocal) {
      console.log("\n🚀 FNOL AGENT LITE - LLM Call Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Simple timing log
          console.log("\n" + "=".repeat(60));
          console.log("⏱️  FNOL AGENT LITE - TIMING");
          console.log("=".repeat(60));
          console.log(`Started:       ${startTimestamp}`);
          console.log(`Finished:      ${endTimestamp}`);
          console.log(`LLM Duration:  ${(duration / 1000).toFixed(2)}s`);
          console.log(`Model:         openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:        ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Finish Reason: ${result.finishReason}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  defaultStreamOptions: (options) => {
    // Track start time for LLM call
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    if (isDevelopment || isLocal) {
      console.log("\n🚀 FNOL AGENT LITE (STREAM) - LLM Call Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Simple timing log
          console.log("\n" + "=".repeat(60));
          console.log("⏱️  FNOL AGENT LITE (STREAM) - TIMING");
          console.log("=".repeat(60));
          console.log(`Started:       ${startTimestamp}`);
          console.log(`Finished:      ${endTimestamp}`);
          console.log(`LLM Duration:  ${(duration / 1000).toFixed(2)}s`);
          console.log(`Model:         openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:        ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Finish Reason: ${result.finishReason}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  defaultVNextStreamOptions: (options) => {
    // Track start time for LLM call
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    if (isDevelopment || isLocal) {
      console.log("\n🚀 FNOL AGENT LITE (VNEXT) - LLM Call Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Simple timing log
          console.log("\n" + "=".repeat(60));
          console.log("⏱️  FNOL AGENT LITE (VNEXT) - TIMING");
          console.log("=".repeat(60));
          console.log(`Started:       ${startTimestamp}`);
          console.log(`Finished:      ${endTimestamp}`);
          console.log(`LLM Duration:  ${(duration / 1000).toFixed(2)}s`);
          console.log(`Model:         openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:        ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Finish Reason: ${result.finishReason}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  outputProcessors() {
    return [
      {
        name: "tool-call-plain-text-converter",
        async process({ result, runtimeContext }) {
          const isToolCall = runtimeContext?.get('isToolCall') === 'true';

          // If NOT called as a tool, return as-is (keep JSON for direct usage)
          if (!isToolCall) {
            return result;
          }

          if (isDevelopment || isLocal) {
            console.log('🔧 FNOL Agent - Called as tool, converting JSON to plain text');
          }

          // If called as a tool, extract nextQuestion only
          let text = result.text || "";

          try {
            let trimmed = text.trim();

            // Handle markdown code blocks (```json ... ```)
            const codeBlockMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
            if (codeBlockMatch) {
              trimmed = codeBlockMatch[1].trim();

              if (isDevelopment || isLocal) {
                console.log('🔧 FNOL Agent - Detected markdown code block, extracting JSON');
              }
            }

            // Try to parse as JSON
            const parsed = JSON.parse(trimmed);

            // If it has nextQuestion, return only that as plain text
            if (parsed.nextQuestion) {
              if (isDevelopment || isLocal) {
                console.log('🔧 FNOL Agent - Extracted nextQuestion:', parsed.nextQuestion.substring(0, 50) + '...');
              }

              return {
                ...result,
                text: parsed.nextQuestion
              };
            }

            if (isDevelopment || isLocal) {
              console.warn('🔧 FNOL Agent - JSON found but no nextQuestion field');
            }
          } catch (e) {
            // Not JSON or parse failed, return as-is
            if (isDevelopment || isLocal) {
              console.log('🔧 FNOL Agent - Could not parse as JSON, returning original text');
            }
          }

          return result;
        },
      },
      {
        name: "json-canary-detector",
        async process({ result }) {
          // Check if the text contains "internalReasoning" which indicates FNOL JSON structure
          const text = result.text || "";

          if (!text.includes('"internalReasoning"')) {
            // No internal reasoning field, return as-is
            return result;
          }

          // Log the detection (only in development/local)
          if (isDevelopment || isLocal) {
            console.warn("🚨 JSON with internalReasoning detected in FNOL agent output - adding canary: FFF51");
          }

          try {
            // Try to parse as JSON
            const parsed = JSON.parse(text);

            // Add canary to the JSON
            const modifiedJson = {
              ...parsed,
              canary: "FFF51",
            };

            // Return modified result with canary
            return {
              ...result,
              text: JSON.stringify(modifiedJson),
            };
          } catch (e) {
            // Can't parse, just add canary as text marker
            return {
              ...result,
              text: text + ' [CANARY:FFF51]',
            };
          }
        },
      },
    ];
  },
  memory() {
    return new Memory({
      storage: postgresStore,
      options: {
        lastMessages: 5, // Keep last 5 messages in context
      },
    });
  },
});
