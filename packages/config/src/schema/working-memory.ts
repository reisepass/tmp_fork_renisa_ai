import { z } from "zod";
import { dataCollectionSchema } from "./common";
import { tokenResponse } from "./requests";

const stepIds = z.array(z.string().or(z.array(z.string())));

export const workflowIdsEnum = z.enum([
  "sales-workflow",
  "policy-management-workflow",
  "policy-management-inquiry-workflow",
  "policy-management-terminate-workflow",
]);

export const activeWorkflowSchema = z
  .object({
    id: workflowIdsEnum,
    runId: z.string().describe("The id of the workflow run currently running"),
    currentStepId: stepIds.describe("The id of the current step"),
  })
  .describe("The active workflow.");

export const authenticationSchema = tokenResponse
  .nullable()
  .describe("The authentication token for the user.");

export const mainThreadMemorySchema = z.object({
  workingMemory: z.string().describe("The stringified working memory object."),
  activeWorkflow: activeWorkflowSchema.nullable(),
  authentication: authenticationSchema,
  dataCollection: dataCollectionSchema.nullable(),
});
