import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { fnolDataSchema } from "@renisa-ai/config/schema";

import { pgVector, postgresStore } from "../../memory";
import { perfLoggerRegistry } from "../../performance-logger";
import { EmbedFactory } from "../../providers/embedFactory";
import { fetchPrompt, getAgentDefaultOptions } from "../../utils";
import { getFnolInstructions } from "./instructions";

/**
 * FNOL Agent - Handles First Notice of Loss claim collection
 *
 * This agent is responsible for:
 * 1. Collecting claim information through natural conversation
 * 2. Extracting structured data from user messages
 * 3. Identifying missing critical fields
 * 4. Asking follow-up questions intelligently
 * 5. Avoiding repetition and hallucination
 *
 * Design principles from voice bot failures:
 * - NEVER invent dates or costs
 * - Extract data from EVERY message (hybrid extraction)
 * - Track what's already been asked
 * - Only ask for missing required fields
 * - Validate extracted data strictly
 *
 * Prompt management:
 * - Prompts are fetched from Langfuse at runtime
 * - Fallback to local instructions if Langfuse unavailable
 * - Edit prompts directly in Langfuse web UI
 */
export const fnolAgent = new Agent({
  name: "fnol-agent",
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
  model: "openrouter/google/gemini-2.5-flash", // Use Gemini 2.5 Flash for fast conversational reasoning
  tools: {},
  defaultGenerateOptions: (options) => {
    const { runtimeContext, mastra } = options;
    const logger = mastra?.getLogger();

    // DEBUG: Verify this is being called
    console.log("\n🔍 DEBUG: FNOL AGENT defaultGenerateOptions CALLED", new Date().toISOString());

    // Track start time
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    console.log("🔍 DEBUG: Starting FNOL agent LLM call at", startTimestamp);

    // Get or create performance logger for this request
    const requestId = runtimeContext?.get("performanceRequestId") || runtimeContext?.get("threadId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-request", {
          logger,
          enableConsole: true,
          logLevel: "info",
        })
      : null;

    // Start performance tracking
    if (perf && !perf.getTimingData().startTime) {
      perf.start({
        agent: "fnol-agent",
        timestamp: startTimestamp,
      });
    }

    // Track LLM call
    const llmTimer = perf?.startStep("fnol-agent-llm-call", {
      model: "openrouter/google/gemini-2.5-flash",
    });

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endTimestamp = new Date().toISOString();

        // End LLM timer
        llmTimer?.end({
          finishReason: result.finishReason,
          usage: result.usage,
        });

        // DEBUG: Verify onFinish is called
        console.log("🔍 DEBUG: FNOL AGENT onFinish CALLED", endTimestamp);

        // Always log timing info to console (works in playground too)
        console.log("\n" + "=".repeat(80));
        console.log("⏱️  FNOL AGENT TIMING");
        console.log("=".repeat(80));
        console.log(`Started:  ${startTimestamp}`);
        console.log(`Finished: ${endTimestamp}`);
        console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Model:    openrouter/google/gemini-2.5-flash`);
        console.log(`Tokens:   ${result.usage?.totalTokens || 'N/A'}`);
        console.log(`Reason:   ${result.finishReason}`);
        console.log("=".repeat(80) + "\n");

        console.log("🔍 DEBUG: Finished logging timing info");

        // If called from chat endpoint, performance summary will be logged there
        // If called from playground, we've logged basic timing above
      },
    };
  },
  defaultStreamOptions: (options) => {
    const { runtimeContext, mastra } = options;
    const logger = mastra?.getLogger();

    // Track start time
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    console.log("\n🔍 DEBUG: FNOL AGENT defaultStreamOptions CALLED (streaming mode)", startTimestamp);

    // Get or create performance logger for this request
    const requestId = runtimeContext?.get("performanceRequestId") || runtimeContext?.get("threadId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-request", {
          logger,
          enableConsole: true,
          logLevel: "info",
        })
      : null;

    // Start performance tracking
    if (perf && !perf.getTimingData().startTime) {
      perf.start({
        agent: "fnol-agent",
        timestamp: startTimestamp,
      });
    }

    // Track LLM call
    const llmTimer = perf?.startStep("fnol-agent-llm-call", {
      model: "openrouter/google/gemini-2.5-flash",
    });

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endTimestamp = new Date().toISOString();

        // End LLM timer
        llmTimer?.end({
          finishReason: result.finishReason,
          usage: result.usage,
        });

        // Always log timing info to console
        console.log("\n" + "=".repeat(80));
        console.log("⏱️  FNOL AGENT TIMING (STREAM)");
        console.log("=".repeat(80));
        console.log(`Started:  ${startTimestamp}`);
        console.log(`Finished: ${endTimestamp}`);
        console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Model:    openrouter/google/gemini-2.5-flash`);
        console.log(`Tokens:   ${result.usage?.totalTokens || 'N/A'}`);
        console.log(`Reason:   ${result.finishReason}`);
        console.log("=".repeat(80) + "\n");
      },
    };
  },
  defaultVNextStreamOptions: (options) => {
    const { runtimeContext, mastra } = options;
    const logger = mastra?.getLogger();

    // Track start time
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    console.log("\n🔍 DEBUG: FNOL AGENT defaultVNextStreamOptions CALLED", startTimestamp);

    // Get or create performance logger for this request
    const requestId = runtimeContext?.get("performanceRequestId") || runtimeContext?.get("threadId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-request", {
          logger,
          enableConsole: true,
          logLevel: "info",
        })
      : null;

    // Start performance tracking
    if (perf && !perf.getTimingData().startTime) {
      perf.start({
        agent: "fnol-agent",
        timestamp: startTimestamp,
      });
    }

    // Track LLM call
    const llmTimer = perf?.startStep("fnol-agent-llm-call", {
      model: "openrouter/google/gemini-2.5-flash",
    });

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endTimestamp = new Date().toISOString();

        // End LLM timer
        llmTimer?.end({
          finishReason: result.finishReason,
          usage: result.usage,
        });

        // Always log timing info to console
        console.log("\n" + "=".repeat(80));
        console.log("⏱️  FNOL AGENT TIMING (VNEXT STREAM)");
        console.log("=".repeat(80));
        console.log(`Started:  ${startTimestamp}`);
        console.log(`Finished: ${endTimestamp}`);
        console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`Model:    openrouter/google/gemini-2.5-flash`);
        console.log(`Tokens:   ${result.usage?.totalTokens || 'N/A'}`);
        console.log(`Reason:   ${result.finishReason}`);
        console.log("=".repeat(80) + "\n");

        // End and log summary if we have performance logger
        if (perf && perf.getTimingData().startTime) {
          perf.end({
            timestamp: endTimestamp,
          });
          perf.logSummary();

          // Cleanup
          if (requestId) {
            perfLoggerRegistry.finalize(requestId);
          }
        }
      },
    };
  },
  memory() {
    return new Memory({
      embedder: EmbedFactory.getModel("openai", "small"),
      storage: postgresStore,
      vector: pgVector,
      options: {
        lastMessages: 20, // Keep more messages for FNOL context
        semanticRecall: {
          topK: 10, // Retrieve more past messages for claim context
          messageRange: 200, // Search within last 200 messages
        },
        workingMemory: {
          enabled: true,
          scope: "thread",
          schema: fnolDataSchema, // Use FNOL schema for working memory
        },
      },
    });
  },
});
