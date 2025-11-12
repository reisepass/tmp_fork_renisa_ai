# Performance Logger Integration Guide

This guide shows how to integrate the PerformanceLogger into the request flow to track:
- Orchestrator → LLM → FNOL Agent → LLM → Working Memory → etc.

## Example Output

```
🚀 START: orchestrator-request

  ▶ orchestrator-agent-stream
    ▶ llm-call-orchestrator
      Metadata: { model: 'openrouter/openai/gpt-4.1-2025-04-14' }
    ✓ llm-call-orchestrator (1,234.56ms)

    ▶ tool-execution-fnol-agent
      ▶ fnol-agent-generate
        ▶ llm-call-fnol-agent
          Metadata: { model: 'openrouter/google/gemini-2.5-flash' }
        ✓ llm-call-fnol-agent (876.54ms)

        ▶ memory-get-working-memory
        ✓ memory-get-working-memory (23.45ms)
      ✓ fnol-agent-generate (912.34ms)
    ✓ tool-execution-fnol-agent (945.67ms)
  ✓ orchestrator-agent-stream (2,345.67ms)

✅ END: orchestrator-request (2,350.00ms)

================================================================================
📊 PERFORMANCE SUMMARY
================================================================================
Operation: orchestrator-request
Total Duration: 2.35s

Breakdown:

├─ orchestrator-agent-stream: 2.35s (99.8%)
   ├─ llm-call-orchestrator: 1.23s (52.5%)
   ├─ tool-execution-fnol-agent: 945.67ms (40.2%)
      ├─ fnol-agent-generate: 912.34ms (38.8%)
         ├─ llm-call-fnol-agent: 876.54ms (37.3%)
         ├─ memory-get-working-memory: 23.45ms (1.0%)

Time Distribution:
  llm-call-orchestrator          [████████████░░░░░░░░] 52.5% (1.23s)
  tool-execution-fnol-agent      [████████░░░░░░░░░░░░] 40.2% (945.67ms)
  memory-get-working-memory      [░░░░░░░░░░░░░░░░░░░░]  1.0% (23.45ms)
================================================================================
```

## Integration Steps

### 1. Add to Main Chat Handler

**File: `src/mastra/index.ts`** (around line 106-168)

```typescript
import { PerformanceLogger, perfLoggerRegistry } from "./performance-logger";

// Inside the /chat handler (around line 108)
handler: async (c) => {
  const mastraInstance = c.get("mastra") as Mastra;
  const body = await c.req.json();

  const messages = (body?.messages as UIMessage[]) ?? [];
  const memory = (body?.memory ?? {}) as {
    thread?: string;
    resource?: string;
  };

  const threadId = memory?.thread;
  const resourceId = memory?.resource;

  // ===== PERFORMANCE LOGGING START =====
  const requestId = threadId || generateId();
  const perf = perfLoggerRegistry.getOrCreate(
    requestId,
    "orchestrator-request",
    {
      logger: mastraInstance.getLogger(),
      enableConsole: true,
    }
  );
  perf.start({
    threadId,
    resourceId,
    messageCount: messages.length,
  });
  // ===== PERFORMANCE LOGGING END =====

  const contextEntries: [string, string][] = [["locale", locale]];
  if (threadId) {
    contextEntries.push(["threadId", threadId]);
    contextEntries.push(["sessionId", threadId]);
  }
  if (resourceId) {
    contextEntries.push(["resourceId", resourceId]);
    contextEntries.push(["userId", resourceId]);
  }

  // Add performance logger to context
  contextEntries.push(["performanceRequestId", requestId]);

  const runtimeContext = new RuntimeContext(contextEntries);

  const agent = mastraInstance.getAgent("orchestratorAgent");
  if (!agent) {
    return new Response("Agent not found", { status: 500 });
  }

  const newMessages = messages.map((message) => {
    const instructions = message.metadata?.instructions;
    if (instructions) {
      message.parts = [{ type: "text", text: instructions }];
    }
    return message;
  });

  // ===== TRACK AGENT STREAM =====
  const agentTimer = perf.startStep("orchestrator-agent-stream", {
    agent: "orchestratorAgent",
  });

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
        writer.write(part);
      }

      // End agent stream timer after streaming completes
      agentTimer.end();

      // End overall request timer
      perf.end();
      perf.logSummary();

      // Cleanup from registry
      perfLoggerRegistry.finalize(requestId);
    },
  });

  // Create a Response that streams the UI message stream to the client
  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
```

### 2. Add to Orchestrator Agent

**File: `src/mastra/agents/orchestrator/index.ts`**

Add timing around LLM calls and tool executions. The agent's `generate` or `stream` methods should track timing.

Since Mastra abstracts this, we can add hooks in the `defaultStreamOptions`:

```typescript
import { perfLoggerRegistry } from "../../performance-logger";

// Around line 49, update defaultStreamOptions
defaultStreamOptions: (options) => {
  const requestId = options.runtimeContext?.get("performanceRequestId");
  const perf = requestId
    ? perfLoggerRegistry.getOrCreate(requestId, "orchestrator")
    : null;

  // Track LLM call
  const llmTimer = perf?.startStep("llm-call-orchestrator", {
    model: "openrouter/openai/gpt-4.1-2025-04-14",
  });

  return {
    ...getAgentDefaultOptions(options),
    onFinish: async (result) => {
      llmTimer?.end({
        finishReason: result.finishReason,
        usage: result.usage,
      });
    },
  };
},
```

### 3. Add to FNOL Agent Tool

**File: `src/mastra/tools/fnol-agent.ts`**

```typescript
import { perfLoggerRegistry } from "../performance-logger";

// Inside execute() function, around line 46
async execute(args) {
  const { context, mastra, runtimeContext, threadId, resourceId } = args;
  const logger = mastra?.getLogger();

  // ===== PERFORMANCE TRACKING =====
  const requestId = runtimeContext?.get("performanceRequestId");
  const perf = requestId
    ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-tool")
    : null;

  const toolTimer = perf?.startStep("tool-execution-fnol-agent", {
    threadId,
    resourceId,
  });
  // ===== END TRACKING =====

  if (!threadId || !resourceId) {
    logger?.error("FNOL agent tool called without thread/resource ID");
    throw new Error("Thread ID and resource ID are required for FNOL agent");
  }

  const { userMessage, dataCollection } = fnolAgentInputSchema.parse(context);

  logger?.info("FNOL agent tool invoked", {
    threadId,
    resourceId,
    hasExistingData: !!dataCollection,
    userMessageLength: userMessage?.length || 0,
  });

  try {
    // Get the FNOL agent
    const agent = mastra.getAgent("fnolAgent");

    if (!agent) {
      logger?.error("FNOL agent not found in Mastra instance");
      throw new Error("FNOL agent not found");
    }

    logger?.debug("FNOL agent retrieved successfully");

    // Get current collected data from working memory (if any)
    const currentCollectedData = dataCollection || {};

    logger?.info("Calling FNOL agent for data extraction", {
      currentDamageType: currentCollectedData.damageType,
      fieldsAlreadyCollected: Object.keys(currentCollectedData).filter(
        (key) => currentCollectedData[key as keyof typeof currentCollectedData] != null
      ).length,
    });

    // ===== TRACK AGENT GENERATE =====
    const agentTimer = perf?.startStep("fnol-agent-generate", {
      userMessageLength: userMessage.length,
    });

    // ===== TRACK LLM CALL =====
    const llmTimer = perf?.startStep("llm-call-fnol-agent", {
      model: "openrouter/google/gemini-2.5-flash",
    });

    // Call agent normally - it will use working memory to track state
    const result = await agent.generate?.(userMessage, {
      runtimeContext,
      memory: {
        thread: threadId,
        resource: resourceId,
      },
      tracingOptions: {
        metadata: {
          ...Object.fromEntries(runtimeContext.entries() || []),
          agentType: "fnol-agent",
          toolName: "fnol-agent-tool",
        },
      },
    });

    llmTimer?.end({
      responseLength: result?.text?.length,
    });
    // ===== END LLM TRACKING =====

    if (!result?.text) {
      logger?.error("FNOL agent did not return a response", {
        resultKeys: result ? Object.keys(result) : [],
      });
      throw new Error("Agent did not return a response");
    }

    logger?.debug("FNOL agent returned response", {
      responseLength: result.text.length,
    });

    // ===== TRACK MEMORY OPERATIONS =====
    const memoryTimer = perf?.startStep("memory-operations");

    // Get working memory to check collected data (with tracing)
    const memory = agent.memory?.({ thread: threadId, resource: resourceId });
    const tracedMemory = memory ? createTracedMemory(memory) : null;
    let updatedCollectedData = currentCollectedData;
    let readyForSubmission = false;

    try {
      const memoryGetTimer = perf?.startStep("memory-get-working-memory");

      // Try to get working memory data with tracing enabled
      const workingMemoryData = await tracedMemory?.getWorkingMemory(
        {
          threadId,
          resourceId,
          memoryConfig: memory?.config,
        },
        {
          tracingContext: runtimeContext,
          enableTracing: true,
        }
      );

      memoryGetTimer?.end({
        hasData: !!workingMemoryData,
        dataSize: workingMemoryData ? JSON.stringify(workingMemoryData).length : 0,
      });

      if (workingMemoryData) {
        updatedCollectedData = {
          ...currentCollectedData,
          ...workingMemoryData,
        };

        logger?.info("Retrieved working memory data", {
          fieldsCollected: Object.keys(workingMemoryData).filter(
            (key) => workingMemoryData[key as keyof typeof workingMemoryData] != null
          ).length,
        });

        // Check if we have minimum required fields for submission
        const hasRequiredFields =
          updatedCollectedData.damageType &&
          updatedCollectedData.damageDescription &&
          updatedCollectedData.incidentDate &&
          updatedCollectedData.whoCausedDamage &&
          updatedCollectedData.estimatedCost;

        readyForSubmission = !!hasRequiredFields;
      }
    } catch (error) {
      logger?.warn("Could not retrieve working memory", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    memoryTimer?.end();
    // ===== END MEMORY TRACKING =====

    agentTimer?.end({
      readyForSubmission,
    });
    // ===== END AGENT TRACKING =====

    logger?.info("FNOL agent tool execution complete", {
      readyForSubmission,
      responseText: result.text.substring(0, 100) + "...",
    });

    // Use the agent's natural response
    const messages = [result.text];

    toolTimer?.end({
      success: true,
      messageLength: result.text.length,
    });
    // ===== END TOOL TRACKING =====

    return {
      messages,
      dataCollection: updatedCollectedData,
      collectedData: updatedCollectedData,
      activeWorkflow: "fnol-agent",
      readyForSubmission,
    };

  } catch (error) {
    toolTimer?.end({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    logger?.error("Error in FNOL agent tool", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      threadId,
      resourceId,
    });

    return {
      messages: [
        "Entschuldigung, es gab einen technischen Fehler bei der Verarbeitung Ihrer Schadenmeldung. Bitte versuchen Sie es erneut.",
      ],
      dataCollection,
      collectedData: dataCollection,
      activeWorkflow: null,
      readyForSubmission: false,
    };
  }
},
```

### 4. Add to FNOL Agent Configuration

**File: `src/mastra/agents/fnol-agent/index.ts`**

Similar to orchestrator, add hooks:

```typescript
import { perfLoggerRegistry } from "../../performance-logger";

defaultGenerateOptions: (options) => {
  const requestId = options.runtimeContext?.get("performanceRequestId");
  const perf = requestId
    ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent")
    : null;

  // LLM timer is already started in the tool, so we don't duplicate here
  // But we can add additional tracking if needed

  return getAgentDefaultOptions(options);
},
```

## Testing the Integration

1. **Start dev server**:
   ```bash
   pnpm --filter api dev
   ```

2. **Make a request** through the chat interface

3. **Check console output** - You should see:
   ```
   🚀 START: orchestrator-request
     ▶ orchestrator-agent-stream
       ▶ llm-call-orchestrator
       ✓ llm-call-orchestrator (1234ms)
       ▶ tool-execution-fnol-agent
         ▶ fnol-agent-generate
           ▶ llm-call-fnol-agent
           ✓ llm-call-fnol-agent (876ms)
           ▶ memory-operations
             ▶ memory-get-working-memory
             ✓ memory-get-working-memory (23ms)
           ✓ memory-operations (45ms)
         ✓ fnol-agent-generate (912ms)
       ✓ tool-execution-fnol-agent (945ms)
     ✓ orchestrator-agent-stream (2345ms)

   ✅ END: orchestrator-request (2350ms)

   ================================================================================
   📊 PERFORMANCE SUMMARY
   ================================================================================
   [Detailed breakdown with percentages and visual bars]
   ```

## Environment Variable Control

Add to `.env`:

```bash
# Performance logging
ENABLE_PERFORMANCE_LOGGING=true
PERFORMANCE_LOG_LEVEL=info  # debug | info | warn
PERFORMANCE_INCLUDE_METADATA=true
```

Then update the integration to check these flags:

```typescript
const perf = perfLoggerRegistry.getOrCreate(requestId, "orchestrator-request", {
  logger: mastraInstance.getLogger(),
  enableConsole: process.env.ENABLE_PERFORMANCE_LOGGING === "true",
  logLevel: process.env.PERFORMANCE_LOG_LEVEL as any || "info",
  includeMetadata: process.env.PERFORMANCE_INCLUDE_METADATA !== "false",
});
```

## Benefits

1. **Hierarchical Timing** - See parent-child relationships
2. **Percentage Breakdown** - Identify the slowest operations
3. **Visual Bars** - Quick visual identification of bottlenecks
4. **Console + Structured Logs** - Both human-readable and machine-parseable
5. **Request Tracking** - Track across async operations via requestId
6. **Metadata** - Attach context to each step (model, tokens, etc.)

This gives you complete visibility into where time is being spent in your request flow!
