import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const askClarificationTool = createTool({
  id: "ask-clarification",
  inputSchema: z.object({
    question: z.string().describe("Clarification question to ask the user"),
    field: z.string().describe("The data field that needs clarification"),
  }),
  outputSchema: z.object({
    clarificationRequested: z.boolean(),
    question: z.string(),
  }),
  description: "Ask for clarification about unclear or inconsistent data",
  async execute({ context }) {
    return {
      clarificationRequested: true,
      question: context.question,
    };
  },
});

export const flagInconsistencyTool = createTool({
  id: "flag-inconsistency",
  inputSchema: z.object({
    field: z.string().describe("The problematic data field"),
    issue: z.string().describe("Description of the inconsistency"),
    suggestedValue: z.string().optional().describe("Suggested correct value"),
  }),
  outputSchema: z.object({
    flagged: z.boolean(),
    field: z.string(),
    issue: z.string(),
    suggestedValue: z.string().optional(),
  }),
  description: "Flag inconsistent or invalid data",
  async execute({ context }) {
    return {
      flagged: true,
      field: context.field,
      issue: context.issue,
      suggestedValue: context.suggestedValue,
    };
  },
});
