import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  authenticationSchema,
  authenticationWorkflowSchema,
  mainInputSchema,
} from "@renisa-ai/config/schema";

import { fetchPolicy, fetchToken } from "../../requests";
import { getMainDataCollectionSteps } from "../utils/data-collection";

const collectionSteps = getMainDataCollectionSteps(
  "authentication",
  authenticationWorkflowSchema,
  [
    {
      id: "authentication-data-step",
      keys: ["dateOfBirth", "policyId", "firstName", "lastName"],
      messageKeys: ["step_data_1"],
    },
  ] as const
);

const authenticationDataStep = collectionSteps.get("authentication-data-step");

if (!authenticationDataStep) {
  throw new Error("Collection steps not found");
}

export const fetchTokenStep = createStep({
  id: "fetch-token-step",
  description: "Fetch, refresh or get the authentication token.",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema,
  async execute({
    workflowId,
    inputData,
    mastra,
    runCount,
    resumeData,
    runId,
    runtimeContext,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${fetchTokenStep.id}`, {
      workflowId,
      stepId: fetchTokenStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    const authentication = authenticationSchema.safeParse(
      runtimeContext.get("authentication")
    );
    const isExpired =
      authentication.data && authentication.data.expires_in < Date.now();
    if (!authentication.data || isExpired) {
      const newAuthentication = await fetchToken(logger);
      runtimeContext.set("authentication", newAuthentication);
    }
    return inputData;
  },
});

export const fetchPolicyStep = createStep({
  id: "fetch-policy-step",
  description: "Fetch the policy with all necessary data from the user.",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema,
  retries: 3,
  async execute({
    workflowId,
    inputData,
    mastra,
    runCount,
    resumeData,
    runId,
    runtimeContext,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${fetchPolicyStep.id}`, {
      workflowId,
      stepId: fetchPolicyStep.id,
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

    const policy = await fetchPolicy(policyId, accessToken, logger);
    if (policy === null) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    return {
      ...inputData,
      policy,
      completed: true,
    };
  },
});

export const validateAuthenticationStep = createStep({
  id: "validate-authentication-step",
  description: "Validate the policy data.",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema,
  async execute({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    resumeData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${validateAuthenticationStep.id}`, {
      workflowId,
      stepId: validateAuthenticationStep.id,
      runId,
      runCount,
      inputData,
      resumeData,
    });

    if (!inputData.policy) {
      throw new Error("Policy not found");
    }
    if (
      inputData.policy.customer.firstName !==
      inputData.dataCollection?.firstName
    ) {
      throw new Error("First name does not match");
    }
    if (
      inputData.policy.customer.lastName !== inputData.dataCollection?.lastName
    ) {
      throw new Error("Last name does not match");
    }
    if (
      inputData.policy.customer.values.dateOfBirth !==
      inputData.dataCollection?.dateOfBirth
    ) {
      throw new Error("Date of birth does not match");
    }

    return {
      ...inputData,
      completed: true,
    };
  },
});

export const authenticationWorkflow = createWorkflow({
  id: "authentication-workflow",
  description: "Authentication workflow",
  inputSchema: mainInputSchema,
  outputSchema: authenticationWorkflowSchema,
  steps: [
    authenticationDataStep,
    fetchTokenStep,
    fetchPolicyStep,
    validateAuthenticationStep,
  ],
  retryConfig: {
    attempts: 3, // TODO: Actually fail the workflow, lock the user account and show a message to the user.
  },
})
  .dountil(authenticationDataStep, async ({ inputData }) => inputData.completed)
  .map(async ({ getStepResult }) => getStepResult(authenticationDataStep))
  .then(fetchTokenStep)
  .then(fetchPolicyStep)
  .then(validateAuthenticationStep)
  .commit();
