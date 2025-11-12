import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { createVectorQueryTool } from "@mastra/rag";
import { getEnvConfig } from "@renisa-ai/config/env";

import { postgresStore } from "../../memory";
import {
  policyManagementInquiryTool,
  policyManagementTerminateTool,
  policyManagementWorkflowTool,
} from "../../tools/policy-management-workflow";
import { salesWorkflowTool } from "../../tools/sales-workflow";
import { fnolToolLite } from "../../tools/fnol-tool-lite";
import { searchKnowledgeBase } from "../../tools/search-knowledge-base";
import { fetchPrompt, getAgentDefaultOptions } from "../../utils";

const { isDevelopment, isLocal } = getEnvConfig();

export const orchestratorAgent = new Agent({
  name: "orchestrator-agent",
  async instructions({ runtimeContext, mastra }) {
    return await fetchPrompt({
      promptName: "Orchestrator",
      runtimeContext,
      logger: mastra?.getLogger(),
    });
  },
  model: "openrouter/google/gemini-2.5-flash",
  tools: {
    searchKnowledgeBase: searchKnowledgeBase as ReturnType<
      typeof createVectorQueryTool
    >,
    salesWorkflow: salesWorkflowTool,
    policyManagementWorkflow: policyManagementWorkflowTool,
    fnolAgentLite: fnolToolLite,
    policyManagementInquiryWorkflow: policyManagementInquiryTool,
    policyManagementTerminateWorkflow: policyManagementTerminateTool,
  },
  defaultGenerateOptions: (options) => {
    const { runtimeContext } = options;
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    if (isDevelopment || isLocal) {
      console.log("\n🎯 ORCHESTRATOR - Generate Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result: any) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Get prompt version from runtime context
          const promptName = runtimeContext?.get("promptName") || "N/A";
          const promptLabel = runtimeContext?.get("promptLabel") || "N/A";
          const promptVersion = runtimeContext?.get("promptVersion") || "N/A";
          const langfusePrompt = runtimeContext?.get("langfusePrompt");

          console.log("\n" + "=".repeat(60));
          console.log("⏱️  ORCHESTRATOR - GENERATE TIMING");
          console.log("=".repeat(60));
          console.log(`Started:          ${startTimestamp}`);
          console.log(`First Response:   ${endTimestamp}`);
          console.log(`Time to Response: ${(duration / 1000).toFixed(2)}s`);
          console.log(`Model:            openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:           ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Prompt:           ${promptName} (v${promptVersion}, label: ${promptLabel})`);
          console.log(`Langfuse Link:    ${langfusePrompt ? '✓ Linked' : '✗ Not linked'}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  defaultStreamOptions: (options) => {
    const { runtimeContext } = options;
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();
    let firstChunkTime: number | null = null;

    if (isDevelopment || isLocal) {
      console.log("\n🎯 ORCHESTRATOR - Stream Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onChunk: async (chunk) => {
        // Track time to first chunk
        if (firstChunkTime === null) {
          firstChunkTime = performance.now();

          if (isDevelopment || isLocal) {
            const timeToFirst = firstChunkTime - startTime;

            console.log("\n" + "=".repeat(60));
            console.log("⚡ ORCHESTRATOR - FIRST CHUNK RECEIVED");
            console.log("=".repeat(60));
            console.log(`Started:          ${startTimestamp}`);
            console.log(`First Chunk:      ${new Date().toISOString()}`);
            console.log(`Time to First:    ${(timeToFirst / 1000).toFixed(2)}s`);
            console.log("=".repeat(60) + "\n");
          }
        }
      },
      onFinish: async (result: any) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const totalDuration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Get prompt version from runtime context
          const promptName = runtimeContext?.get("promptName") || "N/A";
          const promptLabel = runtimeContext?.get("promptLabel") || "N/A";
          const promptVersion = runtimeContext?.get("promptVersion") || "N/A";
          const langfusePrompt = runtimeContext?.get("langfusePrompt");

          console.log("\n" + "=".repeat(60));
          console.log("⏱️  ORCHESTRATOR - STREAM COMPLETE");
          console.log("=".repeat(60));
          console.log(`Started:          ${startTimestamp}`);
          console.log(`Completed:        ${endTimestamp}`);
          console.log(`Total Duration:   ${(totalDuration / 1000).toFixed(2)}s`);
          if (firstChunkTime) {
            console.log(`Time to First:    ${((firstChunkTime - startTime) / 1000).toFixed(2)}s`);
          }
          console.log(`Model:            openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:           ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Prompt:           ${promptName} (v${promptVersion}, label: ${promptLabel})`);
          console.log(`Langfuse Link:    ${langfusePrompt ? '✓ Linked' : '✗ Not linked'}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  defaultVNextStreamOptions: (options) => {
    const { runtimeContext } = options;
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();
    let firstChunkTime: number | null = null;

    if (isDevelopment || isLocal) {
      console.log("\n🎯 ORCHESTRATOR - VNext Stream Started:", startTimestamp);
    }

    return {
      ...getAgentDefaultOptions(options),
      onChunk: async (chunk) => {
        // Track time to first chunk
        if (firstChunkTime === null) {
          firstChunkTime = performance.now();

          if (isDevelopment || isLocal) {
            const timeToFirst = firstChunkTime - startTime;

            console.log("\n" + "=".repeat(60));
            console.log("⚡ ORCHESTRATOR - FIRST CHUNK RECEIVED (VNEXT)");
            console.log("=".repeat(60));
            console.log(`Started:          ${startTimestamp}`);
            console.log(`First Chunk:      ${new Date().toISOString()}`);
            console.log(`Time to First:    ${(timeToFirst / 1000).toFixed(2)}s`);
            console.log("=".repeat(60) + "\n");
          }
        }
      },
      onFinish: async (result: any) => {
        if (isDevelopment || isLocal) {
          const endTime = performance.now();
          const totalDuration = endTime - startTime;
          const endTimestamp = new Date().toISOString();

          // Get prompt version from runtime context
          const promptName = runtimeContext?.get("promptName") || "N/A";
          const promptLabel = runtimeContext?.get("promptLabel") || "N/A";
          const promptVersion = runtimeContext?.get("promptVersion") || "N/A";
          const langfusePrompt = runtimeContext?.get("langfusePrompt");

          console.log("\n" + "=".repeat(60));
          console.log("⏱️  ORCHESTRATOR - VNEXT STREAM COMPLETE");
          console.log("=".repeat(60));
          console.log(`Started:          ${startTimestamp}`);
          console.log(`Completed:        ${endTimestamp}`);
          console.log(`Total Duration:   ${(totalDuration / 1000).toFixed(2)}s`);
          if (firstChunkTime) {
            console.log(`Time to First:    ${((firstChunkTime - startTime) / 1000).toFixed(2)}s`);
          }
          console.log(`Model:            openrouter/google/gemini-2.5-flash`);
          console.log(`Tokens:           ${result.usage?.totalTokens || 'N/A'}`);
          console.log(`Prompt:           ${promptName} (v${promptVersion}, label: ${promptLabel})`);
          console.log(`Langfuse Link:    ${langfusePrompt ? '✓ Linked' : '✗ Not linked'}`);
          console.log("=".repeat(60) + "\n");
        }
      },
    };
  },
  inputProcessors() {
    return [];
  },
  outputProcessors() {
    return [
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
            console.warn("🚨 JSON with internalReasoning detected in orchestrator output - adding canary: u1251");
          }

          try {
            // Try to parse as JSON
            const parsed = JSON.parse(text);

            // Add canary to the JSON
            const modifiedJson = {
              ...parsed,
              canary: "u1251",
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
              text: text + ' [CANARY:u1251]',
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
        lastMessages: 5, // Keep last 10 messages in context
      },
    });
  },
});
