import { z } from "zod";
import {
  coverageScopeEnum,
  paymentScheduleEnum,
  tarifEnum,
  terminationReasonEnum,
} from "./common";

export const localeEnum = z
  .enum(["de-DE", "en-GB"])
  .describe("The locale of the user");

export const defaultLocale = z.literal(localeEnum.enum["de-DE"]);

export const llmRequestSchema = z.object({
  message: z.string().describe("The message to send to the LLM"),
  memory: z.object({
    thread: z.string().describe("The thread id"),
    resource: z.string().describe("The resource id"),
  }),
  locale: localeEnum,
});

const productNameLiteral = z.literal("aldiHaftpflicht");

const productNameUnion = z
  .union([productNameLiteral])
  .describe(
    "The product to get a quote for, currently only aldiHaftpflicht is supported"
  );

const partnerIdLiteral = z.literal("ab7853b0-fae2-4c31-a87d-9ea7d4379570");

const partnerIdUnion = z
  .union([partnerIdLiteral])
  .describe("The partner id, currently hardcoded");

const payloadBase = z.object({
  productName: productNameUnion,
  package: tarifEnum,
  addons: z.array(z.string()).describe("The addons"),
  partnerId: partnerIdUnion,
});

export const quotationServicePayload = payloadBase.extend({
  values: z.object({
    policyHolderPlz: z.string().describe("The policy holder's zip code"),
    policyHolderDateOfBirth: z
      .string()
      .describe("The policy holder's date of birth"),
    coverageScope: coverageScopeEnum,
    paymentSchedule: paymentScheduleEnum,
  }),
});

const baseQuotationData = z.object({
  gross: z.number().describe("The gross amount"),
  premium: z.number().describe("The premium amount"),
  taxes: z.number().describe("The taxes amount"),
  premiumExclDiscounts: z
    .number()
    .describe("The premium amount excl. discounts"),
  taxesExclDiscounts: z.number().describe("The taxes amount excl. discounts"),
  grossExclDiscounts: z.number().describe("The gross amount excl. discounts"),
  addons: z.array(z.string()).describe("The addons"),
  package: z.object({
    name: tarifEnum.describe("The package"),
    payments: z
      .array(
        z.object({
          amount: z.number().describe("The amount"),
          date: z.string().describe("The date"),
        })
      )
      .describe("The payments"),
  }),
});

export const errorResponse = z.object({
  message: z.string().describe("The error message"),
  errorCode: z.string().describe("The error code"),
});

export const quotationServiceResponse = z.object({
  success: z.boolean().describe("Whether the quote was created successfully"),
  message: z.string().describe("The message from the API"),
  data: baseQuotationData
    .extend({
      metadata: z.object({
        baseRates: z
          .array(
            z.union(
              Object.values(tarifEnum.enum).map((tarif) =>
                z.object({
                  [tarif]: z
                    .number()
                    .describe(`The amount for the ${tarif} package`)
                    .nullable(),
                })
              )
            )
          )
          .describe("The base rates"),
      }),
      quoteId: z.string().describe("The quote id"),
      requestData: quotationServicePayload.omit({ partnerId: true }),
    })
    .optional(),
});

const policyCustomer = z.object({
  email: z.string().describe("The customer's email"),
  firstName: z.string().describe("The customer's first name"),
  lastName: z.string().describe("The customer's last name"),
  phone: z.string().describe("The customer's phone"),
  values: z.object({
    addressCo: z.string().describe("The customer's address company").optional(),
    dateOfBirth: z.string().describe("The customer's date of birth"),
    addressStreet: z.string().describe("The customer's address street"),
    addressHouseNumber: z
      .string()
      .describe("The customer's address house number"),
    addressPlz: z.string().describe("The customer's address zip code"),
    addressCity: z.string().describe("The customer's address city"),
  }),
});

export const policyDraftPayload = payloadBase.extend({
  customer: policyCustomer,
  values: z.object({
    policyStartDate: z.string().describe("The policy start date"),
    previousInsurer: z.string().describe("The previous insurer"),
    policyHolderDateOfBirth: z
      .string()
      .describe("The policy holder's date of birth"),
    previousInsuranceNumber: z
      .string()
      .describe("The previous insurance number"),
    previousClaims: z
      .boolean()
      .describe("Whether the policy holder has previous claims"),
    previousClaimsQuantity: z.number().describe("The previous claims quantity"),
    paymentSchedule: paymentScheduleEnum,
    switchService: z.enum(["full", "partial"]).describe("The switch service"),
    policyHolderPlz: z.string().describe("The policy holder's zip code"),
    coverageScope: coverageScopeEnum,
  }),
});

export const policyDraftResponse = z.object({
  policyId: z.string().describe("The policy id"),
  prettyId: z.string().describe("The pretty id"),
  requestData: payloadBase.omit({ partnerId: true }).extend({
    customer: z.object({}),
    values: z.object({}),
    salesChannel: z.enum(["api"]).describe("The sales channel"),
  }),
  quote: baseQuotationData,
  draftInvoice: z.object({
    invoiceId: z.string().describe("The invoice id"),
    paymentOrderId: z.string().describe("The payment order id"),
  }),
});

export const payPolicyPayload = z.object({
  prettyId: z.string().describe("The pretty id"),
  partnerId: partnerIdUnion,
  payment: z.object({
    invoiceId: z.string().describe("The invoice id"),
    paymentOrderId: z.string().describe("The payment order id"),
    type: z.enum(["oneTime"]).describe("The type of payment"),
    processingType: z.enum(["sepa"]).describe("The processing type"),
    firstName: z.string().describe("The first name"),
    lastName: z.string().describe("The last name"),
    iban: z.string().describe("The IBAN"),
  }),
  customer: z.object({
    firstName: z.string().describe("The first name"),
    lastName: z.string().describe("The last name"),
    dob: z.string().describe("The date of birth"),
    email: z.string().describe("The email"),
  }),
});

export const payPolicyResponse = z.object({
  success: z.boolean().describe("Whether the payment was successful"),
  message: z.string().describe("The message from the API"),
  data: z.object({
    policyId: z.string().describe("The policy id"),
  }),
});

export const dynamicDocumentPayload = z.object({
  partnerId: partnerIdUnion,
  documentType: z.enum(["Beratungsprotokoll"]),
});

export const dynamicDocumentResponse = z.object({
  success: z
    .boolean()
    .describe("Whether the dynamic document was generated successfully"),
  message: z.string().describe("The message from the API"),
  data: z
    .object({
      data: z.string().describe("The document as a base64 string"),
    })
    .optional(),
});

export const partnerPayload = z.object({
  zipCode: z.string().describe("The zip code"),
});

export const partnerResponse = z.object({
  success: z.boolean().describe("Whether the partner was found successfully"),
  message: z.string().describe("The message from the API"),
  data: z
    .object({
      partner: z.string(),
      zipCode: z.string(),
      municipality: z.string(),
      regionalCompanyCode: z.string(),
      appKey: z.string(),
      partnerId: z.string(),
    })
    .optional(),
});

export const tokenResponse = z.object({
  access_token: z.string().describe("The access token"),
  refresh_token: z.string().describe("The refresh token"),
  token_type: z.string().describe("The token type"),
  expires_in: z.number().describe("The expires in"),
});

export const policyResponse = z.object({
  id: z.string(),
  prettyId: z.string(),
  productId: z.string(),
  productVersion: z.string(),
  partnerId: z.string(),
  referralPartnerId: z.string().nullable(),
  customerId: z.string(),
  status: z.string(),
  cancellationReason: z.string().nullable(),
  withdrawalReason: z.string().nullable(),

  paymentData: z.object({
    calculationType: z.string(),
    premium: z.number(),
    taxes: z.number(),
    gross: z.number(),
    taxRate: z.number(),
    premiumExclDiscounts: z.number(),
    taxesExclDiscounts: z.number(),
    grossExclDiscounts: z.number(),
    contractValue: z.object({
      gross: z.number(),
      taxes: z.number(),
      premium: z.number(),
    }),
  }),

  accountingData: z.object({
    premium: z.number(),
    taxes: z.number(),
    gross: z.number(),
  }),

  obligationData: z.object({
    type: z.string(),
    stages: z.array(
      z.object({
        index: z.number(),
        endsAt: z.string(),
        periods: z.array(z.any()),
        duration: z.string(),
        startsAt: z.string(),
      })
    ),
  }),

  collectionData: z.object({
    type: z.string(),
    stages: z.array(
      z.object({
        index: z.number(),
        endsAt: z.string(),
        periods: z.array(z.any()),
        duration: z.string(),
        startsAt: z.string(),
      })
    ),
  }),

  invoicingData: z.object({
    type: z.string(),
    sendToAccountingSoftware: z.string(),
    stages: z.array(
      z.object({
        index: z.number(),
        endsAt: z.string(),
        periods: z.array(
          z.object({
            gross: z.number(),
            index: z.number(),
            taxes: z.number(),
            dateAt: z.string(),
            premium: z.number(),
          })
        ),
        duration: z.string(),
        startsAt: z.string(),
      })
    ),
  }),

  cancellationData: z.object({
    type: z.string(),
    stages: z.array(z.any()),
  }),

  taxes: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    })
  ),

  values: z.record(z.string(), z.unknown()),

  objects: z.array(
    z.object({
      name: z.string(),
      risks: z.array(
        z.object({
          name: z.string(),
          values: z.record(z.string(), z.unknown()),
        })
      ),
      values: z.record(z.string(), z.unknown()),
      coverageEndsAt: z.string(),
      coverageStartsAt: z.string(),
    })
  ),

  customer: policyCustomer,

  metadata: z.record(z.string(), z.unknown()),

  createdAt: z.string(),
  createdBy: z.string().nullable(),
  updatedAt: z.string(),

  issuedAt: z.string().nullable(),
  boundAt: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  cancelledAt: z.string().nullable(),
  expiredAt: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  effectiveAt: z.string().nullable(),
  effectiveRequestedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  withdrawalRequestedAt: z.string().nullable(),

  testingFlags: z.array(z.any()),
  addons: z.array(z.any()),

  package: z.object({
    name: z.string(),
    payments: z.array(z.any()),
  }),

  durationConfiguration: z.object({
    invoicingPeriodicStages: z.array(z.string()),
    obligationPeriodicStages: z.array(z.string()),
  }),

  periodAmounts: z.array(
    z.object({
      tax: z.number(),
      premium: z.number(),
    })
  ),

  country: z.string(),

  commissions: z.array(
    z.object({
      name: z.string(),
      rate: z.number(),
      amount: z.number(),
      source: z.string(),
    })
  ),
});

const baseTerminationPayload = z.object({
  reason: terminationReasonEnum,
});

export const cancelPolicyPayload = baseTerminationPayload.extend({
  cancellationRequestedAt: z.string(),
  cancelAt: z.string(),
  refund: z.object({ type: z.literal("full") }),
});

export const withdrawPolicyPayload = baseTerminationPayload.extend({
  withdrawalRequestedAt: z.string(),
  withdrawAt: z.string(),
});
