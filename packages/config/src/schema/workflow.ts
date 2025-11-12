import { z } from "zod";
import { dataCollectionSchema } from "./common";
import {
  payPolicyResponse,
  policyDraftResponse,
  policyResponse,
  quotationServiceResponse,
} from "./requests";
import { activeWorkflowSchema } from "./working-memory";

// Message type definitions
export const messageTypeSchema = z.enum(["static", "error", "data"]);

const staticMessageSchema = z.object({
  type: z.literal("static"),
  content: z.string(),
});

const errorMessageSchema = z.object({
  type: z.literal("error"),
  content: z.string(),
  context: z.record(z.string(), z.any()).optional(),
});

const dataMessageSchema = z.object({
  type: z.literal("data"),
  content: z.record(z.string(), z.any()),
  action: z.string().optional(),
});

export const messageSchema = z.union([
  staticMessageSchema,
  errorMessageSchema,
  dataMessageSchema,
]);

// Helper type for TypeScript inference
export type Message = z.infer<typeof messageSchema>;

const messageAndUiElementsSchema = z.object({
  messages: z.array(messageSchema),
});

export const commonSuspendSchema = messageAndUiElementsSchema.extend({
  reason: z.enum(["user_input", "abort"]),
  dataCollection: dataCollectionSchema.nullable(),
});

const userMessageSchema = z.string().describe("The user message");

export const baseWorkflowInputSchema = z.object({
  userMessage: userMessageSchema,
});

export const mainInputSchema = baseWorkflowInputSchema.extend({
  dataCollection: dataCollectionSchema.nullable(),
});

export const commonResumeSchema = mainInputSchema.clone();

export const baseWorkflowOutputSchema = messageAndUiElementsSchema.clone();

export const mainOutputSchema = baseWorkflowOutputSchema.extend({
  dataCollection: dataCollectionSchema.nullable(),
  activeWorkflow: z.string().nullable(),
});

export const baseWorkflowSchema = z.object({
  ...mainInputSchema.shape,
  completed: z.boolean(),
});

export const authenticationWorkflowSchema = baseWorkflowSchema.extend({
  policy: policyResponse.nullable(),
});

export const salesWorkflowSchema = baseWorkflowSchema.extend({
  dataCollection: dataCollectionSchema.nullable(),
  quote: quotationServiceResponse.nullable(),
  policyDraft: policyDraftResponse.nullable(),
  paymentResult: payPolicyResponse.nullable(),
  completed: z.boolean(),
});
