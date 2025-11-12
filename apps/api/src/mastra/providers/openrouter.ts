import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getEnvConfig } from "@renisa-ai/config/env";
import { OpenRouterProviderPreferences } from "../utils";

/**
 * OpenRouter provider configuration for Mastra
 *
 * This module configures OpenRouter with provider routing preferences
 * to control which infrastructure providers are used for OSS models.
 *
 * Reference: https://openrouter.ai/docs/features/provider-routing
 */

const { services } = getEnvConfig();
const openRouterApiKey = services.openrouter;

/**
 * Get provider preferences for OSS models
 *
 * Configuration for models like openai/gpt-oss-120b:
 * - Excludes: chutes/bf16 (poor performance)
 * - Prefers: deepinfra/fp4 (first choice for cost/performance)
 * - Fallback: siliconflow/fp8, novita/bf16
 * - Quantizations: fp4, fp8, bf16
 */
export function getOSSModelProviderPreferences(): OpenRouterProviderPreferences {
  return {
    ignore: ["chutes/bf16"], // Exclude this provider
    order: ["deepinfra/fp4", "siliconflow/fp8", "novita/bf16"], // Preference order
    quantizations: ["fp4", "fp8", "bf16"], // Allow these quantization levels
    allow_fallbacks: true, // Allow fallback if preferred providers unavailable
    sort: "throughput", // Sort by throughput for better performance
  };
}

/**
 * Default OpenRouter provider without specific routing preferences
 * Use this for most models
 */
export const openrouter = createOpenRouter({
  apiKey: openRouterApiKey,
});

/**
 * OpenRouter provider configured for OSS models with specific provider preferences
 *
 * Use this when you want to control which infrastructure provider serves your model.
 * Example usage:
 *
 * ```ts
 * const agent = new Agent({
 *   model: openrouterWithOSSPreferences("openai/gpt-oss-120b"),
 *   // ... other config
 * });
 * ```
 */
export function openrouterWithOSSPreferences(modelId: string) {
  return openrouter(modelId, {
    extraBody: {
      provider: getOSSModelProviderPreferences(),
    },
  });
}

/**
 * Create a custom OpenRouter model with specific provider preferences
 *
 * Example:
 * ```ts
 * const model = openrouterWithProviderPreferences("openai/gpt-oss-120b", {
 *   ignore: ["provider-to-exclude"],
 *   order: ["preferred-provider"],
 *   quantizations: ["fp8"],
 * });
 * ```
 */
export function openrouterWithProviderPreferences(
  modelId: string,
  providerPreferences: OpenRouterProviderPreferences
) {
  return openrouter(modelId, {
    extraBody: {
      provider: providerPreferences,
    },
  });
}
