import { createStep, createWorkflow } from "@mastra/core/workflows";
import { mainInputSchema, salesWorkflowSchema } from "@renisa-ai/config/schema";

import { fetchQuote } from "../../requests";
import { getMainDataCollectionSteps } from "../utils/data-collection";

const collectionSteps = getMainDataCollectionSteps("sales", salesWorkflowSchema, [
  {
    id: "date-of-birth-step",
    keys: ["dateOfBirth"],
    messageKeys: ["step_1_1"],
  },
  {
    id: "coverage-scope-step",
    keys: ["coverageScope"],
    messageKeys: ["step_1_2"],
  },
] as const);

const dateOfBirthStep = collectionSteps.get("date-of-birth-step");
const coverageScopeStep = collectionSteps.get("coverage-scope-step");

if (!dateOfBirthStep || !coverageScopeStep) {
  throw new Error("Collection steps not found");
}

export const fetchQuoteStep = createStep({
  id: "fetch-quote-step",
  description: "Calculate the quote with all necessary data from the user.",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  retries: 3,
  async execute({ workflowId, inputData, mastra, runCount }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${fetchQuoteStep.id}`, {
      workflowId,
      stepId: fetchQuoteStep.id,
      runCount,
      inputData,
    });

    const quote = await fetchQuote(
      {
        productName: "aldiHaftpflicht",
        values: {
          policyHolderPlz: "12345",
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          policyHolderDateOfBirth: inputData.dataCollection!.dateOfBirth!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          coverageScope: inputData.dataCollection!.coverageScope!,
          paymentSchedule: "monthly",
        },
        package: "M",
        addons: [],
        partnerId: "ab7853b0-fae2-4c31-a87d-9ea7d4379570",
      },
      logger
    );

    return {
      ...inputData,
      quote,
      completed: true,
    };
  },
});

export const dataCollectionWorkflow = createWorkflow({
  id: "01-data-collection-flow",
  description: "Data collection flow",
  inputSchema: mainInputSchema,
  outputSchema: salesWorkflowSchema,
  steps: [dateOfBirthStep, coverageScopeStep, fetchQuoteStep],
})
  .map(async ({ inputData }) => {
    return {
      paymentResult: null,
      policyDraft: null,
      quote: null,
      completed: null,
      ...inputData,
    };
  })
  .dountil(dateOfBirthStep, async ({ inputData }) => inputData.completed)
  .dountil(coverageScopeStep, async ({ inputData }) => inputData.completed)
  .then(fetchQuoteStep)
  .commit();
