import { createStep, createWorkflow } from "@mastra/core/workflows";
import { config } from "@renisa-ai/config";
import {
  commonSuspendSchema,
  salesWorkflowSchema,
} from "@renisa-ai/config/schema";

import { getWorkflowMessage } from "../../i18n";
import { getRuntimeContextLocale } from "../utils";
import { getMainDataCollectionSteps } from "../utils/data-collection";

const collectionSteps = getMainDataCollectionSteps(
  "sales",
  salesWorkflowSchema,
  [
    {
      id: "current-insurance-step",
      keys: ["hasInsurance"],
      messageKeys: ["step_3_1"],
    },
    {
      id: "claims-history-step",
      keys: ["hasClaims"],
      messageKeys: ["step_3_2"],
    },
    {
      id: "claims-count-step",
      keys: ["claimCount"],
      messageKeys: ["step_3_3"],
    },
  ] as const
);

const claimsCountStep = collectionSteps.get("claims-count-step");
const claimsHistoryStep = collectionSteps.get("claims-history-step");
const currentInsuranceStep = collectionSteps.get("current-insurance-step");

if (!claimsCountStep || !claimsHistoryStep || !currentInsuranceStep) {
  throw new Error("Collection steps not found");
}

const checkClaimCountStep = createStep({
  id: "rejected-step",
  description: "Rejected step",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  suspendSchema: commonSuspendSchema,
  async execute({
    mastra,
    inputData,
    workflowId,
    runCount,
    runId,
    runtimeContext,
    suspend,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${checkClaimCountStep.id}`, {
      workflowId,
      stepId: checkClaimCountStep.id,
      runId,
      runCount,
      inputData,
    });

    if (
      inputData.dataCollection?.claimCount &&
      inputData.dataCollection?.claimCount > config.validations.maxClaimCount
    ) {
      const locale = getRuntimeContextLocale(runtimeContext);
      return await suspend({
        reason: "abort",
        dataCollection: inputData.dataCollection,
        messages: [
          {
            type: "static" as const,
            content: getWorkflowMessage(locale, "sales", "step_rejected"),
          },
        ],
      });
    }
    return inputData;
  },
});

const claimCountWorkflow = createWorkflow({
  id: "claim-count-workflow",
  description: "Claim count workflow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [claimsCountStep, checkClaimCountStep],
})
  .dountil(claimsCountStep, async ({ inputData }) => inputData.completed)
  .then(checkClaimCountStep)
  .commit();

const claimsHistoryWorkflow = createWorkflow({
  id: "claims-history-workflow",
  description: "Claims history workflow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [claimsHistoryStep, claimCountWorkflow],
})
  .dountil(claimsHistoryStep, async ({ inputData }) => inputData.completed)
  .branch([
    [
      async ({ inputData }) => !!inputData.dataCollection?.hasClaims,
      claimCountWorkflow,
    ],
  ])
  .map(async ({ getStepResult }) => {
    return (
      getStepResult(claimCountWorkflow) || getStepResult(claimsHistoryStep)
    );
  })
  .commit();

export const underwritingWorkflow = createWorkflow({
  id: "03-underwriting-flow",
  description: "Underwriting flow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [currentInsuranceStep, claimsHistoryWorkflow],
})
  .dountil(currentInsuranceStep, async ({ inputData }) => inputData.completed)
  .branch([
    [
      async ({ inputData }) => !!inputData.dataCollection?.hasInsurance,
      claimsHistoryWorkflow,
    ],
  ])
  .map(async ({ getStepResult }) => {
    return (
      getStepResult(claimsHistoryWorkflow) ||
      getStepResult(currentInsuranceStep)
    );
  })
  .commit();
