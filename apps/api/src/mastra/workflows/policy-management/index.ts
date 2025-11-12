import { createWorkflow } from "@mastra/core/workflows";
import { commonSuspendSchema, mainInputSchema } from "@renisa-ai/config/schema";

import { authenticationWorkflow } from "../authentication";

import { displayPolicyDataStep } from "./shared";

export const policyManagementWorkflow = createWorkflow({
  id: "policy-management-workflow",
  description: "Policy management workflow",
  inputSchema: mainInputSchema,
  outputSchema: commonSuspendSchema,
  steps: [authenticationWorkflow, displayPolicyDataStep],
})
  .then(authenticationWorkflow)
  .then(displayPolicyDataStep)
  .commit();
