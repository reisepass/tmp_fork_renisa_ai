import { createWorkflow } from "@mastra/core/workflows";
import { salesWorkflowSchema } from "@renisa-ai/config/schema";

import { getMainDataCollectionSteps } from "../utils/data-collection";

const collectionSteps = getMainDataCollectionSteps("sales", salesWorkflowSchema, [
  {
    id: "full-name-step",
    keys: ["firstName", "lastName"],
    messageKeys: ["step_4_1"],
  },
  {
    id: "email-address-step",
    keys: ["email"],
    messageKeys: ["step_4_2"],
  },
  {
    id: "address-step",
    keys: ["street", "houseNumber", "zipCode", "city"],
    messageKeys: ["step_4_3"],
  },
] as const);

const fullNameStep = collectionSteps.get("full-name-step");
const emailAddressStep = collectionSteps.get("email-address-step");
const addressStep = collectionSteps.get("address-step");

if (!fullNameStep || !emailAddressStep || !addressStep) {
  throw new Error("Collection steps not found");
}

export const personalDataWorkflow = createWorkflow({
  id: "04-personal-data-flow",
  description: "Personal data flow",
  inputSchema: salesWorkflowSchema,
  outputSchema: salesWorkflowSchema,
  steps: [fullNameStep, emailAddressStep, addressStep],
})
  .dountil(fullNameStep, async ({ inputData }) => inputData.completed)
  .dountil(emailAddressStep, async ({ inputData }) => inputData.completed)
  .dountil(addressStep, async ({ inputData }) => inputData.completed)
  .commit();
