import { LangfuseClient } from "@langfuse/client";
import {
  AgentExecutionOptions,
  AgentGenerateOptions,
  AgentStreamOptions,
} from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { config as globalConfig } from "@renisa-ai/config";
import { getEnvConfig } from "@renisa-ai/config/env";
import { Logger } from "@renisa-ai/config/types";

/**
 * OpenRouter provider routing configuration
 * Reference: https://openrouter.ai/docs/features/provider-routing
 */
export interface OpenRouterProviderPreferences {
  /** Ordered list of provider slugs to try (e.g., ["deepinfra/fp4", "siliconflow/fp8"]) */
  order?: string[];
  /** Whether to allow fallback to other providers if preferred ones fail */
  allow_fallbacks?: boolean;
  /** Provider slugs to exclude from routing (e.g., ["chutes/bf16"]) */
  ignore?: string[];
  /** Only use these specific providers */
  only?: string[];
  /** Filter by quantization levels (e.g., ["fp4", "fp8", "bf16"]) */
  quantizations?: ("int4" | "int8" | "fp4" | "fp6" | "fp8" | "fp16" | "bf16" | "fp32" | "unknown")[];
  /** Sort providers by "price" or "throughput" */
  sort?: "price" | "throughput";
  /** Enable zero-downtime routing */
  zdr?: boolean;
  /** Data collection preference */
  data_collection?: "allow" | "deny";
}

export function getAgentDefaultOptions(args: {
  runtimeContext?: RuntimeContext;
  mastra?: Mastra;
}): Pick<
  AgentExecutionOptions | AgentGenerateOptions | AgentStreamOptions,
  "runtimeContext" | "maxSteps" | "toolChoice"
> {
  return {
    runtimeContext: args.runtimeContext,
    maxSteps: 10,
  };
}

/**
 * Get OpenRouter provider preferences for OSS models like gpt-oss-120b
 *
 * Configuration:
 * - Ignores: chutes/bf16 (excluded)
 * - Prefers: deepinfra/fp4 (first choice)
 * - Fallback: siliconflow/fp8, novita/bf16
 * - Quantizations: fp4, fp8, bf16
 */
export function getOpenRouterProviderPreferences(): OpenRouterProviderPreferences {
  return {
    ignore: ["chutes/bf16"],
    order: ["deepinfra/fp4", "siliconflow/fp8", "novita/bf16"],
    quantizations: ["fp4", "fp8", "bf16"],
    allow_fallbacks: true,
    sort: "throughput",
  };
}

export async function fetchPrompt({
  promptName,
  runtimeContext,
  variables: additionalVariables = {},
  placeholders,
  logger,
}: {
  promptName: string;
  runtimeContext: RuntimeContext;
  variables?: Record<string, string>;
  placeholders?: Record<string, string>;
  logger?: Logger;
}): Promise<string> {
  const {
    langfuse: { label, config },
    isDevelopment,
    isLocal,
  } = getEnvConfig();
  const langfuse = new LangfuseClient(config);

  let prompt;
  let actualLabel = label;
  try {
    // Try to get the prompt with the specified label
    prompt = await langfuse.prompt.get(promptName, {
      label,
    });
    logger?.info("Prompt found with label", { promptName, label });
  } catch (error) {
    // If prompt not found with label, fall back to latest
    logger?.warn(`Prompt '${promptName}' not found with label '${label}', falling back to latest`, {
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      prompt = await langfuse.prompt.get(promptName);
      actualLabel = "latest";
      logger?.info("Prompt found (latest version)", { promptName });
    } catch (fallbackError) {
      logger?.error(`Failed to fetch prompt '${promptName}' even without label`, {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      throw fallbackError;
    }
  }

  const variables = {
    brand: globalConfig.name,
    role: promptName,
    country: globalConfig.validations.country,
    ageMin: globalConfig.validations.ageMin.toString(),
    ageMax: globalConfig.validations.ageMax.toString(),
    supportEmail: globalConfig.support.email,
    claimsLink: globalConfig.support.claimsLink,
    ...Object.fromEntries(runtimeContext.entries() || []),
    ...additionalVariables,
  };

  // Enhanced logging with version and label info
  const promptMetadata = {
    promptName,
    label: actualLabel,
    version: prompt.version,
    promptId: prompt.name,
  };

  logger?.info("prompt-fetched", {
    ...promptMetadata,
    variables,
    placeholders,
  });

  // Store prompt metadata in runtime context for tracing
  runtimeContext.set("promptName", promptName);
  runtimeContext.set("promptLabel", actualLabel);
  runtimeContext.set("promptVersion", String(prompt.version));

  // Store the prompt object for Langfuse linking
  // This enables the bidirectional link between prompts and traces in Langfuse
  // See: https://langfuse.com/docs/prompt-management/features/link-to-traces
  runtimeContext.set("langfusePrompt", JSON.stringify(prompt.toJSON()));

  // Debug log in dev/local for immediate visibility
  if (isDevelopment || isLocal) {
    logger?.debug("\n" + "=".repeat(60));
    logger?.debug("📝 PROMPT LOADED FROM LANGFUSE");
    logger?.debug("=".repeat(60));
    logger?.debug(`Prompt Name:    ${promptName}`);
    logger?.debug(`Label:          ${actualLabel}`);
    logger?.debug(`Version:        ${prompt.version}`);
    logger?.debug(`Prompt ID:      ${prompt.name}`);
    logger?.debug("=".repeat(60) + "\n");
  }

  return prompt.compile(variables, placeholders);
}
