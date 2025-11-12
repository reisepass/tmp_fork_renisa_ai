import { z } from "zod";
import {
  validateAddress,
  validateDateInFuture,
  validateDateOfBirth,
  validateEmail,
  validateIBAN,
  validateName,
  validateZipCode,
  ValidationHandler,
} from "../validations";

export const refinements = [
  ["dateOfBirth", validateDateOfBirth],
  ["policyTerminationDate", validateDateInFuture],
  ["firstName", validateName],
  ["lastName", validateName],
  ["email", validateEmail],
  ["street", validateAddress],
  ["houseNumber", validateAddress],
  ["zipCode", validateZipCode],
  ["city", validateAddress],
  ["iban", validateIBAN],
] as const satisfies [string, ValidationHandler][];

export const coverageScopeEnum = z
  .enum(["single", "withPartner", "withChildren", "withFamily"])
  .describe("The requested coverage scope for the new policy.");

export const terminationReasonEnum = z
  .enum([
    // "breachOfDutyOfDisclosureThroughSimpleNegligence",
    // "claim",
    // "claimByCustomer",
    // "claimByInsurer",
    // "claimByTotalLoss",
    // "contractImportError",
    // "cunningDeception",
    // "customerRequest",
    // "doubleInsurance",
    // "dunning",
    // "endorsement",
    "extraordinaryTerminationForAnImportantReason",
    "falseDeclarations",
    // "firstOrSinglePremiumNotPaid",
    // "followupPremiumNotPaid",
    // "goodwill",
    // "grosslyNegligentOrIntentionalBreachOfDutyOfDisclosure",
    // "grosslyNegligentOrIntentionalBreachOfObligations",
    // "grosslyNegligentOrIntentionalIncreaseOfRisk",
    // "guaranteeWarranty",
    // "increaseOfRiskThroughSimpleNegligence",
    // "initialDataDiscrepancy",
    // "lapseOfRiskOfCoveredObject",
    // "licensePlateDamaged",
    // "licensePlateTheft",
    // "multipleInsurance",
    // "naturalContractExpiration",
    // "objectOutOfService",
    // "objectPermanentlyOutOfService",
    // "objectTheft",
    // "objectTotalLoss",
    "ordinaryCancellation",
    // "premiumIncrease",
    // "relocateOfMainResidenceOutsideGermany",
    // "saleOfTheInsuredObject",
    // "serialNumberNotProvided",
    // "technicalTerminationNotPaid",
    // "totalLossAsAResultOfAnInsuredLoss",
    // "vinNotReported",
    // "vinNotUpdated",
    "withdrawal",
    // "withdrawalProvisionalOrClaimedCoverage",
  ])
  .describe("The reason for the termination");

export const cancellationSchema = z.object({
  cancelAt: z
    .string()
    .nullable()
    .describe(
      "The date of the cancellation, use ISO format when collecting. Find any date mentioned in the user's message and use it. Never make up a date. It has to specify day, month and year."
    ),
  reason: terminationReasonEnum
    .nullable()
    .describe("The reason for the cancellation"),
});

export const withdrawalSchema = z.object({
  withdrawAt: z
    .string()
    .nullable()
    .describe(
      "The date of the withdrawal, use ISO format when collecting. Find any date mentioned in the user's message and use it. Never make up a date. It has to specify day, month and year."
    ),
  reason: terminationReasonEnum
    .nullable()
    .describe("The reason for the withdrawal"),
});

export const dataCollectionSchema = z.object({
  dateOfBirth: z
    .string()
    .nullable()
    .describe(
      "Date of birth, use ISO format when collecting. Find any date mentioned in the user's message and use it. Never make up a date. It has to specify day, month and year."
    ),
  coverageScope: coverageScopeEnum.nullable(),
  hasInsurance: z
    .boolean()
    .nullable()
    .describe(
      "Whether the user has or had private liability insurance, or not"
    ),
  hasClaims: z
    .boolean()
    .nullable()
    .describe("Whether the user has or had claims, or not"),
  claimCount: z
    .number()
    .nullable()
    .describe("The number of claims in the last 5 years"),
  firstName: z.string().nullable().describe("User's first name"),
  lastName: z.string().nullable().describe("User's last name"),
  email: z.string().nullable().describe("User's email address"),
  street: z.string().nullable().describe("User's street"),
  houseNumber: z.string().nullable().describe("User's house number"),
  zipCode: z.string().nullable().describe("German postal code (5 digits)"),
  city: z.string().nullable().describe("User's city"),
  startDate: z.string().nullable().describe("The start date of the policy"),
  iban: z.string().nullable().describe("User's IBAN"),
  policyId: z.string().nullable().describe("The ID of the policy"),
  policyTerminationReason: terminationReasonEnum
    .nullable()
    .describe("The reason for the termination"),
  policyTerminationDate: z
    .string()
    .nullable()
    .describe(
      "The date of the termination, use ISO format when collecting. Find any date mentioned in the user's message and use it. Never make up a date. It has to specify day, month and year."
    ),
});

export const paymentScheduleEnum = z
  .enum(["monthly", "annual"])
  .describe("The payment schedule");

export const tarifEnum = z.enum(["S", "M", "L"]).describe("The package");
