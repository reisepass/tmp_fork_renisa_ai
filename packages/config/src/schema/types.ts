import { z } from "zod";
import {
  coverageScopeEnum,
  dataCollectionSchema,
  paymentScheduleEnum,
  tarifEnum,
} from "./common";
import {
  llmRequestSchema,
  localeEnum,
  policyDraftResponse,
  quotationServiceResponse,
} from "./requests";
import { tools } from "./tools";
import { mainThreadMemorySchema } from "./working-memory";

export type DataCollection = z.infer<typeof dataCollectionSchema>;
export type Quote = z.infer<typeof quotationServiceResponse>;
export type PolicyDraft = z.infer<typeof policyDraftResponse>;
export type MainThreadMemory = z.infer<typeof mainThreadMemorySchema>;
export type CoverageScope = z.infer<typeof coverageScopeEnum>;
export type Tarif = z.infer<typeof tarifEnum>;
export type PaymentSchedule = z.infer<typeof paymentScheduleEnum>;

export type Tools = z.infer<typeof tools>;

export type LLMRequest = z.infer<typeof llmRequestSchema>;

export type Locale = z.infer<typeof localeEnum>;
