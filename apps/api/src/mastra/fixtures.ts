import { DataCollection, PolicyDraft, Quote } from "@renisa-ai/config/types";

export const dataCollectionFixture: DataCollection = {
  dateOfBirth: "1990-01-01",
  coverageScope: "single",
  hasInsurance: null,
  hasClaims: null,
  claimCount: null,
  firstName: "John",
  lastName: "Doe",
  city: "Berlin",
  street: "Main Street",
  houseNumber: "123",
  zipCode: "12345",
  email: "john.doe@example.com",
  iban: null,
  startDate: null,
  policyId: null,
  policyTerminationReason: null,
  policyTerminationDate: null,
};

export const quoteFixture: Quote = {
  success: true,
  message: "Quote created successfully",
  data: {
    gross: 4.4,
    premium: 3.7,
    taxes: 0.7,
    premiumExclDiscounts: 3.7,
    taxesExclDiscounts: 0.7,
    grossExclDiscounts: 4.4,
    addons: [],
    package: {
      name: "M",
      payments: [],
    },
    metadata: {
      baseRates: [
        {
          S: 3,
        },
        {
          M: 4.4,
        },
        {
          L: 5.3,
        },
      ],
    },
    quoteId: "MNCWNPXPNY7Y",
    requestData: {
      productName: "aldiHaftpflicht",
      values: {
        policyHolderPlz: "10625",
        policyHolderDateOfBirth: "1987-06-05",
        coverageScope: "single",
        paymentSchedule: "monthly",
      },
      package: "M",
      addons: [],
    },
  },
};

export const policyDraftFixture: PolicyDraft = {
  policyId: "55eb735a-4a62-4285-9228-7ee131491f90",
  prettyId: "Y26HTZ",
  requestData: {
    productName: "aldiHaftpflicht",
    customer: {},
    values: {},
    package: "M",
    addons: [],
    salesChannel: "api",
  },
  quote: {
    premium: 41.93,
    taxes: 7.97,
    gross: 49.9,
    premiumExclDiscounts: 41.93,
    taxesExclDiscounts: 7.97,
    grossExclDiscounts: 49.9,
    addons: [],
    package: {
      name: "M",
      payments: [],
    },
  },
  draftInvoice: {
    invoiceId: "in_1f90_62TEJz5qMxUDK",
    paymentOrderId: "ipo_xUDK_GoZi8iOKn4jf",
  },
};
