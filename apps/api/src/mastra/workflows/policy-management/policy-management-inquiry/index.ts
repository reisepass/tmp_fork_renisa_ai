import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  authenticationWorkflowSchema,
  commonSuspendSchema,
  mainInputSchema,
} from "@renisa-ai/config/schema";

import { authenticationWorkflow } from "../../authentication";

export const answerQuestionStep = createStep({
  id: "answer-question-step",
  description: "Answer the question",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: commonSuspendSchema,
  async execute({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    getInitData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${answerQuestionStep.id}`, {
      workflowId,
      stepId: answerQuestionStep.id,
      runId,
      runCount,
      inputData,
    });

    return {
      messages: [
        {
          type: "data" as const,
          content: {
            prompt: "Answer the question, based on the policy data.",
            question: getInitData()?.userMessage,
            policy: inputData.policy,
          },
          action: "answer_policy_question",
        },
      ],
      dataCollection: inputData.dataCollection,
      reason: "user_input" as const,
    };
  },
});

export const policyManagementInquiryWorkflow = createWorkflow({
  id: "policy-management-inquiry-workflow",
  description: "Policy management inquiry workflow",
  inputSchema: mainInputSchema,
  outputSchema: commonSuspendSchema,
  steps: [authenticationWorkflow, answerQuestionStep],
})
  .then(authenticationWorkflow)
  .then(answerQuestionStep)
  .commit();
