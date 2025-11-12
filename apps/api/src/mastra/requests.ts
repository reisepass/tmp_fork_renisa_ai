import { getEnvConfig } from "@renisa-ai/config/env";
import {
  cancelPolicyPayload,
  dynamicDocumentPayload,
  dynamicDocumentResponse,
  payPolicyPayload,
  payPolicyResponse,
  policyDraftPayload,
  policyDraftResponse,
  policyResponse,
  quotationServicePayload,
  quotationServiceResponse,
  tokenResponse,
  withdrawPolicyPayload,
} from "@renisa-ai/config/schema";
import { Logger } from "@renisa-ai/config/types";
import { z } from "zod";

const BASE_URL_CUSTOMER = "https://api.customer.alpha-alteos.com";
const BASE_URL = "https://api.alpha-alteos.com";

export async function fetchQuote(
  payload: z.infer<typeof quotationServicePayload>,
  logger: Logger
): Promise<z.infer<typeof quotationServiceResponse>> {
  const response = await fetch(`${BASE_URL_CUSTOMER}/v1/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quotationServicePayload.parse(payload)),
  });
  if (!response.ok) {
    const message = `Failed to get quote: ${response.status} ${response.statusText}`;
    logger.error(message, { response: await response.text() });
    throw new Error(message);
  }
  const body = await response.json();
  const parsed = quotationServiceResponse.parse(body);
  if (!parsed.success) {
    throw new Error(parsed.message);
  }
  return parsed;
}

export async function createPolicyDraft(
  payload: z.infer<typeof policyDraftPayload>,
  logger: Logger
): Promise<z.infer<typeof policyDraftResponse>> {
  const response = await fetch(`${BASE_URL_CUSTOMER}/v1/policies/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(policyDraftPayload.parse(payload)),
  });
  if (!response.ok) {
    const message = `Failed to create policy draft: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  const body = await response.json();
  return policyDraftResponse.parse(body);
}

export async function payPolicy(
  policyId: string,
  payload: z.infer<typeof payPolicyPayload>,
  logger: Logger
): Promise<z.infer<typeof payPolicyResponse>> {
  const response = await fetch(
    `${BASE_URL_CUSTOMER}/v1/policies/${policyId}/pay`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payPolicyPayload.parse(payload)),
    }
  );
  if (!response.ok) {
    const message = `Failed to pay policy: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  const parsed = payPolicyResponse.parse(await response.json());
  if (!parsed.success) {
    throw new Error(parsed.message);
  }
  return parsed;
}

export async function fetchDynamicDocument(
  policyId: string,
  payload: z.infer<typeof dynamicDocumentPayload>,
  logger: Logger
): Promise<z.infer<typeof dynamicDocumentResponse>> {
  const response = await fetch(
    `${BASE_URL_CUSTOMER}/v1/documents/${policyId}/document/dynamic`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dynamicDocumentPayload.parse(payload)),
    }
  );
  if (!response.ok) {
    const message = `Failed to get dynamic document: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  const parsed = dynamicDocumentResponse.parse(await response.json());
  if (!parsed.success) {
    throw new Error(parsed.message);
  }
  return parsed;
}

export async function fetchToken(
  logger: Logger
): Promise<z.infer<typeof tokenResponse>> {
  const config = getEnvConfig();
  const response = await fetch(`${BASE_URL}/v1/authentication/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      client_secret: "",
      client_id: config.requests.auth.client,
      username: config.requests.auth.username,
      password: config.requests.auth.password,
    }).toString(),
  });
  if (!response.ok) {
    const message = `Failed to get token: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  return tokenResponse.parse(await response.json());
}

export async function fetchPolicy(
  policyId: string,
  token: string,
  logger: Logger
): Promise<z.infer<typeof policyResponse> | null> {
  const response = await fetch(`${BASE_URL}/v1/policies/${policyId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const message = `Failed to get policy: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  return policyResponse.parse(await response.json());
}

export async function cancelPolicy(
  policyId: string,
  token: string,
  payload: Pick<z.infer<typeof cancelPolicyPayload>, "reason" | "cancelAt">,
  logger: Logger
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}/v1/policies/${policyId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      refund: { type: "full" },
      cancellationRequestedAt: new Date().toISOString().split("T")[0],
    } satisfies z.infer<typeof cancelPolicyPayload>),
  });
  if (!response.ok) {
    const message = `Failed to cancel policy: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  return await response.json();
}

export async function withdrawPolicy(
  policyId: string,
  token: string,
  payload: Pick<z.infer<typeof withdrawPolicyPayload>, "reason" | "withdrawAt">,
  logger: Logger
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}/v1/policies/${policyId}/withdraw`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      withdrawalRequestedAt: new Date().toISOString().split("T")[0],
    } satisfies z.infer<typeof withdrawPolicyPayload>),
  });
  if (!response.ok) {
    const message = `Failed to withdraw policy: ${response.status} ${response.statusText}`;
    const text = await response.text();
    logger.error(message, { response: text });
    throw new Error(text);
  }
  return await response.json();
}

// export async function fetchPartner(
//   payload: z.infer<typeof partnerPayload>,
//   logger: Logger
// ): Promise<z.infer<typeof partnerResponse>> {
//   const response = await fetch(`${BASE_URL}/v1/partners`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(partnerPayload.parse(payload)),
//   });
//   if (!response.ok) {
//     const message = `Failed to get partner: ${response.status} ${response.statusText}`;
//     const text = await response.text();
//     logger.error(message, { response: text });
//     throw new Error(text);
//   }
//   const body = await response.json();
//   const parsed = partnerResponse.parse(body);
//   if (!parsed.success) {
//     throw new Error(parsed.message);
//   }
//   return parsed;
// }
