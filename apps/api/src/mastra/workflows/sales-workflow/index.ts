import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  commonSuspendSchema,
  mainInputSchema,
  salesWorkflowSchema,
} from "@renisa-ai/config/schema";

import { getWorkflowMessage } from "../../i18n";
import { getRuntimeContextLocale } from "../utils";

import { dataCollectionWorkflow } from "./01_data-collection";
import { quotePresentationWorkflow } from "./02_quote-presentation";
import { underwritingWorkflow } from "./03_underwriting";
import { personalDataWorkflow } from "./04_personal-data";
import { reviewLegalWorkflow } from "./05_review-legal";
import { paymentSuccessWorkflow } from "./06_payment-success";

const successStep = createStep({
  id: "success-step",
  description: "Success step",
  inputSchema: salesWorkflowSchema,
  outputSchema: commonSuspendSchema,
  execute: async ({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    runtimeContext,
  }) => {
    const logger = mastra.getLogger();
    logger.info(`step: ${successStep.id}`, {
      workflowId,
      stepId: successStep.id,
      runId,
      runCount,
      inputData,
    });

    const locale = getRuntimeContextLocale(runtimeContext);
    const message = getWorkflowMessage(locale, "sales", "step_success");
    return {
      reason: "user_input" as const,
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: message
            .replace("{firstName}", inputData.dataCollection?.firstName || "")
            .replace("{lastName}", inputData.dataCollection?.lastName || ""),
        },
      ],
    };
  },
});

export const salesWorkflow = createWorkflow({
  id: "sales-workflow",
  description: "6-step sales process with pausable execution",
  inputSchema: mainInputSchema,
  outputSchema: commonSuspendSchema,
  steps: [
    dataCollectionWorkflow,
    quotePresentationWorkflow,
    underwritingWorkflow,
    personalDataWorkflow,
    reviewLegalWorkflow,
    paymentSuccessWorkflow,
    successStep,
  ],
})
  .then(dataCollectionWorkflow)
  .then(quotePresentationWorkflow)
  .then(underwritingWorkflow)
  .then(personalDataWorkflow)
  .then(reviewLegalWorkflow)
  .then(paymentSuccessWorkflow)
  .then(successStep)
  .commit();
