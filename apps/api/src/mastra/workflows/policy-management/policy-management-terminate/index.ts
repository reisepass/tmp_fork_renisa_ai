import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  authenticationSchema,
  authenticationWorkflowSchema,
  commonSuspendSchema,
  mainInputSchema,
} from "@renisa-ai/config/schema";
import { z } from "zod";

import { getWorkflowMessage } from "../../../i18n";
import { cancelPolicy, withdrawPolicy } from "../../../requests";
import { authenticationWorkflow } from "../../authentication";
import { getRuntimeContextLocale } from "../../utils";
import { getMainDataCollectionSteps } from "../../utils/data-collection";
import { deriveIntent } from "../../utils/derive-intent";
import { displayPolicyDataStep } from "../shared";

const terminationPathEnum = z.enum([
  "cancellation",
  "withdrawal",
  "not_needed",
]);

export const determinePath = createStep({
  id: "determine-path-step",
  description: "Determine path to terminate the policy",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema.extend({
    terminationPath: terminationPathEnum.nullable(),
  }),
  async execute({ inputData }) {
    if (!inputData.policy) throw new Error("Policy not found");
    if (inputData.policy.cancelledAt || inputData.policy.withdrawnAt) {
      return {
        ...inputData,
        terminationPath: "not_needed" as const,
      };
    }
    const startsAt = new Date(inputData.policy.startsAt);
    const now = new Date();
    const ageDays = Math.floor(
      (now.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const terminationPath: z.infer<typeof terminationPathEnum> =
      ageDays >= 14 ? "cancellation" : "withdrawal";
    return {
      ...inputData,
      terminationPath,
    };
  },
});

const collectionSteps = getMainDataCollectionSteps(
  "policyManagementTerminate",
  determinePath.outputSchema,
  [
    {
      id: "collect-cancellation-data-step",
      keys: ["policyTerminationReason", "policyTerminationDate"],
      messageKeys: ["step_collect_cancellation"],
    },
    {
      id: "collect-withdrawal-data-step",
      keys: ["policyTerminationReason"],
      messageKeys: ["step_collect_withdrawal"],
    },
  ] as const
);

const collectCancellationDataStep = collectionSteps.get(
  "collect-cancellation-data-step"
);
const collectWithdrawalDataStep = collectionSteps.get(
  "collect-withdrawal-data-step"
);

if (!collectCancellationDataStep || !collectWithdrawalDataStep) {
  throw new Error("Collection steps not found");
}

export const confirmTerminationStep = createStep({
  id: "confirm-termination-step",
  description: "Confirm termination",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema,
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
    getStepResult,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${confirmTerminationStep.id}`, {
      workflowId,
      stepId: confirmTerminationStep.id,
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
              content: getWorkflowMessage(
                locale,
                "policyManagementTerminate",
                "step_cancel"
              ),
            },
          ],
        });
      }

      return {
        ...inputData,
        completed: true,
      };
    }
    const terminationPath = getStepResult(determinePath)?.terminationPath;

    const message = getWorkflowMessage(
      locale,
      "policyManagementTerminate",
      terminationPath === "cancellation"
        ? "step_confirm_cancellation"
        : "step_confirm_withdrawal"
    );

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

export const terminatePolicyStep = createStep({
  id: "terminate-policy-step",
  description: "Terminate the policy.",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: commonSuspendSchema,
  async execute({
    workflowId,
    inputData,
    mastra,
    runCount,
    resumeData,
    runId,
    runtimeContext,
    getStepResult,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${terminatePolicyStep.id}`, {
      workflowId,
      stepId: terminatePolicyStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    const policyId = inputData.dataCollection?.policyId;
    if (!policyId) {
      throw new Error("Policy ID not found");
    }

    const accessToken = authenticationSchema.safeParse(
      runtimeContext.get("authentication")
    )?.data?.access_token;
    if (!accessToken) {
      throw new Error("Access token not found");
    }

    const terminationPath = getStepResult(determinePath)?.terminationPath;

    if (terminationPath === "cancellation") {
      if (!inputData.dataCollection?.policyTerminationDate) {
        throw new Error("Cancellation date not found");
      }
      if (!inputData.dataCollection?.policyTerminationReason) {
        throw new Error("Cancellation reason not found");
      }
      await cancelPolicy(
        policyId,
        accessToken,
        {
          cancelAt: inputData.dataCollection.policyTerminationDate,
          reason: inputData.dataCollection.policyTerminationReason,
        },
        logger
      );
    }
    if (terminationPath === "withdrawal") {
      if (!inputData.dataCollection?.policyTerminationReason) {
        throw new Error("Withdrawal reason not found");
      }
      await withdrawPolicy(
        policyId,
        accessToken,
        {
          withdrawAt:
            inputData.dataCollection.policyTerminationDate ||
            new Date().toISOString().split("T")[0],
          reason: inputData.dataCollection.policyTerminationReason,
        },
        logger
      );
    }

    const locale = getRuntimeContextLocale(runtimeContext);
    return {
      ...inputData,
      reason: "user_input" as const,
      messages: [
        {
          type: "static" as const,
          content: getWorkflowMessage(
            locale,
            "policyManagementTerminate",
            "step_applied"
          ),
        },
      ],
      completed: true,
    };
  },
});

export const abortStep = createStep({
  id: "abort-step",
  description: "Abort step",
  inputSchema: authenticationWorkflowSchema.extend({
    terminationPath: terminationPathEnum.nullable(),
  }),
  outputSchema: commonSuspendSchema,
  async execute({ inputData, runtimeContext }) {
    const locale = getRuntimeContextLocale(runtimeContext);
    return {
      reason: "abort" as const,
      messages: [
        {
          type: "static" as const,
          content: getWorkflowMessage(
            locale,
            "policyManagementTerminate",
            "step_not_needed"
          ),
        },
      ],
      dataCollection: inputData.dataCollection,
    };
  },
});

const cancellationWorkflow = createWorkflow({
  id: "cancellation-workflow",
  description: "Cancellation workflow",
  inputSchema: determinePath.outputSchema,
  outputSchema: commonSuspendSchema,
  steps: [collectCancellationDataStep],
})
  .dountil(
    collectCancellationDataStep,
    async ({ inputData }) => inputData.completed
  )
  .map(async ({ inputData: { terminationPath: _, ...inputData } }) => inputData)
  .dountil(confirmTerminationStep, async ({ inputData }) => inputData.completed)
  .then(terminatePolicyStep)
  .commit();

const withdrawalWorkflow = createWorkflow({
  id: "withdrawal-workflow",
  description: "Withdrawal workflow",
  inputSchema: determinePath.outputSchema,
  outputSchema: commonSuspendSchema,
  steps: [collectWithdrawalDataStep],
})
  .dountil(
    collectWithdrawalDataStep,
    async ({ inputData }) => inputData.completed
  )
  .map(async ({ inputData: { terminationPath: _, ...inputData } }) => inputData)
  .dountil(confirmTerminationStep, async ({ inputData }) => inputData.completed)
  .then(terminatePolicyStep)
  .commit();

export const policyManagementTerminateWorkflow = createWorkflow({
  id: "policy-management-terminate-workflow",
  description: "Policy termination (cancel/withdrawal) workflow",
  inputSchema: mainInputSchema,
  outputSchema: commonSuspendSchema,
  steps: [
    authenticationWorkflow,
    displayPolicyDataStep,
    determinePath,
    abortStep,
    cancellationWorkflow,
    withdrawalWorkflow,
  ],
})
  .then(authenticationWorkflow)
  .then(displayPolicyDataStep)
  .then(determinePath)
  .branch([
    [
      async ({ inputData }) => inputData.terminationPath === "not_needed",
      abortStep,
    ],
    [
      async ({ inputData }) => inputData.terminationPath === "cancellation",
      cancellationWorkflow,
    ],
    [
      async ({ inputData }) => inputData.terminationPath === "withdrawal",
      withdrawalWorkflow,
    ],
  ])
  .commit();
