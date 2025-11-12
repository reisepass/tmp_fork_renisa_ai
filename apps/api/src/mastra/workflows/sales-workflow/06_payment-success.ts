import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  commonResumeSchema,
  commonSuspendSchema,
  salesWorkflowSchema,
} from "@renisa-ai/config/schema";
import { z } from "zod";

import { getWorkflowMessage } from "../../i18n";
import { payPolicy } from "../../requests";
import { getRuntimeContextLocale } from "../utils";
import { getMainDataCollectionSteps } from "../utils/data-collection";
import { deriveIntent } from "../utils/derive-intent";

const collectionSteps = getMainDataCollectionSteps(
  "sales",
  salesWorkflowSchema,
  [
    {
      id: "iban-step",
      keys: ["iban"],
      messageKeys: ["step_6_1"],
    },
  ] as const
);

const ibanStep = collectionSteps.get("iban-step");

if (!ibanStep) {
  throw new Error("Collection steps not found");
}

export const paymentConfirmationStep = createStep({
  id: "payment-confirmation-step",
  description: "Confirm the payment",
  inputSchema: salesWorkflowSchema,
  resumeSchema: commonResumeSchema,
  outputSchema: salesWorkflowSchema,
  suspendSchema: commonSuspendSchema,
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
    logger.info(`step: ${paymentConfirmationStep.id}`, {
      workflowId,
      stepId: paymentConfirmationStep.id,
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
                "If the user wants to continue. Eg. `continue`, `go on`, `yes`, `ok`, `sounds good`, `let's proceed`, `all good`, `Pay securely` and variations of these, also in different languages."
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

    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "static" as const,
          content: getWorkflowMessage(locale, "sales", "step_6_2"),
        },
      ],
    });
  },
});

export const payPolicyStep = createStep({
  id: "pay-policy-step",
  description: "Pay the policy",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  execute: async ({ inputData, mastra, runCount, workflowId, runId }) => {
    const logger = mastra.getLogger();
    logger.info(`step: ${payPolicyStep.id}`, {
      workflowId,
      stepId: payPolicyStep.id,
      runId,
      runCount,
      inputData,
    });
    if (!inputData.policyDraft) {
      throw new Error("Policy draft not found");
    }
    const paymentResult = await payPolicy(
      inputData.policyDraft.policyId,
      {
        payment: {
          ...inputData.policyDraft.draftInvoice,
          type: "oneTime",
          processingType: "sepa",
          firstName: inputData.dataCollection!.firstName!,
          lastName: inputData.dataCollection!.lastName!,
          iban: inputData.dataCollection!.iban!,
        },
        prettyId: inputData.policyDraft.prettyId,
        partnerId: "ab7853b0-fae2-4c31-a87d-9ea7d4379570",
        customer: {
          firstName: inputData.dataCollection!.firstName!,
          lastName: inputData.dataCollection!.lastName!,
          dob: inputData.dataCollection!.dateOfBirth!,
          email: inputData.dataCollection!.email!,
        },
      },
      logger
    );
    return {
      ...inputData,
      paymentResult,
    };
  },
});

export const paymentSuccessWorkflow = createWorkflow({
  id: "06-payment-success-flow",
  description: "Payment and success flow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [ibanStep, paymentConfirmationStep, payPolicyStep],
})
  .dountil(ibanStep, async ({ inputData }) => inputData.completed)
  .then(paymentConfirmationStep)
  .then(payPolicyStep)
  .commit();
