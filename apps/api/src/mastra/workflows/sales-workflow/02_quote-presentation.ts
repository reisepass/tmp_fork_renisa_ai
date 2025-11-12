import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  commonResumeSchema,
  commonSuspendSchema,
  salesWorkflowSchema,
} from "@renisa-ai/config/schema";
import { z } from "zod";

import { getWorkflowMessage } from "../../i18n";
import { getRuntimeContextLocale } from "../utils";
import { deriveIntent } from "../utils/derive-intent";

const quoteIntentSchema = z.union([
  z
    .literal("details")
    .describe(
      [
        "If the message asks for **details**, **comparison**, **what's included**, **limits**, **exclusions**, or **clarification**, e.g.:",
        "- de: `Details`, `mehr Infos`, `genau`, `im Detail`, `Leistungsübersicht`, `Tarifunterschiede`, `vergleichen`, `was ist enthalten`",
        "- en: `details`, `more info`, `what's included`, `what exactly`, `compare`, `coverage details`, `limits`, `exclusions`",
      ].join("\n")
    ),
  z
    .literal("continue")
    .describe(
      [
        "If the latest user message is only a **continue/acknowledgement** (case-insensitive, punctuation tolerated):",
        "- de: `weiter`, `passt`, `ok`, `okay`, `ja`, `jup`, `danke`, `alles klar`",
        "- en: `continue`, `go on`, `yes`, `ok`, `sounds good`, `let's proceed`, `all good`",
        "This is the default intent if the user does not ask for details.",
      ].join("\n")
    ),
]);

const quotePresentationStep = createStep({
  id: "quote-presentation-step",
  description: "Present the quote to the user",
  inputSchema: salesWorkflowSchema,
  resumeSchema: commonResumeSchema,
  suspendSchema: commonSuspendSchema,
  outputSchema: salesWorkflowSchema,
  async execute({
    inputData,
    mastra,
    resumeData,
    suspend,
    runtimeContext,
    workflowId,
    runCount,
    runId,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${quotePresentationStep.id}`, {
      workflowId,
      stepId: quotePresentationStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    const locale = getRuntimeContextLocale(runtimeContext);
    const message = getWorkflowMessage(locale, "sales", "step_2_1");

    if (resumeData) {
      const derived = await deriveIntent({
        mastra,
        runtimeContext,
        question: message,
        userMessage: resumeData.userMessage,
        schema: z.object({
          intent: quoteIntentSchema,
          confidence: z.number(),
        }),
      });

      return {
        ...inputData,
        completed:
          (derived && derived.confidence < 0.5) ||
          derived?.intent === "continue",
      };
    }

    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: message.replace(
            "{price}",
            Intl.NumberFormat(locale, {
              style: "currency",
              currency: "EUR",
            }).format(inputData.quote?.data?.gross || 0)
          ),
        },
      ],
    });
  },
});

const followUpStep = createStep({
  id: "follow-up-step",
  description: "Follow up with the user",
  inputSchema: salesWorkflowSchema,
  resumeSchema: commonResumeSchema,
  suspendSchema: commonSuspendSchema,
  outputSchema: salesWorkflowSchema,
  async execute({
    inputData,
    suspend,
    runtimeContext,
    workflowId,
    runCount,
    runId,
    mastra,
    resumeData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${followUpStep.id}`, {
      workflowId,
      stepId: followUpStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    if (resumeData) {
      return inputData;
    }

    const locale = getRuntimeContextLocale(runtimeContext);
    const message = getWorkflowMessage(locale, "sales", "step_2_2");
    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: message.replace(
            "{price}",
            Intl.NumberFormat(locale, {
              style: "currency",
              currency: "EUR",
            }).format(inputData.quote?.data?.gross || 0)
          ),
        },
      ],
    });
  },
});

export const quotePresentationWorkflow = createWorkflow({
  id: "02-quote-presentation-flow",
  description: "Quote presentation flow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [quotePresentationStep, followUpStep],
})
  .then(quotePresentationStep)
  .branch([[async ({ inputData }) => !inputData.completed, followUpStep]])
  .map(async ({ getInitData }) => getInitData())
  .commit();
