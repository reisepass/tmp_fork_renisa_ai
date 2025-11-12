import { MastraMemory, StorageThreadType } from "@mastra/core/memory";
import { RuntimeContext } from "@mastra/core/runtime-context";
import {
  Locale
} from "@renisa-ai/config/types";
import { generateId } from "ai";

export function getRuntimeContextLocale(
  runtimeContext: RuntimeContext
): Locale {
  return (runtimeContext.get("locale") as Locale) || "de-DE";
}

export function getRuntimeContextMemory(runtimeContext: RuntimeContext): {
  threadId: string;
  resourceId: string;
} {
  const threadId = runtimeContext?.get("threadId") as string | undefined;
  if (!threadId) {
    throw new Error("Thread ID is required");
  }
  const resourceId = runtimeContext?.get("resourceId") as string | undefined;
  if (!resourceId) {
    throw new Error("Resource ID is required");
  }
  return {
    threadId,
    resourceId,
  };
}

export function generateToolCallId(): string {
  return `call_${generateId()}`;
}

export function generateTextId(): string {
  return `msg_${generateId()}`;
}

interface TypedStorageThreadType<T extends Record<string, unknown>>
  extends Omit<StorageThreadType, "metadata"> {
  metadata: T | undefined | null;
}

export class ThreadMemory<T extends Record<string, unknown>> {
  constructor(
    private threadId: string,
    private resourceId: string,
    private memory: MastraMemory | undefined
  ) {}

  get title(): string {
    return `${this.threadId}_${new Date().toISOString()}`;
  }

  async get(): Promise<TypedStorageThreadType<T> | undefined | null> {
    const workflowThread = await this.memory?.getThreadById({
      threadId: this.threadId,
    });
    if (!workflowThread) {
      await this.memory?.createThread({
        threadId: this.threadId,
        resourceId: this.resourceId,
        title: this.title,
        saveThread: true,
      });
    }
    return workflowThread as TypedStorageThreadType<T>;
  }

  async update(metadata: Partial<T>): Promise<void> {
    const workflowThread = await this.get();
    const timestamp = new Date();
    await this.memory?.saveThread({
      thread: {
        id: this.threadId,
        resourceId: this.resourceId,
        createdAt: workflowThread?.createdAt || timestamp,
        updatedAt: timestamp,
        title: workflowThread?.title || this.title,
        metadata: {
          ...(workflowThread?.metadata || {}),
          ...metadata,
        },
      },
    });
  }
}
