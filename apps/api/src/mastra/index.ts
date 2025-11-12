import { toAISdkFormat } from "@mastra/ai-sdk";
import { SamplingStrategyType } from "@mastra/core/ai-tracing";
import { Mastra } from "@mastra/core/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { registerApiRoute } from "@mastra/core/server";
import { LangfuseExporter } from "@mastra/langfuse";
import { PinoLogger } from "@mastra/loggers";
import { getEnvConfig } from "@renisa-ai/config/env";
import { localeEnum } from "@renisa-ai/config/schema";
import { UIMessage } from "@renisa-ai/config/types";
import { isAllowedOrigin, localeToLocaleCode } from "@renisa-ai/utils";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";

import { handleRespond, handleVoice } from "../twilio/handlers";

import { dataExtractorAgent } from "./agents/data-extractor";
import { dataValidatorAgent } from "./agents/data-validator";
import { fnolAgentLite } from "./agents/fnol-agent-lite";
import { intentClassifierAgent } from "./agents/intent-classifier";
import { orchestratorAgent } from "./agents/orchestrator";
import { triageRouterAgent } from "./agents/triage-router"; 
import { pgVector, postgresStore } from "./memory";
import { authMiddleware } from "./middlewares";
import { perfLoggerRegistry } from "./performance-logger";
import { fetchDynamicDocument } from "./requests";
// DEPRECATED: ol-chat endpoint is no longer in use
// import { handleOlChat } from "./routes/ol-chat";
// DEPRECATED: Backend info endpoint is no longer in use
// import { getBackendInfo } from "./info";
import { authenticationWorkflow } from "./workflows/authentication";
import { policyManagementWorkflow } from "./workflows/policy-management";
import { policyManagementInquiryWorkflow } from "./workflows/policy-management/policy-management-inquiry";
import { policyManagementTerminateWorkflow } from "./workflows/policy-management/policy-management-terminate";
import { salesWorkflow } from "./workflows/sales-workflow";
import { dataCollectionWorkflow } from "./workflows/sales-workflow/01_data-collection";
import { quotePresentationWorkflow } from "./workflows/sales-workflow/02_quote-presentation";
import { underwritingWorkflow } from "./workflows/sales-workflow/03_underwriting";
import { personalDataWorkflow } from "./workflows/sales-workflow/04_personal-data";
import { reviewLegalWorkflow } from "./workflows/sales-workflow/05_review-legal";
import { paymentSuccessWorkflow } from "./workflows/sales-workflow/06_payment-success";

const { isDevelopment, isLocal, langfuse, env, logLevel } = getEnvConfig();

export const mastra: Mastra = new Mastra({
  events: {},
  vectors: {
    knowledgeBase: pgVector,
  },
  workflows: {
    authenticationWorkflow,
    policyManagementWorkflow,
    policyManagementInquiryWorkflow,
    policyManagementTerminateWorkflow,
    salesWorkflow,
    dataCollectionWorkflow,
    quotePresentationWorkflow,
    underwritingWorkflow,
    personalDataWorkflow,
    reviewLegalWorkflow,
    paymentSuccessWorkflow,
  },
  agents: {
    dataExtractorAgent,
    dataValidatorAgent,
    fnolAgentLite,
    orchestratorAgent,
    intentClassifierAgent,
    triageRouterAgent,
  },
  storage: postgresStore,
  logger: new PinoLogger({
    name: "Mastra",
    level: logLevel,
  }),
  idGenerator: generateId,
  observability: langfuse.withObservability
    ? {
        configs: {
          langfuse: {
            serviceName: "mastra-app",
            sampling: { type: SamplingStrategyType.ALWAYS },
            // Automatically extract langfusePrompt from RuntimeContext
            // This creates the bidirectional link between prompts and traces in Langfuse
            // See: https://langfuse.com/docs/prompt-management/features/link-to-traces
            runtimeContextKeys: ["langfusePrompt"],
            exporters: [
              new LangfuseExporter({
                ...langfuse.config,
                realtime: isDevelopment || isLocal,
                logLevel: "debug",
                options: {
                  environment: env,
                },
              }),
            ],
          },
        },
      }
    : undefined,
  server: {
    cors: {
      origin(origin) {
        const { env } = getEnvConfig();

        // Allow all .renisa.ai subdomains immediately
        if (origin && (origin.includes(".renisa.ai"))) {
          return origin;
        }

        // Otherwise use the standard check
        if (!origin || !isAllowedOrigin(env, origin)) {
          return null;
        }

        return origin;
      },
      allowHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    },
    apiRoutes: [
      // DEPRECATED: Backend info endpoint is no longer in use
      // registerApiRoute("/info", {
      //   method: "GET",
      //   handler: async (c) => {
      //     const info = await getBackendInfo();
      //     return c.json(info);
      //   },
      // }),
      // DEPRECATED: OL Chat endpoint is no longer in use
      // Use the main /chat endpoint instead
      // registerApiRoute("/ol-chat", {
      //   method: "POST",
      //   handler: handleOlChat,
      // }),
      ...Object.values(localeEnum.enum).map((locale) => {
        const localeCode = localeToLocaleCode(locale);
        return registerApiRoute(`/${localeCode}/chat`, {
          method: "POST",
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
              "chat-request",
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

            const contextEntries: [string, string][] = [["locale", locale]];
            if (threadId) {
              contextEntries.push(["threadId", threadId]);
              contextEntries.push(["sessionId", threadId]);
            }
            if (resourceId) {
              contextEntries.push(["resourceId", resourceId]);
              contextEntries.push(["userId", resourceId]);
            }

            // Add performance request ID to context
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

            // Track orchestrator stream
            const orchestratorTimer = perf.startStep("orchestrator-stream", {
              agent: "orchestratorAgent",
              messageCount: newMessages.length,
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
                let inToolExecution = false;

                for await (const part of toAISdkFormat(stream, {
                  from: "agent",
                })) {
                  // Log all parts to debug what we're receiving
                  mastraInstance.getLogger()?.debug('Stream part received', {
                    type: part.type,
                    inToolExecution,
                  });

                  // Track when we enter/exit tool execution
                  if (part.type === 'tool-call') {
                    inToolExecution = true;
                    mastraInstance.getLogger()?.debug('Tool execution started');
                    continue; // Skip tool call
                  }

                  if (part.type === 'tool-result') {
                    inToolExecution = false;
                    mastraInstance.getLogger()?.debug('Tool execution completed');
                    continue; // Skip tool result
                  }

                  // Filter out ANY text/data that comes during tool execution
                  // This prevents FNOL agent's intermediate output from showing
                  if (inToolExecution) {
                    mastraInstance.getLogger()?.debug('Filtering part during tool execution', { type: part.type });
                    continue;
                  }

                  // Only write parts that are NOT during tool execution
                  writer.write(part);
                }

                // Stream is complete, now end tracking
                orchestratorTimer.end();
                perf.end({
                  timestamp: new Date().toISOString(),
                });

                // Log summary AFTER response is sent to user
                perf.logSummary();

                // Cleanup
                perfLoggerRegistry.finalize(requestId);
              },
            });

            // Create a Response that streams the UI message stream to the client
            return createUIMessageStreamResponse({
              stream: uiMessageStream,
            });
          },
        });
      }),
      registerApiRoute("/proxy/documents/:policyId", {
        method: "GET",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const { policyId } = c.req.param();
          const response = await fetchDynamicDocument(
            policyId,
            {
              documentType: "Beratungsprotokoll",
              partnerId: "ab7853b0-fae2-4c31-a87d-9ea7d4379570",
            },
            mastra.getLogger()
          );
          if (!response.data) {
            return new Response("No data", { status: 404 });
          }
          const base64 = response.data.data;
          const buffer = Buffer.from(base64, "base64");
          return new Response(buffer, {
            headers: {
              "Content-Type": "application/pdf",
            },
          });
        },
      }),
      // Twilio voice endpoints
      registerApiRoute("/twilio/voice", {
        method: "POST",
        handler: handleVoice,
      }),
      registerApiRoute("/twilio/respond", {
        method: "POST",
        handler: handleRespond,
      }),
    ],
    middleware: [
      {
        path: "/api/*",
        handler: authMiddleware,
      },
      {
        path: "/proxy/*",
        handler: authMiddleware,
      },
    ],
  },
});
