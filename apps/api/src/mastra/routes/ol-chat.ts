/**
 * @deprecated This endpoint is no longer in use.
 * Use the main /chat endpoint instead (defined in apps/api/src/mastra/index.ts).
 *
 * This file is kept for reference but the route is disabled in the API registration.
 */

import { toAISdkFormat } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { Context } from "@mastra/core/server";
import { triageConversation, type Category } from "@renisa/triaging-lib";
import { UIMessage } from "@renisa-ai/config/types";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";

import { perfLoggerRegistry } from "../performance-logger";

/**
 * OL Chat Endpoint - Orchestrated Routing with Triage
 *
 * @deprecated This endpoint is deprecated and disabled. Use /chat instead.
 *
 * This endpoint uses triaging-lib to intelligently route messages to specialized agents:
 * - "First-Notice-Of-Loss" → fnolAgent
 * - "New-Policy" → salesWorkflow (TODO)
 * - "Manage-Policy" → policyManagementWorkflow (TODO)
 * - "General-Policy-Questions" → orchestratorAgent (fallback)
 * - "Other" → orchestratorAgent (fallback)
 *
 * Uses heuristic-only mode for fast, deterministic routing without LLM overhead.
 */

export async function handleOlChat(c: Context) {
  const mastraInstance = c.get("mastra") as Mastra;
  const body = await c.req.json();

  const messages = (body?.messages as UIMessage[]) ?? [];
  const memory = (body?.memory ?? {}) as {
    thread?: string;
    resource?: string;
  };
  const locale = body?.locale ?? "de-DE";

  const threadId = memory?.thread;
  const resourceId = memory?.resource;

  const logger = mastraInstance.getLogger();

  // Performance logging setup
  const requestId = threadId || generateId();
  const perf = perfLoggerRegistry.getOrCreate(
    requestId,
    "ol-chat-request",
    {
      logger,
      enableConsole: true,
      logLevel: "info",
    }
  );
  perf.start({
    threadId,
    resourceId,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  });

  // Extract last user message for triage
  const lastUserMessage = messages.findLast((m) => m.role === "user");
  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const userMessageText =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content
      : lastUserMessage.content
          .filter((part) => part.type === "text")
          .map((part) => (part as { text: string }).text)
          .join(" ");

  logger?.info("OL Chat - Triaging user message", {
    threadId,
    resourceId,
    messageLength: userMessageText.length,
  });

  // Triage the conversation (heuristic-only mode)
  const triageTimer = perf.startStep("triage-conversation", {
    messageLength: userMessageText.length,
  });

  let category: Category;
  try {
    category = await triageConversation(userMessageText, true);
    triageTimer.end({ category });
    logger?.info("Triage completed", { category });
  } catch (error) {
    triageTimer.end({ error: true });
    logger?.error("Triage failed, falling back to orchestrator", {
      error: error instanceof Error ? error.message : String(error),
    });
    category = "Other";
  }

  // Setup runtime context
  const contextEntries: [string, string][] = [
    ["locale", locale],
    ["triageCategory", category],
  ];
  if (threadId) {
    contextEntries.push(["threadId", threadId]);
    contextEntries.push(["sessionId", threadId]);
  }
  if (resourceId) {
    contextEntries.push(["resourceId", resourceId]);
    contextEntries.push(["userId", resourceId]);
  }
  contextEntries.push(["performanceRequestId", requestId]);

  const runtimeContext = new RuntimeContext(contextEntries);

  // Route based on triage category
  let agentName: string;
  let routingReason: string;

  switch (category) {
    case "First-Notice-Of-Loss":
      agentName = "fnolAgent";
      routingReason = "User wants to report a claim/damage";
      break;

    case "New-Policy":
      // TODO: Route to salesWorkflow
      agentName = "orchestratorAgent";
      routingReason = "User wants a new policy (TODO: route to salesWorkflow)";
      break;

    case "Manage-Policy":
      // TODO: Route to policyManagementWorkflow
      agentName = "orchestratorAgent";
      routingReason = "User wants to manage existing policy (TODO: route to policyManagementWorkflow)";
      break;

    case "General-Policy-Questions":
      agentName = "orchestratorAgent";
      routingReason = "User has general questions about insurance";
      break;

    case "Other":
    default:
      agentName = "orchestratorAgent";
      routingReason = "Fallback to orchestrator for general handling";
      break;
  }

  logger?.info("Routing decision", {
    category,
    agentName,
    routingReason,
  });

  // Get the agent
  const agent = mastraInstance.getAgent(agentName);
  if (!agent) {
    logger?.error("Agent not found", { agentName });
    return new Response(`Agent ${agentName} not found`, { status: 500 });
  }

  // Process messages (add instructions if present)
  const newMessages = messages.map((message) => {
    const instructions = message.metadata?.instructions;
    if (instructions) {
      message.parts = [{ type: "text", text: instructions }];
    }
    return message;
  });

  // Track agent execution
  const agentTimer = perf.startStep("agent-stream", {
    agent: agentName,
    category,
    messageCount: newMessages.length,
  });

  // Stream agent response
  const stream = await agent.stream(newMessages, {
    runtimeContext,
    memory: {
      thread: threadId as string,
      resource: resourceId as string,
    },
    tracingOptions: {
      metadata: Object.fromEntries(contextEntries),
    },
  });

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkFormat(stream, {
        from: "agent",
      })) {
        // Filter out tool calls and tool results to prevent intermediate agent outputs
        // from being displayed to the user. Only show the final orchestrator response.
        if (part.type === 'tool-call' || part.type === 'tool-result') {
          // Skip tool-related parts to hide FNOL agent's intermediate responses
          logger?.debug('Filtering out tool stream part', { type: part.type });
          continue;
        }

        writer.write(part);
      }

      // Stream complete - end tracking
      agentTimer.end();
      perf.end({
        timestamp: new Date().toISOString(),
      });

      // Log summary after response sent
      perf.logSummary();

      // Cleanup
      perfLoggerRegistry.finalize(requestId);
    },
  });

  // Create streaming response
  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
