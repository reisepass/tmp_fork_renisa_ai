import { createWorkflowTool } from "./utils";

export const policyManagementWorkflowTool = createWorkflowTool({
  id: "policy-management-workflow",
  description:
    "Policy management workflow tool. Use this tool to manage the policy.",
});

export const policyManagementInquiryTool = createWorkflowTool({
  id: "policy-management-inquiry-workflow",
  description:
    "Policy management inquiry tool. Use this tool to answer questions about the policy.",
});

export const policyManagementTerminateTool = createWorkflowTool({
  id: "policy-management-terminate-workflow",
  description:
    "Policy termination tool. Use this to cancel or withdraw a policy based on age.",
});
