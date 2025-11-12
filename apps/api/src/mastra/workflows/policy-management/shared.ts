import { createStep } from "@mastra/core/workflows";
import {
  authenticationWorkflowSchema,
  commonSuspendSchema,
} from "@renisa-ai/config/schema";

import { getWorkflowMessage } from "../../i18n";
import { getRuntimeContextLocale } from "../utils";

export const displayPolicyDataStep = createStep({
  id: "display-policy-data-step",
  description: "Display the policy data",
  inputSchema: authenticationWorkflowSchema,
  outputSchema: authenticationWorkflowSchema,
  suspendSchema: commonSuspendSchema,
  async execute({
    inputData,
    mastra,
    runCount,
    workflowId,
    runId,
    suspend,
    runtimeContext,
    resumeData,
  }) {
    const logger = mastra.getLogger();
    logger.info(`step: ${displayPolicyDataStep.id}`, {
      workflowId,
      stepId: displayPolicyDataStep.id,
      runId,
      runCount,
      inputData,
    });

    if (resumeData) {
      return inputData;
    }

    const { policy } = inputData;
    if (!policy) {
      throw new Error("Policy not found");
    }

    const locale = getRuntimeContextLocale(runtimeContext);
    let message = getWorkflowMessage(
      locale,
      "policyManagement",
      "step_policy_data_1"
    );

    const policyObject = policy.objects[0];

    // Replace placeholders in the message
    message = message
      .replace("{{policyId}}", policy.prettyId)
      .replace("{{firstName}}", policy.customer.firstName)
      .replace("{{lastName}}", policy.customer.lastName)
      .replace(
        "{{dateOfBirth}}",
        new Date(policy.customer.values.dateOfBirth).toLocaleDateString(
          locale,
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )
      )
      .replace("{{email}}", policy.customer.email)
      .replace(
        "{{address}}",
        `${policy.customer.values.addressStreet} ${policy.customer.values.addressHouseNumber}${policy.customer.values.addressCo ? `, ${policy.customer.values.addressCo}` : ""}, ${policy.customer.values.addressPlz} ${policy.customer.values.addressCity}`
      )
      .replace(
        "{{coverageType}}",
        (policyObject.values.coverageScope as string) || "N/A"
      )
      .replace("{{tariff}}", policy.package.name)
      .replace(
        "{{startDate}}",
        new Date(policy.startsAt).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
      .replace(
        "{{paymentFrequency}}",
        (policy.values.paymentSchedule as string) || "N/A"
      )
      .replace(
        "{{iban}}",
        policy.values.iban
          ? `****${(policy.values.iban as string).slice(-4)}`
          : "****"
      )
      .replace(
        "{{scheduledUpdates}}",
        policy.effectiveAt
          ? `Effective ${new Date(policy.effectiveAt).toLocaleDateString(
              locale,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}`
          : policy.effectiveRequestedAt
            ? `Requested ${new Date(
                policy.effectiveRequestedAt
              ).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`
            : "None"
      )
      .replace(
        "{{cancellations}}",
        policy.cancelledAt
          ? `Cancelled ${new Date(policy.cancelledAt).toLocaleDateString(
              locale,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}`
          : policy.cancellationRequestedAt
            ? `Requested ${new Date(
                policy.cancellationRequestedAt
              ).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`
            : "None"
      )
      .replace(
        "{{withdrawals}}",
        policy.withdrawnAt
          ? `Withdrawn ${new Date(policy.withdrawnAt).toLocaleDateString(
              locale,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}`
          : policy.withdrawalRequestedAt
            ? `Requested ${new Date(
                policy.withdrawalRequestedAt
              ).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`
            : "None"
      );

    return await suspend({
      reason: "user_input",
      dataCollection: inputData.dataCollection,
      messages: [
        {
          type: "data" as const,
          content: {
            prompt:
              "Display the policy data. MANDATORY: Ask continuation question.",
            policyData: message,
          },
        },
      ],
    });
  },
});
