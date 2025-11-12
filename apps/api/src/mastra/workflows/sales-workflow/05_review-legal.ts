import { createStep, createWorkflow } from "@mastra/core/workflows";
import { config } from "@renisa-ai/config";
import {
  commonResumeSchema,
  commonSuspendSchema,
  dataCollectionSchema,
  salesWorkflowSchema,
} from "@renisa-ai/config/schema";
import { notEqual } from "@renisa-ai/utils";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { z } from "zod";

import { getEnrichedDataReview, getWorkflowMessage } from "../../i18n";
import { createPolicyDraft } from "../../requests";
import { getRuntimeContextLocale } from "../utils";
import { collectDataHybrid } from "../utils/data-collection";
import { deriveIntent } from "../utils/derive-intent";

const reviewDataStep = createStep({
  id: "review-data-step",
  description: "Review the data collected",
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
    runCount,
    workflowId,
    runId,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${reviewDataStep.id}`, {
      workflowId,
      stepId: reviewDataStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    if (inputData.dataCollection && !inputData.dataCollection.startDate) {
      inputData.dataCollection.startDate = addDays(new Date(), 1).toISOString();
    }

    const locale = getRuntimeContextLocale(runtimeContext);
    const message = getWorkflowMessage(
      locale,
      "sales",
      runCount === 0 ? "step_5_1" : "step_5_2"
    );

    if (!resumeData?.userMessage) {
      const reviewData = getEnrichedDataReview(
        locale,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        inputData.dataCollection!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        inputData.quote!
      );

      return await suspend({
        reason: "user_input",
        dataCollection: inputData.dataCollection,
        messages: [
          {
            type: "static" as const,
            content: [
              message,
              reviewData,
              getWorkflowMessage(
                locale,
                "sales",
                runCount === 0 ? "step_5_1_1" : "step_5_2_1"
              ),
            ].join("\n\n"),
          },
        ],
      });
    }

    const collectedData = await collectDataHybrid({
      mastra,
      runtimeContext,
      keys: [],
      question: message,
      userMessage: resumeData.userMessage,
      alreadyCollectedData: inputData.dataCollection,
      schema: dataCollectionSchema,
    });

    if (collectedData.error) {
      return await suspend({
        reason: "user_input",
        dataCollection: inputData.dataCollection,
        messages: [
          {
            type: "error" as const,
            content:
              typeof collectedData.error === "string"
                ? collectedData.error
                : JSON.stringify(collectedData.error),
            context: { step: "review-data" },
          },
        ],
      });
    }

    const hasBeenChanged = notEqual(
      collectedData.dataCollection,
      inputData.dataCollection
    );
    logger.info("hasBeenChanged", {
      hasBeenChanged,
      collected: collectedData.dataCollection,
      input: inputData.dataCollection,
    });

    return {
      ...inputData,
      dataCollection: collectedData.dataCollection,
      completed: !hasBeenChanged,
    };
  },
});

export const createPolicyDraftStep = createStep({
  id: "create-policy-draft-step",
  description: "Calculate the quote with all necessary data from the user.",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  retries: 3,
  async execute({ inputData, mastra, runCount, workflowId, runId }) {
    const { dataCollection, quote } = inputData;
    if (!dataCollection) {
      throw new Error("Data collection not found");
    }
    const logger = mastra.getLogger();
    logger.info(`step: ${createPolicyDraftStep.id}`, {
      workflowId,
      stepId: createPolicyDraftStep.id,
      runId,
      runCount,
      inputData,
    });

    const previousClaims = !!dataCollection.hasClaims;
    const policyDraft = await createPolicyDraft(
      {
        productName: "aldiHaftpflicht",
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        values: {
          policyHolderPlz: dataCollection.zipCode!,
          policyHolderDateOfBirth: dataCollection.dateOfBirth!,
          previousInsurer: "",
          previousInsuranceNumber: "",
          previousClaims,
          previousClaimsQuantity: previousClaims
            ? dataCollection.claimCount!
            : 0,
          switchService: "full",
          policyStartDate: format(dataCollection.startDate!, config.dateFormat),
          coverageScope: dataCollection.coverageScope!,
          paymentSchedule:
            quote?.data?.requestData.values.paymentSchedule || "monthly",
        },
        customer: {
          email: dataCollection.email!,
          firstName: dataCollection.firstName!,
          lastName: dataCollection.lastName!,
          phone: "",
          values: {
            dateOfBirth: dataCollection.dateOfBirth!,
            addressStreet: dataCollection.street!,
            addressHouseNumber: dataCollection.houseNumber!,
            addressPlz: dataCollection.zipCode!,
            addressCity: dataCollection.city!,
          },
        },
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        package: "M",
        addons: [],
        partnerId: "ab7853b0-fae2-4c31-a87d-9ea7d4379570",
      },
      logger
    );
    return {
      ...inputData,
      policyDraft,
    };
  },
});

export const downloadDocumentsStep = createStep({
  id: "download-documents-step",
  description: "Download the documents",
  inputSchema: salesWorkflowSchema,
  resumeSchema: commonResumeSchema,
  outputSchema: salesWorkflowSchema,
  async execute({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    runtimeContext,
    suspend,
    resumeData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${downloadDocumentsStep.id}`, {
      workflowId,
      stepId: downloadDocumentsStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    const locale = getRuntimeContextLocale(runtimeContext);
    if (resumeData) {
      const derived = await deriveIntent({
        mastra,
        runtimeContext,
        question: "Do you want to continue?",
        userMessage: resumeData.userMessage,
        schema: z.object({
          intent: z.union([
            z
              .literal("cancel")
              .describe(
                "If the user wants to cancel the flow. Eg. `cancel`, `stop`, `stopp`, and variations of these, also in different languages."
              ),
            z
              .literal("continue")
              .describe(
                "If the user wants to continue. Eg. `continue`, `go on`, `yes`, `ok`, `sounds good`, `let's proceed`, `all good`, `To the payment details` and variations of these, also in different languages."
              ),
          ]),
          confidence: z.number(),
        }),
      });

      if (derived?.intent === "cancel") {
        return await suspend({
          reason: "abort",
          dataCollection: inputData.dataCollection,
          messages: [
            {
              type: "static" as const,
              content: getWorkflowMessage(locale, "sales", "step_cancel"),
            },
          ],
        });
      }

      return {
        ...inputData,
        completed: true,
      };
    }

    const message = getWorkflowMessage(locale, "sales", "step_5_3");
    const messageWithUrl = message.replace(
      "{downloadUrl}",
      `/api/documents/${inputData.policyDraft?.policyId}`
    );

    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: messageWithUrl,
        },
      ],
    });
  },
});

export const acceptDocumentsStep = createStep({
  id: "accept-documents-step",
  description: "Accept the documents",
  inputSchema: salesWorkflowSchema,
  resumeSchema: commonResumeSchema,
  outputSchema: salesWorkflowSchema,
  async execute({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    runtimeContext,
    suspend,
    resumeData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${acceptDocumentsStep.id}`, {
      workflowId,
      stepId: acceptDocumentsStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    const locale = getRuntimeContextLocale(runtimeContext);
    if (resumeData) {
      const derived = await deriveIntent({
        mastra,
        runtimeContext,
        question: "Do you want to continue?",
        userMessage: resumeData.userMessage,
        schema: z.object({
          intent: z.union([
            z
              .literal("cancel")
              .describe(
                "If the user wants to cancel the flow. Eg. `cancel`, `stop`, `stopp`, and variations of these, also in different languages."
              ),
            z
              .literal("continue")
              .describe(
                "If the user wants to continue. Eg. `continue`, `go on`, `yes`, `ok`, `sounds good`, `let's proceed`, `all good`, `To the payment details` and variations of these, also in different languages."
              ),
          ]),
          confidence: z.number(),
        }),
      });

      if (derived?.intent === "cancel") {
        return await suspend({
          reason: "abort",
          dataCollection: inputData.dataCollection,
          messages: [
            {
              type: "static" as const,
              content: getWorkflowMessage(locale, "sales", "step_cancel"),
            },
          ],
        });
      }

      return {
        ...inputData,
        completed: true,
      };
    }

    const message = getWorkflowMessage(locale, "sales", "step_5_4");
    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: message,
        },
      ],
    });
  },
});

export const reviewLegalWorkflow = createWorkflow({
  id: "05-review-legal-flow",
  description: "Review legal data",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [
    reviewDataStep,
    createPolicyDraftStep,
    downloadDocumentsStep,
    acceptDocumentsStep,
  ],
})
  .dountil(reviewDataStep, async ({ inputData }) => inputData.completed)
  .then(createPolicyDraftStep)
  .dountil(downloadDocumentsStep, async ({ inputData }) => inputData.completed)
  .dountil(acceptDocumentsStep, async ({ inputData }) => inputData.completed)
  .commit();
