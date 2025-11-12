import { createTool, Step, WorkflowResult } from "@mastra/core";
import {
  activeWorkflowSchema,
  authenticationSchema,
  baseWorkflowInputSchema,
  commonResumeSchema,
  commonSuspendSchema,
  mainInputSchema,
  baseWorkflowOutputSchema,
  MainThreadMemory,
  workflowIdsEnum,
} from "@renisa-ai/config/schema";
import { getEnvConfig } from "@renisa-ai/config/env";
import { camelCase, notEqual } from "@renisa-ai/utils";
import { z } from "zod";

import { getTranslation } from "../i18n";
import { MastraInstance } from "../types";
import { getRuntimeContextLocale, ThreadMemory } from "../workflows/utils";

const { isDevelopment, isLocal } = getEnvConfig();

type WorkflowToolResult = WorkflowResult<
  typeof baseWorkflowInputSchema,
  typeof commonSuspendSchema,
  typeof baseWorkflowOutputSchema,
  Step<string, any, any>[]
>;

type WorkflowId = z.infer<typeof workflowIdsEnum>;

export interface WorkflowToolArgs {
  id: WorkflowId;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createWorkflowTool({ id, description }: WorkflowToolArgs) {
  const toolId = `${id}-tool`;
  return createTool({
    id: toolId,
    description,
    inputSchema: baseWorkflowInputSchema,
    outputSchema: baseWorkflowOutputSchema,
    async execute(args) {
      const {
        threadId,
        resourceId,
        context,
        runId,
        runtimeContext,
        writer,
        memory,
      } = args;
      const mastra = args.mastra as MastraInstance;

      if (!threadId || !resourceId) {
        throw new Error("Thread ID and resource ID are required");
      }

      if (!mastra) {
        throw new Error("Mastra not found");
      }

      const { userMessage } = baseWorkflowInputSchema.parse(context);

      const logger = mastra.getLogger();

      runtimeContext.set("threadId", threadId);
      runtimeContext.set("resourceId", resourceId);

      const threadMemory = new ThreadMemory<MainThreadMemory>(
        `workflow_${threadId}`,
        resourceId,
        memory
      );
      const thread = await threadMemory.get();
      runtimeContext.set("authentication", thread?.metadata?.authentication);

      const activeWorkflow = thread?.metadata?.activeWorkflow;
      const dataCollection = thread?.metadata?.dataCollection || null;

      logger.info(`tool: ${toolId}`, {
        context,
        runtimeContext: Object.fromEntries(runtimeContext.entries() || []),
        thread,
        threadId,
        resourceId,
        runId,
        userMessage,
        activeWorkflow,
        dataCollection,
      });

      try {
        const workflow = mastra.getWorkflow(camelCase(id));
        const run = await workflow.createRunAsync({
          runId: activeWorkflow?.runId,
        });

        const runData = {
          userMessage,
          dataCollection,
        } satisfies
          | z.infer<typeof commonResumeSchema>
          | z.infer<typeof mainInputSchema>;

        const result = activeWorkflow?.runId
          ? await run.resume({
              step: activeWorkflow?.currentStepId[0],
              resumeData: runData,
              runtimeContext,
              writableStream: writer,
            })
          : await run.start({
              inputData: runData,
              runtimeContext,
              writableStream: writer,
            });

        const runtimeAuthentication = authenticationSchema.safeParse(
          runtimeContext.get("authentication")
        );
        if (
          notEqual(runtimeAuthentication.data, thread?.metadata?.authentication)
        ) {
          await threadMemory.update({
            authentication: runtimeAuthentication.data,
          });
        }

        const updatedActiveWorkflow = getActiveWorkflow(result, run.runId);
        runtimeContext.set("currentlyActiveWorkflowId", id);

        logger.debug("result", result);

        const response = await getSuspend(result);
        logger.debug("response", { response });

        await threadMemory.update({
          dataCollection: response.dataCollection || dataCollection || null,
          activeWorkflow: updatedActiveWorkflow,
        });

        if (response.reason === "abort") {
          logger.warn(`${toolId}-abort`, { response });
          runtimeContext.set("currentlyActiveWorkflowId", "");
          await threadMemory.update({ activeWorkflow: null });
          await run.cancel();
        }

        return {
          messages: response.messages,
        };
      } catch (error) {
        runtimeContext.set("currentlyActiveWorkflowId", "");
        await threadMemory.update({ activeWorkflow: null });
        logger.warn(`${toolId}-error`, error);

        const locale = getRuntimeContextLocale(runtimeContext);
        await threadMemory.update({
          dataCollection: null,
        });
        return {
          messages: [
            {
              type: "error" as const,
              content:
                (error as Error).message ||
                String(error) ||
                getTranslation(locale, "genericError"),
              context: { source: "workflow_error", workflowId: id },
            },
          ],
        };
      }

      function getActiveWorkflow(
        resolved: WorkflowToolResult | undefined,
        runId: string
      ) {
        if (resolved?.status === "suspended") {
          return {
            id,
            runId,
            currentStepId: resolved.suspended,
          } satisfies z.infer<typeof activeWorkflowSchema>;
        }
        return null;
      }

      async function getSuspend(
        resolved?: WorkflowToolResult
      ): Promise<z.infer<typeof commonSuspendSchema>> {
        switch (resolved?.status) {
          case "success": {
            if (resolved.result.messages) {
              const parsed = commonSuspendSchema.safeParse(resolved.result);
              if (parsed.success) {
                return parsed.data;
              }
              throw z.prettifyError(parsed.error);
            }
            // FIXME: This is a hack to get the response from the result, currently the types seem to be broken
            const obj = resolved.result as unknown as Record<
              string,
              typeof resolved.result
            >;
            const key = Object.keys(obj)[0];

            const parsed = commonSuspendSchema.safeParse(obj?.[key]);
            if (parsed.success) {
              return parsed.data;
            }
            throw z.prettifyError(parsed.error);
          }
          case "suspended": {
            const parsed = commonSuspendSchema.safeParse(
              resolved.steps[
                (typeof resolved.suspended[0] === "string"
                  ? resolved.suspended[0]
                  : resolved.suspended[0][0]) as keyof typeof resolved.steps
              ].suspendPayload
            );
            if (parsed.success) {
              return parsed.data;
            }
            throw z.prettifyError(parsed.error);
          }
          case "failed": {
            const message =
              typeof resolved.error === "string"
                ? resolved.error
                : resolved.error.message;
            logger.info("orchestrator-agent-error-failed", {
              type: typeof resolved.error,
              error: resolved.error,
              message,
            });
            throw `${message}`.split("\n")[0] || message;
          }
          default:
            throw new Error("Unknown error");
        }
      }
    },
  });
}

export interface AgentToolArgs {
  id: string;
  agentName: string;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createAgentTool({ id, agentName, description }: AgentToolArgs) {
  const toolId = `${id}-tool`;
  return createTool({
    id: toolId,
    description,
    inputSchema: baseWorkflowInputSchema,
    outputSchema: baseWorkflowOutputSchema,
    async execute(args) {
      const {
        threadId,
        resourceId,
        context,
        runId,
        runtimeContext,
        memory,
      } = args;
      const mastra = args.mastra as MastraInstance;

      if (!threadId || !resourceId) {
        throw new Error("Thread ID and resource ID are required");
      }

      if (!mastra) {
        throw new Error("Mastra not found");
      }

      const { userMessage } = baseWorkflowInputSchema.parse(context);

      const logger = mastra.getLogger();

      runtimeContext.set("threadId", threadId);
      runtimeContext.set("resourceId", resourceId);

      const threadMemory = new ThreadMemory<MainThreadMemory>(
        `${threadId}_${toolId}`,
        resourceId,
        memory
      );
      const thread = await threadMemory.get();
      runtimeContext.set("authentication", thread?.metadata?.authentication);

      const dataCollection = thread?.metadata?.dataCollection || null;

      logger.info(`tool: ${toolId}`, {
        context,
        runtimeContext: Object.fromEntries(runtimeContext.entries() || []),
        thread,
        threadId,
        resourceId,
        runId,
        userMessage,
        dataCollection,
      });

      try {
        // Track total agent execution time
        const agentStartTime = performance.now();
        const agentStartTimestamp = new Date().toISOString();

        if (isDevelopment || isLocal) {
          logger.debug(`\n📞 ${toolId.toUpperCase()} - Agent Execution Started:`, agentStartTimestamp);
        }

        // Get the agent instead of workflow
        const agent = mastra.getAgent(agentName);

        if (!agent) {
          throw new Error(`Agent ${agentName} not found`);
        }

        // Mark this as a tool call so the agent knows it's being called by another agent
        // This allows the agent to output plain text instead of JSON
        runtimeContext.set('isToolCall', 'true');
        runtimeContext.set('parentAgent', 'orchestrator');
        runtimeContext.set('callingTool', toolId);

        // Call agent with memory context
        const result = await agent.generate(userMessage, {
          runtimeContext,
          memory: {
            thread: threadId,
            resource: resourceId,
          },
          tracingOptions: {
            metadata: {
              ...Object.fromEntries(runtimeContext.entries() || []),
              agentName,
              toolId,
              isToolCall: true,
            },
          },
        });

        const agentEndTime = performance.now();
        const agentDuration = agentEndTime - agentStartTime;
        const agentEndTimestamp = new Date().toISOString();

        if (!result?.text) {
          throw new Error("Agent did not return a response");
        }

        // Parse JSON responses and extract user-facing content
        let responseContent = result.text;
        try {
          const trimmed = result.text.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed) as {
              nextQuestion?: string;
              extractedData?: unknown;
              internalReasoning?: unknown;
            };

            // If we have a structured response with nextQuestion, use only that
            if (parsed.nextQuestion) {
              responseContent = parsed.nextQuestion;

              if (isDevelopment || isLocal) {
                logger.debug(`\n🔍 ${toolId.toUpperCase()} - Extracted nextQuestion from JSON response`);
                logger.debug(`Original length: ${result.text.length} chars`);
                logger.debug(`Extracted length: ${responseContent.length} chars`);
              }
            }
          }
        } catch (e) {
          // If JSON parsing fails, use original text
          if (isDevelopment || isLocal) {
            logger.debug(`\n⚠️  ${toolId.toUpperCase()} - Could not parse response as JSON, using as-is`);
          }
        }

        logger.info("agent-response", {
          responseLength: responseContent.length,
          originalLength: result.text.length,
          wasJsonParsed: responseContent !== result.text,
          threadId,
          resourceId,
        });

        // Log total agent execution time
        if (isDevelopment || isLocal) {
          logger.debug("\n" + "=".repeat(60));
          logger.debug(`📊 ${toolId.toUpperCase()} - TOTAL EXECUTION TIME`);
          logger.debug("=".repeat(60));
          logger.debug(`Agent:              ${agentName}`);
          logger.debug(`Started:            ${agentStartTimestamp}`);
          logger.debug(`Finished:           ${agentEndTimestamp}`);
          logger.debug(`Total Duration:     ${(agentDuration / 1000).toFixed(2)}s`);
          logger.debug(`Response Length:    ${responseContent.length} chars`);
          logger.debug("=".repeat(60) + "\n");
        }

        // Store data collection in thread memory if needed
        await threadMemory.update({
          dataCollection: dataCollection || null,
        });

        // Return the response content as a static message
        if (isDevelopment || isLocal) {
          logger.debug(`\n🔧 Tool returning response as static message`);
          logger.debug(`Response preview: ${responseContent.substring(0, 100)}...`);
        }

        return {
          messages: [
            {
              type: "static" as const,
              content: responseContent,
            },
          ],
        };
      } catch (error) {
        logger.warn(`${toolId}-error`, error);

        const locale = getRuntimeContextLocale(runtimeContext);
        await threadMemory.update({
          dataCollection: null,
        });
        return {
          messages: [
            {
              type: "error" as const,
              content:
                (error as Error).message ||
                String(error) ||
                getTranslation(locale, "genericError"),
              context: { source: "agent_error", agentName },
            },
          ],
        };
      }
    },
  });
}
