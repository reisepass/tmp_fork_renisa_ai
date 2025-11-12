import 'dotenv/config';
import Langfuse from 'langfuse';
import { getStandardLangfuseMetadata } from './utils.js';

// Initialize Langfuse
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

const SYSTEM_PROMPT = `You are an expert insurance claim specialist. Your task is to analyze a customer's claim message, the customer's insurance policy, and a list of insurance benefits to decide whether the claim should be paid.

You will be given the following information:
1.  **Customer Message**: The customer's description of the incident.
2.  **Insurance Policy**: The full text of the customer's insurance policy.
3.  **Insurance Benefits (TSV)**: A tab-separated list of covered benefits and their limits.

Based on this information, you must classify the claim into one of the following categories:

1.  **Pay**: The claim is clearly covered by the policy and benefits.
2.  **No-Pay**: The claim is clearly not covered by the policy or benefits.
3.  **Escalate to expert**: The situation is ambiguous, complex, or requires more information.
4.  **Pay-with-limit**: The claim is covered, but a specific payment limit from the benefits list applies.
5.  **Pay but split cost with another insurance**: The claim is covered, but another insurance might also be responsible.

You must respond with ONLY a valid JSON object in the following format:
{
  "Pay-Probability": 0,
  "Pay-Confidence": 0,
  "No-Pay-Probability": 0,
  "No-Pay-Confidence": 0,
  "Escalate-to-expert-Probability": 0,
  "Escalate-to-expert-Confidence": 0,
  "Pay-with-limit-Probability": 0,
  "Pay-with-limit-Confidence": 0,
  "Pay-but-split-cost-Probability": 0,
  "Pay-but-split-cost-Confidence": 0,
  "decision": "Pay",
  "reasoning": "The claim is covered because..."
}

Where:
-   Probability represents how likely the claim falls into that category (0-100).
-   Confidence represents how confident you are in that probability assessment (0-100).
-   decision is your final discrete choice from: "Pay", "No-Pay", "Escalate to expert", "Pay-with-limit", "Pay but split cost with another insurance".
-   reasoning is a brief explanation of why you made that decision, referencing the policy and benefits.

Important: Respond ONLY with the JSON object, no additional text or explanation.`;

// Type definitions
export type ClaimDecision = "Pay" | "No-Pay" | "Escalate to expert" | "Pay-with-limit" | "Pay but split cost";

export interface LLMClaimResponse {
  "Pay-Probability": number;
  "Pay-Confidence": number;
  "No-Pay-Probability": number;
  "No-Pay-Confidence": number;
  "Escalate-to-expert-Probability": number;
  "Escalate-to-expert-Confidence": number;
  "Pay-with-limit-Probability": number;
  "Pay-with-limit-Confidence": number;
  "Pay-but-split-cost-Probability": number;
  "Pay-but-split-cost-Confidence": number;
  decision: ClaimDecision;
  reasoning: string;
}

/**
 * Validates if a string is valid JSON and has expected keys for LLMClaimResponse
 */
function validateJSON(jsonString: string): LLMClaimResponse | null {
  try {
    let cleanedString = jsonString.trim();
    if (cleanedString.startsWith('```')) {
      cleanedString = cleanedString.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    if (cleanedString.startsWith('json')) {
      cleanedString = cleanedString.replace(/^json\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(cleanedString);

    const requiredKeys: (keyof LLMClaimResponse)[] = [
      "Pay-Probability", "Pay-Confidence",
      "No-Pay-Probability", "No-Pay-Confidence",
      "Escalate-to-expert-Probability", "Escalate-to-expert-Confidence",
      "Pay-with-limit-Probability", "Pay-with-limit-Confidence",
      "Pay-but-split-cost-Probability", "Pay-but-split-cost-Confidence",
      "decision", "reasoning"
    ];

    const hasAllKeys = requiredKeys.every(key => key in parsed);

    if (!hasAllKeys) {
      console.log("❌ Missing required keys in JSON response for claim evaluation");
      return null;
    }

    const validDecisions: ClaimDecision[] = [
      "Pay", "No-Pay", "Escalate to expert", "Pay-with-limit", "Pay but split cost"
    ];

    if (!validDecisions.includes(parsed.decision)) {
      console.log("❌ Invalid decision value in JSON response");
      return null;
    }

    return parsed as LLMClaimResponse;
  } catch (error) {
    console.log("❌ JSON parsing failed for claim evaluation:", error);
    return null;
  }
}

/**
 * Calls the LLM via OpenRouter API with Langfuse logging for claim evaluation
 */
async function classifyWithLLM(
  customerMessage: string,
  insurancePolicyText: string,
  insuranceBenefits: string,
  trace?: any
): Promise<LLMClaimResponse | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENROUTER_KEY not found in environment variables");
    return null;
  }

  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();
  console.log(`[${startTimestamp}] Starting LLM API call for claim evaluation...`);

  const model = "google/gemini-2.5-flash-lite";
  const userMessage = `
    **Customer Message:**
    ${customerMessage}

    **Insurance Policy:**
    ${insurancePolicyText}

    **Insurance Benefits (TSV):**
    ${insuranceBenefits}
  `;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  const generation = trace?.generation({
    name: "insurance-claim-evaluation",
    model: model,
    modelParameters: {
      temperature: 0,
      maxTokens: 1000
    },
    input: messages
  });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    const endTime = Date.now();
    const endTimestamp = new Date().toISOString();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[${endTimestamp}] LLM API call for claim evaluation completed in ${duration} seconds`);

    if (!response.ok) {
      console.error("❌ OpenRouter API error (claim evaluation):", response.status, response.statusText);
      const errorBody = await response.text();
      console.error("Error response body:", errorBody);

      generation?.end({
        level: "ERROR",
        statusMessage: `HTTP ${response.status}: ${response.statusText}`
      });

      return null;
    }

    const data: any = await response.json();
    const llmOutput = data.choices?.[0]?.message?.content;

    if (!llmOutput) {
      console.error("❌ No content in LLM response for claim evaluation");
      generation?.end({
        level: "ERROR",
        statusMessage: "No content in LLM response"
      });
      return null;
    }

    console.log("Raw LLM response (claim evaluation):", llmOutput);
    const validatedResponse = validateJSON(llmOutput);

    generation?.end({
      output: llmOutput,
      usage: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0
      },
      metadata: {
        decision: validatedResponse?.decision,
        validJson: validatedResponse !== null
      }
    });

    return validatedResponse;
  } catch (error) {
    console.error("❌ Error calling LLM for claim evaluation:", error);
    generation?.end({
      level: "ERROR",
      statusMessage: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Main claim evaluation function
 * @param customerMessage - The customer's message describing the claim
 * @param insurancePolicyText - The full text of the insurance policy
 * @param insuranceBenefits - A TSV string of insurance benefits
 * @returns The evaluated claim decision
 */
export async function evaluateClaim(
  customerMessage: string,
  insurancePolicyText: string,
  insuranceBenefits: string,
  userId?: string,
  sessionId?: string
): Promise<ClaimDecision> {
  console.log("\n" + "=".repeat(60));
  console.log("CLAIM EVALUATION");
  console.log("=".repeat(60));

  const trace = langfuse.trace({
    name: "insurance-claim-evaluation-flow",
    input: { customerMessage, insurancePolicyText, insuranceBenefits },
    userId: userId,
    sessionId: sessionId,
    metadata: getStandardLangfuseMetadata({
      source: "claim-evaluation",
      messageLength: customerMessage.length
    })
  });

  const llmResult = await classifyWithLLM(customerMessage, insurancePolicyText, insuranceBenefits, trace);

  if (llmResult) {
    console.log("✅ Claim evaluation successful!\n");
    console.log(`Decision: ${llmResult.decision}`);
    console.log(`Reasoning: ${llmResult.reasoning}`);
    console.log("=".repeat(60) + "\n");

    trace.update({
      output: {
        decision: llmResult.decision,
        reasoning: llmResult.reasoning,
        method: "llm"
      }
    });
    await langfuse.flushAsync();

    return llmResult.decision;
  }

  console.log("LLM evaluation failed, escalating to expert.");
  console.log("=".repeat(60) + "\n");

  trace.update({
    output: {
      decision: "Escalate to expert",
      method: "fallback"
    },
    metadata: getStandardLangfuseMetadata({
      llmFailed: true
    })
  });
  await langfuse.flushAsync();

  return "Escalate to expert";
}
