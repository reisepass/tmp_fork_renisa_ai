import { Agent } from "@mastra/core/agent";
import { triageConversation } from "@renisa/triaging-lib";

/**
 * Triage Router Agent
 *
 * A pure forwarding agent that uses heuristic triage to route messages
 * to specialized agents without any LLM overhead.
 *
 * Flow:
 * 1. Triage user message (heuristic-only, instant)
 * 2. Route to appropriate agent based on category
 * 3. Return that agent's response directly
 *
 * No intermediate LLM calls, just pure routing.
 */
export const triageRouterAgent = new Agent({
  name: "triage-router-agent",

  // No instructions needed - we override generate/stream to skip LLM
  instructions: "Pure routing agent - no LLM processing",

  model: "google/gemini-2.0-flash-exp:free", // Required but won't be called
 
  // Override generate to implement pure forwarding
  async generate(messages, options) {
    const { runtimeContext, mastra, memory } = options || {};
    const logger = mastra?.getLogger();

    console.log("\n🔀 TRIAGE ROUTER: Starting message routing (generate)");
    console.log("📊 Messages in history:", messages.length);
    console.log("💾 Memory context:", {
      thread: memory?.thread,
      resource: memory?.resource,
    });

    // Get last user message
    const lastUserMessage = messages.findLast((m) => m.role === "user");
    if (!lastUserMessage) {
      console.log("❌ TRIAGE ROUTER: No user message found");
      return {
        text: "No user message found",
        finishReason: "stop" as const,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const userMessageText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : lastUserMessage.content
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join(" ");

    console.log("💬 User message:", userMessageText.substring(0, 100) + "...");

    logger?.info("Triage router: processing message", {
      messageLength: userMessageText.length,
    });

    // Run triage (heuristic-only, instant)
    console.log("🔍 TRIAGE ROUTER: Running heuristic triage...");
    const triageStart = performance.now();
    const category = await triageConversation(userMessageText, true);
    const triageTime = performance.now() - triageStart;

    console.log(`✅ TRIAGE ROUTER: Category detected in ${triageTime.toFixed(2)}ms`);
    console.log(`📋 Category: ${category}`);

    logger?.info("Triage router: category detected", { category });

    // Map category to agent
    let targetAgentName: string;

    switch (category) {
      case "First-Notice-Of-Loss":
        targetAgentName = "fnolAgent";
        break;
      case "New-Policy":
        targetAgentName = "orchestratorAgent"; // TODO: route to salesWorkflow
        break;
      case "Manage-Policy":
        targetAgentName = "orchestratorAgent"; // TODO: route to policyManagementWorkflow
        break;
      case "General-Policy-Questions":
      case "Other":
      default:
        targetAgentName = "orchestratorAgent";
        break;
    }

    console.log(`🎯 TRIAGE ROUTER: Routing to ${targetAgentName}`);

    logger?.info("Triage router: forwarding to agent", {
      category,
      targetAgent: targetAgentName,
    });

    // Get target agent
    const targetAgent = mastra?.getAgent(targetAgentName);
    if (!targetAgent) {
      console.log(`❌ TRIAGE ROUTER: Agent ${targetAgentName} not found`);
      logger?.error("Target agent not found", { targetAgentName });
      return {
        text: `Error: Agent ${targetAgentName} not found`,
        finishReason: "stop" as const,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    console.log(`➡️  TRIAGE ROUTER: Forwarding to ${targetAgentName}.generate()`);
    console.log("📦 Forwarding with:", {
      messageCount: messages.length,
      hasMemory: !!memory,
      threadId: memory?.thread,
      resourceId: memory?.resource,
    });

    // Forward to target agent and return its response directly
    const forwardStart = performance.now();
    const result = await targetAgent.generate(messages, options);
    const forwardTime = performance.now() - forwardStart;

    console.log(`✅ TRIAGE ROUTER: ${targetAgentName} responded in ${forwardTime.toFixed(2)}ms`);
    console.log(`📝 Response length: ${result.text?.length || 0} characters`);

    logger?.info("Triage router: forwarding complete", {
      category,
      targetAgent: targetAgentName,
      responseLength: result.text?.length || 0,
    });

    return result;
  },

  // Override stream to implement pure forwarding
  async stream(messages, options) {
    const { runtimeContext, mastra } = options || {};
    const logger = mastra?.getLogger();

    // Get last user message
    const lastUserMessage = messages.findLast((m) => m.role === "user");
    if (!lastUserMessage) {
      // Return empty async generator
      return (async function* () {
        yield {
          type: "text-delta" as const,
          textDelta: "No user message found",
        };
      })();
    }

    const userMessageText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : lastUserMessage.content
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join(" ");

    logger?.info("Triage router: processing message (stream)", {
      messageLength: userMessageText.length,
    });

    // Run triage (heuristic-only, instant)
    const category = await triageConversation(userMessageText, true);

    logger?.info("Triage router: category detected (stream)", { category });

    // Map category to agent
    let targetAgentName: string;

    switch (category) {
      case "First-Notice-Of-Loss":
        targetAgentName = "fnolAgent";
        break;
      case "New-Policy":
        targetAgentName = "orchestratorAgent"; // TODO: route to salesWorkflow
        break;
      case "Manage-Policy":
        targetAgentName = "orchestratorAgent"; // TODO: route to policyManagementWorkflow
        break;
      case "General-Policy-Questions":
      case "Other":
      default:
        targetAgentName = "orchestratorAgent";
        break;
    }

    logger?.info("Triage router: forwarding to agent (stream)", {
      category,
      targetAgent: targetAgentName,
    });

    // Get target agent
    const targetAgent = mastra?.getAgent(targetAgentName);
    if (!targetAgent) {
      logger?.error("Target agent not found (stream)", { targetAgentName });
      return (async function* () {
        yield {
          type: "text-delta" as const,
          textDelta: `Error: Agent ${targetAgentName} not found`,
        };
      })();
    }

    // Forward to target agent and return its stream directly
    const stream = await targetAgent.stream(messages, options);

    logger?.info("Triage router: streaming from target agent", {
      category,
      targetAgent: targetAgentName,
    });

    return stream;
  },
});
