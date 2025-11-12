# Performance Logging Guide

Complete guide for implementing end-to-end performance logging in Mastra agents and workflows.

## Overview

Our performance logging system provides hierarchical timing breakdown for debugging slow responses. It tracks the complete request flow from user message arrival to final response delivery.

**Key Features:**
- ✅ Hierarchical timing with parent-child relationships
- ✅ Works in both web app and Mastra playground
- ✅ Logs AFTER response is sent to user (accurate end-to-end timing)
- ✅ Visual percentage breakdowns with progress bars
- ✅ Timestamps on every step
- ✅ Console + structured logging support

## Architecture

### Components

1. **PerformanceLogger** (`performance-logger.ts`)
   - Hierarchical timing tracker with step nesting
   - Console output with visual formatting
   - Integration with Mastra's logger

2. **PerformanceLoggerRegistry** (`performance-logger.ts`)
   - Global registry for tracking loggers by request ID
   - Ensures same logger instance is used across async operations
   - Automatic cleanup after request completes

3. **Integration Points:**
   - Chat endpoint (entry point)
   - Agent configurations (track LLM calls)
   - Tool executions (track sub-operations)

## Implementation Patterns

### Pattern 1: Chat Endpoint (Entry Point)

**File:** `apps/api/src/mastra/index.ts`

Use this pattern for HTTP endpoints that handle user requests.

```typescript
import { perfLoggerRegistry } from "./performance-logger";

handler: async (c) => {
  const mastraInstance = c.get("mastra") as Mastra;
  const body = await c.req.json();

  const threadId = memory?.thread;
  const resourceId = memory?.resource;

  // ===== PERFORMANCE LOGGING START =====
  const requestId = threadId || generateId();
  const perf = perfLoggerRegistry.getOrCreate(
    requestId,
    "chat-request", // Operation name
    {
      logger: mastraInstance.getLogger(),
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
  // ===== PERFORMANCE LOGGING END =====

  // Add performance request ID to context so agents can access it
  contextEntries.push(["performanceRequestId", requestId]);
  const runtimeContext = new RuntimeContext(contextEntries);

  // Track orchestrator stream
  const orchestratorTimer = perf.startStep("orchestrator-stream", {
    agent: "orchestratorAgent",
    messageCount: newMessages.length,
  });

  const stream = await agent.stream(newMessages, {
    runtimeContext,
    // ... other options
  });

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkFormat(stream, {
        from: "agent",
      })) {
        writer.write(part);
      }

      // ===== STREAM COMPLETE - LOG PERFORMANCE =====
      orchestratorTimer.end();
      perf.end({
        timestamp: new Date().toISOString(),
      });

      // Log summary AFTER response is sent to user
      perf.logSummary();

      // Cleanup
      perfLoggerRegistry.finalize(requestId);
      // ===== END PERFORMANCE LOGGING =====
    },
  });

  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
```

**Key Points:**
- Create logger at request start
- Add `performanceRequestId` to `runtimeContext` so sub-agents can access it
- End and log summary AFTER stream completes
- Always cleanup with `finalize()`

### Pattern 2: Agent Configuration (LLM Tracking)

**File:** `apps/api/src/mastra/agents/fnol-agent/index.ts`

Use this pattern for agents that need to track their own LLM calls.

```typescript
import { perfLoggerRegistry } from "../../performance-logger";

export const fnolAgent = new Agent({
  name: "fnol-agent",
  model: "openrouter/google/gemini-2.5-flash",

  // For agent.generate() calls
  defaultGenerateOptions: (options) => {
    const { runtimeContext, mastra } = options;
    const logger = mastra?.getLogger();

    // Track start time
    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    // Get the shared performance logger from the request
    const requestId = runtimeContext?.get("performanceRequestId") || runtimeContext?.get("threadId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-request", {
          logger,
          enableConsole: true,
          logLevel: "info",
        })
      : null;

    // Start performance tracking (only if not already started)
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

        // Always log basic timing to console
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

        // If called from chat endpoint, full summary will be logged there
        // If called from playground, we've logged basic timing above
      },
    };
  },

  // For agent.stream() calls (used by Mastra playground)
  defaultVNextStreamOptions: (options) => {
    const { runtimeContext, mastra } = options;
    const logger = mastra?.getLogger();

    const startTime = performance.now();
    const startTimestamp = new Date().toISOString();

    const requestId = runtimeContext?.get("performanceRequestId") || runtimeContext?.get("threadId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "fnol-agent-request", {
          logger,
          enableConsole: true,
          logLevel: "info",
        })
      : null;

    if (perf && !perf.getTimingData().startTime) {
      perf.start({
        agent: "fnol-agent",
        timestamp: startTimestamp,
      });
    }

    const llmTimer = perf?.startStep("fnol-agent-llm-call", {
      model: "openrouter/google/gemini-2.5-flash",
    });

    return {
      ...getAgentDefaultOptions(options),
      onFinish: async (result) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endTimestamp = new Date().toISOString();

        llmTimer?.end({
          finishReason: result.finishReason,
          usage: result.usage,
        });

        // Always log basic timing
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

        // In playground, end and log full summary here
        if (perf && perf.getTimingData().startTime) {
          perf.end({
            timestamp: endTimestamp,
          });
          perf.logSummary();

          if (requestId) {
            perfLoggerRegistry.finalize(requestId);
          }
        }
      },
    };
  },
});
```

**Key Points:**
- Get the shared performance logger via `performanceRequestId` from `runtimeContext`
- Only start the logger if it hasn't been started (check `!perf.getTimingData().startTime`)
- Track LLM calls with `startStep()` and `end()` in `onFinish` callback
- For playground testing, end and log summary in `defaultVNextStreamOptions`
- For chat endpoint, DO NOT end/log summary (that happens at endpoint level)
- Always log basic timing to console for immediate feedback

### Pattern 3: Tool Execution (Optional)

**File:** `apps/api/src/mastra/tools/some-tool.ts`

Use this pattern if you need to track specific tool operations.

```typescript
import { perfLoggerRegistry } from "../performance-logger";

export const someTool = createTool({
  id: "some-tool",
  description: "...",

  async execute(args) {
    const { runtimeContext, mastra } = args;
    const logger = mastra?.getLogger();

    // Get the shared performance logger
    const requestId = runtimeContext?.get("performanceRequestId");
    const perf = requestId
      ? perfLoggerRegistry.getOrCreate(requestId, "some-tool")
      : null;

    const toolTimer = perf?.startStep("tool-execution", {
      toolName: "some-tool",
    });

    try {
      // Do work here
      const result = await doWork();

      toolTimer?.end({
        success: true,
        resultSize: JSON.stringify(result).length,
      });

      return result;
    } catch (error) {
      toolTimer?.end({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
```

**Key Points:**
- Get shared logger via `performanceRequestId`
- Track tool execution with metadata
- End timer in both success and error cases
- DO NOT start/end the root logger (tools are children of agents)

## Testing

### Testing in Web App

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Send a message through the chat interface

3. Check console output - you'll see:
   ```
   🚀 START: chat-request [2025-11-05T12:34:56.789Z]
      Metadata: { threadId: 'abc', resourceId: 'xyz', messageCount: 1 }

     ▶ orchestrator-stream [2025-11-05T12:34:56.790Z]
       ▶ fnol-agent-llm-call [2025-11-05T12:34:57.123Z]
       ✓ fnol-agent-llm-call (2.34s) [2025-11-05T12:34:59.456Z]
     ✓ orchestrator-stream (3.45s) [2025-11-05T12:35:00.234Z]

   ✅ END: chat-request (3.45s) [2025-11-05T12:35:00.234Z]

   ================================================================================
   📊 PERFORMANCE SUMMARY
   ================================================================================
   Operation: chat-request
   Total Duration: 3.45s

   Breakdown:

   ├─ orchestrator-stream: 3.45s (100.0%)
      ├─ fnol-agent-llm-call: 2.34s (67.8%)

   Time Distribution:
     orchestrator-stream            [████████████████████] 100.0% (3.45s)
     fnol-agent-llm-call            [█████████████░░░░░░░]  67.8% (2.34s)
   ================================================================================
   ```

### Testing in Mastra Playground

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Navigate to the Mastra playground (usually `http://localhost:4111/playground`)

3. Select the agent (e.g., "fnol-agent")

4. Send a test message

5. Check console output - you'll see:
   ```
   🔍 DEBUG: FNOL AGENT defaultVNextStreamOptions CALLED 2025-11-05T13:58:31.412Z

   ================================================================================
   ⏱️  FNOL AGENT TIMING (STREAM)
   ================================================================================
   Started:  2025-11-05T13:58:31.412Z
   Finished: 2025-11-05T13:58:33.456Z
   Duration: 2.04s
   Model:    openrouter/google/gemini-2.5-flash
   Tokens:   456
   Reason:   stop
   ================================================================================

   ================================================================================
   📊 PERFORMANCE SUMMARY
   ================================================================================
   Operation: fnol-agent-request
   Total Duration: 2.04s

   Breakdown:

   ├─ fnol-agent-llm-call: 2.03s (99.5%)

   Time Distribution:
     fnol-agent-llm-call            [████████████████████] 99.5% (2.03s)
   ================================================================================
   ```

## Performance Logger API

### Creating a Logger

```typescript
const perf = perfLoggerRegistry.getOrCreate(
  requestId,        // Unique request identifier
  "operation-name", // Human-readable name
  {
    logger: mastraLogger,     // Optional: Mastra logger instance
    enableConsole: true,      // Show console output
    logLevel: "info",         // "debug" | "info" | "warn"
    includeMetadata: true,    // Include metadata in summary
  }
);
```

### Starting the Root Operation

```typescript
perf.start({
  // Optional metadata
  threadId: "abc",
  resourceId: "xyz",
  timestamp: new Date().toISOString(),
});
```

### Tracking a Step

```typescript
const stepTimer = perf.startStep("step-name", {
  // Optional metadata
  model: "gpt-4",
  userMessageLength: 123,
});

// Do work...

stepTimer.end({
  // Optional result metadata
  responseLength: 456,
  success: true,
});
```

### Ending and Logging Summary

```typescript
perf.end({
  timestamp: new Date().toISOString(),
});

perf.logSummary();
```

### Cleanup

```typescript
perfLoggerRegistry.finalize(requestId);
```

## Best Practices

### ✅ DO

1. **Always cleanup** - Call `finalize()` after logging summary
2. **Use shared logger** - Get logger from registry via `performanceRequestId`
3. **Add metadata** - Include useful context in steps (model, tokens, etc.)
4. **Log after response** - End and log summary only after user receives response
5. **Check if started** - Before starting, check `!perf.getTimingData().startTime`
6. **Implement all stream options** - Add logging to `defaultGenerateOptions`, `defaultStreamOptions`, and `defaultVNextStreamOptions`

### ❌ DON'T

1. **Don't create multiple loggers** - Use the registry to get the shared instance
2. **Don't log too early** - Summary should appear after response is sent
3. **Don't forget error cases** - End timers in both success and error paths
4. **Don't hardcode requestId** - Get from `runtimeContext`
5. **Don't skip cleanup** - Always finalize to prevent memory leaks

## Troubleshooting

### Logs not appearing in playground

**Problem:** Testing agent in Mastra playground, no console output

**Solution:** Ensure logging is implemented in `defaultVNextStreamOptions` (playground uses VNext streaming)

### Logs appearing before response

**Problem:** Performance summary shows before user sees response

**Solution:** Move `perf.end()` and `perf.logSummary()` to AFTER the stream completes (inside `execute` callback)

### Duplicate loggers

**Problem:** Multiple performance summaries for same request

**Solution:** Always use `perfLoggerRegistry.getOrCreate()` instead of `new PerformanceLogger()`

### Missing timing data

**Problem:** Some steps don't appear in summary

**Solution:** Ensure `startStep()` is called before operation and `end()` is called after

### Memory leaks

**Problem:** Performance logger registry grows unbounded

**Solution:** Always call `perfLoggerRegistry.finalize(requestId)` after logging summary

## Example Output

### Console Output (Real-time)

```
🚀 START: chat-request [2025-11-05T12:34:56.789Z]
   Metadata: { threadId: 'thread-123', resourceId: 'user-456', messageCount: 1 }

  ▶ orchestrator-stream [2025-11-05T12:34:56.790Z]
    ▶ fnol-agent-llm-call [2025-11-05T12:34:57.123Z]
      Metadata: { model: 'openrouter/google/gemini-2.5-flash' }
    ✓ fnol-agent-llm-call (2.34s) [2025-11-05T12:34:59.456Z]
      Result: { finishReason: 'stop', usage: { totalTokens: 456 } }
  ✓ orchestrator-stream (3.45s) [2025-11-05T12:35:00.234Z]

✅ END: chat-request (3.45s) [2025-11-05T12:35:00.234Z]
```

### Performance Summary

```
================================================================================
📊 PERFORMANCE SUMMARY
================================================================================
Operation: chat-request
Total Duration: 3.45s

Breakdown:

├─ orchestrator-stream: 3.45s (100.0%)
   ├─ fnol-agent-llm-call: 2.34s (67.8%)

Time Distribution:
  orchestrator-stream            [████████████████████] 100.0% (3.45s)
  fnol-agent-llm-call            [█████████████░░░░░░░]  67.8% (2.34s)
================================================================================
```

## Environment Configuration

You can control performance logging via environment variables:

```bash
# .env
ENABLE_PERFORMANCE_LOGGING=true
PERFORMANCE_LOG_LEVEL=info  # debug | info | warn
PERFORMANCE_INCLUDE_METADATA=true
```

Then update logger creation:

```typescript
const perf = perfLoggerRegistry.getOrCreate(requestId, "operation", {
  logger: mastraInstance.getLogger(),
  enableConsole: process.env.ENABLE_PERFORMANCE_LOGGING === "true",
  logLevel: process.env.PERFORMANCE_LOG_LEVEL as any || "info",
  includeMetadata: process.env.PERFORMANCE_INCLUDE_METADATA !== "false",
});
```

## Integration Checklist

When adding performance logging to a new agent or endpoint:

- [ ] Import `perfLoggerRegistry` from `./performance-logger`
- [ ] Create logger at entry point (endpoint handler)
- [ ] Add `performanceRequestId` to `runtimeContext`
- [ ] Track LLM calls in agent's `defaultGenerateOptions`
- [ ] Track LLM calls in agent's `defaultStreamOptions`
- [ ] Track LLM calls in agent's `defaultVNextStreamOptions`
- [ ] Add `onFinish` callback to end LLM timers
- [ ] Log basic timing in each `onFinish` for immediate feedback
- [ ] End root logger AFTER response is sent to user
- [ ] Log summary AFTER response is sent to user
- [ ] Cleanup with `finalize()` after logging
- [ ] Test in both web app and Mastra playground
- [ ] Verify logs appear AFTER response
- [ ] Verify hierarchical structure is correct

## Summary

Performance logging provides critical visibility into request flow timing. The key principles are:

1. **Create once at entry point** - Chat endpoint or handler
2. **Share via runtimeContext** - Use `performanceRequestId`
3. **Track in agents** - Use `defaultGenerateOptions` and `defaultVNextStreamOptions`
4. **Log after response** - Only log summary when user has received response
5. **Always cleanup** - Finalize the logger to prevent memory leaks

This ensures accurate, hierarchical timing data that helps identify performance bottlenecks across the entire request flow.
