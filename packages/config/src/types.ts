import type { UIMessage as AiUIMessage, UIDataTypes } from "ai";
import type { Split } from "type-fest";
import type { Locale, Tools } from "./schema/types";

export type * from "./schema/types";

export type UIMessage = AiUIMessage<Metadata, UIDataTypes, Tools>;

export interface Metadata {
  instructions?: string;
}

export type SessionData = {
  version: number;
};

export type LegalPages = "imprint" | "privacy" | "terms";

export interface CoverageOption {
  id: string;
  name: string;
  amount: string;
  included: boolean;
  premium?: number;
}

export interface KnowledgeBaseEntry {
  id: string;
  content: string;
  document_type:
    | "product_terms"
    | "coverage_matrix"
    | "glossary"
    | "faq"
    | "pricing"
    | "purchase_flow";
  tariff?: "S" | "M" | "L";
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface QuoteResponse {
  price: number;
  paymentFrequency: "MONTHLY" | "YEARLY";
  package: "S" | "M" | "L";
  reference: string;
  coverage: {
    deckungssumme: string;
    keyLoss: boolean;
    forderungsausfall: boolean;
    rentalPropertyDamage: string;
  };
}

export interface QuoteSession {
  quote?: QuoteResponse;
  questionsAsked: string[];
  quotePresentedAt?: Date;
  userEngagement: "considering" | "questioning" | "accepted" | "abandoned";
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Types for LLM client abstraction
export type LLMProvider = "openai" | "anthropic" | "mistral";

export type LocaleCode = keyof {
  [key in Locale as Split<key, "-">[0]]: undefined;
};
