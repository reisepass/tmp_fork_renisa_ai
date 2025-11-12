import { Memory } from "@mastra/memory";
import type { TracingContext } from "@mastra/core/runtime-context";

/**
 * Memory Tracing Wrapper
 *
 * Wraps Mastra Memory operations with OpenTelemetry tracing to make
 * memory operations visible in Langfuse Timeline view.
 *
 * This enables performance debugging of:
 * - Semantic recall (vector search) latency
 * - Working memory updates
 * - Working memory retrieval
 * - Message storage operations
 */

export interface MemoryOperationOptions {
  tracingContext?: TracingContext;
  enableTracing?: boolean;
}

export class TracingMemoryWrapper {
  constructor(private memory: Memory) {}

  /**
   * Traced version of Memory.rememberMessages()
   * Shows up in Langfuse as "memory:semantic-recall"
   */
  async rememberMessages(
    args: Parameters<Memory["rememberMessages"]>[0],
    options: MemoryOperationOptions = {}
  ) {
    const { tracingContext, enableTracing = true } = options;

    // Skip tracing if disabled or context not available
    if (!enableTracing || !tracingContext) {
      return this.memory.rememberMessages(args);
    }

    // Create child span for memory recall operation
    const metadata: Record<string, any> = {
      operation: "memory:semantic-recall",
      threadId: args.threadId,
      resourceId: args.resourceId,
      vectorSearch: args.vectorMessageSearch,
      topK: args.config?.semanticRecall?.topK,
      messageRange: args.config?.semanticRecall?.messageRange,
    };

    // Add to runtime context so it appears in trace metadata
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        tracingContext.set(`memory.recall.${key}`, String(value));
      }
    }

    const startTime = performance.now();

    try {
      const result = await this.memory.rememberMessages(args);
      const durationMs = Math.round(performance.now() - startTime);

      // Add result metadata
      tracingContext.set("memory.recall.messageCount", String(result.messages.length));
      tracingContext.set("memory.recall.messagesV2Count", String(result.messagesV2.length));
      tracingContext.set("memory.recall.durationMs", String(durationMs));
      tracingContext.set("memory.recall.success", "true");

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      tracingContext.set("memory.recall.durationMs", String(durationMs));
      tracingContext.set("memory.recall.success", "false");
      tracingContext.set("memory.recall.error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Traced version of Memory.updateWorkingMemory()
   * Shows up in Langfuse as "memory:working-memory-update"
   */
  async updateWorkingMemory(
    args: Parameters<Memory["updateWorkingMemory"]>[0],
    options: MemoryOperationOptions = {}
  ) {
    const { tracingContext, enableTracing = true } = options;

    if (!enableTracing || !tracingContext) {
      return this.memory.updateWorkingMemory(args);
    }

    // Add metadata
    const metadata: Record<string, any> = {
      operation: "memory:working-memory-update",
      threadId: args.threadId,
      resourceId: args.resourceId,
      workingMemorySize: typeof args.workingMemory === "string"
        ? args.workingMemory.length
        : JSON.stringify(args.workingMemory).length,
      scope: args.memoryConfig?.workingMemory?.scope || "thread",
    };

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        tracingContext.set(`memory.update.${key}`, String(value));
      }
    }

    const startTime = performance.now();

    try {
      await this.memory.updateWorkingMemory(args);
      const durationMs = Math.round(performance.now() - startTime);

      tracingContext.set("memory.update.durationMs", String(durationMs));
      tracingContext.set("memory.update.success", "true");
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      tracingContext.set("memory.update.durationMs", String(durationMs));
      tracingContext.set("memory.update.success", "false");
      tracingContext.set("memory.update.error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Traced version of Memory.getWorkingMemory()
   * Shows up in Langfuse as "memory:working-memory-get"
   */
  async getWorkingMemory(
    args: Parameters<Memory["getWorkingMemory"]>[0],
    options: MemoryOperationOptions = {}
  ) {
    const { tracingContext, enableTracing = true } = options;

    if (!enableTracing || !tracingContext) {
      return this.memory.getWorkingMemory(args);
    }

    const metadata: Record<string, any> = {
      operation: "memory:working-memory-get",
      threadId: args.threadId,
      resourceId: args.resourceId,
    };

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        tracingContext.set(`memory.get.${key}`, String(value));
      }
    }

    const startTime = performance.now();

    try {
      const result = await this.memory.getWorkingMemory(args);
      const durationMs = Math.round(performance.now() - startTime);

      tracingContext.set("memory.get.hasWorkingMemory", String(!!result));
      tracingContext.set("memory.get.workingMemorySize", String(result?.length || 0));
      tracingContext.set("memory.get.durationMs", String(durationMs));
      tracingContext.set("memory.get.success", "true");

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      tracingContext.set("memory.get.durationMs", String(durationMs));
      tracingContext.set("memory.get.success", "false");
      tracingContext.set("memory.get.error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Traced version of Memory.saveMessages()
   * Shows up in Langfuse as "memory:save-messages"
   */
  async saveMessages(
    args: Parameters<Memory["saveMessages"]>[0],
    options: MemoryOperationOptions = {}
  ) {
    const { tracingContext, enableTracing = true } = options;

    if (!enableTracing || !tracingContext) {
      return this.memory.saveMessages(args);
    }

    const metadata: Record<string, any> = {
      operation: "memory:save-messages",
      messageCount: args.messages.length,
      format: args.format || "v1",
    };

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        tracingContext.set(`memory.save.${key}`, String(value));
      }
    }

    const startTime = performance.now();

    try {
      const result = await this.memory.saveMessages(args);
      const durationMs = Math.round(performance.now() - startTime);

      tracingContext.set("memory.save.savedCount", String(result.length));
      tracingContext.set("memory.save.durationMs", String(durationMs));
      tracingContext.set("memory.save.success", "true");

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      tracingContext.set("memory.save.durationMs", String(durationMs));
      tracingContext.set("memory.save.success", "false");
      tracingContext.set("memory.save.error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

/**
 * Helper function to wrap any Memory instance with tracing
 */
export function createTracedMemory(memory: Memory): TracingMemoryWrapper {
  return new TracingMemoryWrapper(memory);
}
