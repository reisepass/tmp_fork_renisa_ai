import { Mastra } from "@mastra/core/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { OutputSchema } from "@mastra/core/stream";
import { createStep, DefaultEngineType, Step } from "@mastra/core/workflows";
import {
  baseWorkflowSchema,
  commonResumeSchema,
  commonSuspendSchema,
  dataCollectionSchema,
  refinements,
} from "@renisa-ai/config/schema";
import { DataCollection } from "@renisa-ai/config/types";
import { notEmpty } from "@renisa-ai/utils";
import { z } from "zod";

import {
  getWorkflowMessage,
  WorkflowMessageKey,
  WorkflowNamespace,
} from "../../i18n";

import { getRuntimeContextLocale } from "./index";

// Error types that the agent can handle for formatting
export type ValidationErrorType =
  | "empty"
  | "format"
  | "invalid"
  | "checksum"
  | "wrong_format"
  | "future_date"
  | "past_date"
  | "invalid_characters"
  | "no_letters"
  | "too_young"
  | "too_old"
  | "default";

export type ValidationError = {
  type: ValidationErrorType;
  field: string;
  params?: Record<string, string>;
};

export type MissingFieldsError = {
  type: "missing_fields";
  fields: string[];
};

export function getMainDataCollectionSteps<
  N extends WorkflowNamespace,
  S extends typeof baseWorkflowSchema,
  T extends {
    id: string;
    keys: (keyof DataCollection)[];
    messageKeys: WorkflowMessageKey<N>[];
  },
>(
  namespace: N,
  inOutSchema: S,
  steps: readonly T[]
): Map<
  T["id"],
  Step<
    T["id"],
    S,
    S,
    S,
    typeof commonResumeSchema,
    typeof commonSuspendSchema,
    DefaultEngineType
  >
> {
  return new Map(
    steps.map(({ id, keys, messageKeys }) => [
      id,
      createStep({
        id,
        description: `Ask the user about ${id}`,
        inputSchema: inOutSchema,
        outputSchema: inOutSchema,
        resumeSchema: commonResumeSchema,
        suspendSchema: commonSuspendSchema,
        async execute({
          inputData,
          mastra,
          resumeData,
          suspend,
          runtimeContext,
          workflowId,
          runCount,
          runId,
        }) {
          const logger = mastra.getLogger();
          logger.info(`step: ${id}`, {
            workflowId,
            stepId: id,
            runId,
            runCount,
            inputData,
            resumeData,
            keys,
          });

          const dataCollection = mergeDataCollections(
            inputData.dataCollection,
            resumeData?.dataCollection,
            dataCollectionSchema
          );

          const missingKeys = keys.filter(
            (key) => !notEmpty(dataCollection[key])
          );
          if (missingKeys.length === 0) {
            return {
              ...inputData,
              dataCollection,
              completed: true,
            };
          }

          const locale = getRuntimeContextLocale(runtimeContext);
          const messages = messageKeys.map((message) =>
            getWorkflowMessage(locale, namespace, message)
          );

          const userMessage = resumeData?.userMessage || inputData.userMessage;

          if (!userMessage) {
            return await suspend({
              reason: "user_input",
              dataCollection,
              messages: messages.map((m) => ({
                type: "data" as const,
                content: {
                  promp:
                    "Combine the message and the missing keys in a meaningful way.",
                  message: m,
                  missingKeys,
                },
                action: "collect-data",
              })),
            });
          }

          const lastMessage = messages[messages.length - 1];
          const collectedData = await collectDataHybrid({
            mastra,
            runtimeContext,
            keys,
            question: lastMessage,
            userMessage,
            alreadyCollectedData: dataCollection,
            schema: dataCollectionSchema,
          });

          logger.info("collected-data", {
            inputData,
            dataCollection,
            collectedData,
          });

          if (collectedData.error) {
            return await suspend({
              reason: "user_input",
              dataCollection: collectedData.dataCollection || dataCollection,
              messages: messages.map((m) => ({
                type: "data" as const,
                content: {
                  message: m,
                  missingKeys,
                  ...(typeof collectedData.error === "string"
                    ? { error: collectedData.error }
                    : collectedData.error),
                },
                action: "collect-data",
              })),
            });
          }

          return {
            ...inputData,
            dataCollection: collectedData.dataCollection,
            completed: collectedData.completed,
          };
        },
      }),
    ])
  );
}

export async function collectDataHybrid<T extends z.ZodObject>({
  mastra,
  runtimeContext,
  keys,
  question,
  userMessage,
  alreadyCollectedData,
  schema,
}: {
  mastra: Mastra;
  runtimeContext: RuntimeContext;
  keys: (keyof z.infer<T>)[];
  question?: string;
  userMessage: string;
  alreadyCollectedData: z.infer<T> | null;
  schema: T;
}): Promise<{
  error: ValidationError | MissingFieldsError | string | null;
  dataCollection: z.infer<T>;
  completed: boolean;
}> {
  const logger = mastra.getLogger();

  // Step 1: Try LLM extraction first - always try to extract everything
  const extractionResult = await extractDataFromMessage({
    userMessage,
    question,
    schema, // Always extract from full schema
    mastra,
  });

  let extractedData = {} as Partial<z.infer<T>>;
  if (extractionResult.success) {
    extractedData = extractionResult.data;
    logger.info("llm-extraction-success", {
      keys,
      userMessage,
      extractedData,
    });
  } else {
    logger.info("llm-extraction-failed", {
      keys,
      userMessage,
      error: extractionResult.error,
    });
  }

  // Step 2: Merge with existing data
  const preliminaryData = mergeDataCollections(
    alreadyCollectedData,
    extractedData,
    schema
  );

  // Step 2b: Apply built-in validation functions
  const { cleanedData, errors } = validateAndCleanData(preliminaryData);

  logger.info("validation-cleaned-data", {
    cleanedData,
    errors,
  });

  if (errors.length > 0) {
    const locale = getRuntimeContextLocale(runtimeContext);

    logger.info("validation-errors-found", {
      keys,
      userMessage,
      errors,
      preliminaryData,
      locale,
    });

    // Return first validation error as structured data for agent to handle
    const firstError = errors[0];
    const validationError = getValidationError(
      firstError.error,
      firstError.field
    );

    return {
      error: validationError,
      dataCollection: preliminaryData,
      completed: false,
    };
  }

  // Step 3: Check what's still missing from the REQUIRED keys only
  const missingKeys = keys.filter((key) => !notEmpty(cleanedData[key]));

  // Step 4: If we have all required data, we're done
  if (missingKeys.length === 0) {
    logger.info("hybrid-collection-complete", {
      keys,
      userMessage,
      finalData: cleanedData,
    });

    return {
      error: null,
      dataCollection: cleanedData,
      completed: true,
    };
  }

  // Step 4b: If we extracted some data but still missing some, collect missing fields
  if (Object.keys(extractedData).length > 0 && missingKeys.length > 0) {
    const result = await collectMissingFields({
      missingKeys,
      currentData: cleanedData,
    });

    return {
      error: result.error,
      dataCollection: result.dataCollection,
      completed: result.completed,
    };
  }

  // Step 5: Handle missing required data
  if (missingKeys.length > 0) {
    const result = await collectMissingFields({
      missingKeys,
      currentData: cleanedData,
    });

    return {
      error: result.error,
      dataCollection: result.dataCollection,
      completed: result.completed,
    };
  }

  // Shouldn't reach here, but handle edge case
  return {
    error: null,
    dataCollection: cleanedData,
    completed: true,
  };
}

async function extractDataFromMessage<T extends z.ZodObject>({
  userMessage,
  question,
  schema,
  mastra,
}: {
  userMessage: string;
  question?: string;
  schema: T;
  mastra: Mastra;
}) {
  const extractorAgent = mastra.getAgent("dataExtractorAgent");

  const extracted = await extractorAgent.generate(
    JSON.stringify({
      userMessage,
      question,
      task: "Extract structured insurance data from the user message. Only extract data that is explicitly mentioned. Do not guess or infer missing information.",
    }),
    {
      structuredOutput: { schema: schema as OutputSchema },
    }
  );

  return schema.safeParse(extracted.object);
}

function validateAndCleanData<T extends z.ZodObject>(data: z.infer<T>) {
  const errors: Array<{ field: string; error: string }> = [];

  // Apply validation functions to each field
  const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
    // Find validation function for this field
    const validate = refinements.find(([fieldKey]) => fieldKey === key)?.[1];
    if (value !== null && value !== undefined && validate) {
      const result = validate(String(value));
      if (result.valid) {
        return { ...acc, [key]: result.value || String(value) };
      }
      errors.push({
        field: key,
        error: result.error || "Invalid value",
      });
      // Keep original value for now, agent can handle the error
    }
    return { ...acc, [key]: value };
  }, data);

  return { cleanedData, errors };
}

function getValidationError(error: string, fieldKey: string): ValidationError {
  let type: ValidationErrorType = "default";
  const params: Record<string, string> = {};

  if (error.startsWith("too_young")) {
    type = "too_young";
    params.minAge = error.split(" ")[2] || "18";
  } else if (error.startsWith("too_old")) {
    type = "too_old";
    params.maxAge = error.split(" ")[2] || "99";
  } else if (
    [
      "empty",
      "format",
      "invalid",
      "checksum",
      "wrong_format",
      "future_date",
      "past_date",
      "invalid_characters",
      "no_letters",
    ].includes(error)
  ) {
    type = error as ValidationErrorType;
  }

  return {
    type,
    field: fieldKey,
    params,
  };
}

async function collectMissingFields<T extends z.ZodObject>({
  missingKeys,
  currentData,
}: {
  missingKeys: (keyof z.infer<T>)[];
  currentData: z.infer<T>;
}) {
  return {
    error: {
      type: "missing_fields" as const,
      fields: missingKeys.map((key) => key.toString()),
    },
    dataCollection: currentData,
    completed: false,
  };
}

function mergeDataCollections<T extends z.ZodObject>(
  inputData: z.infer<T> | null | undefined,
  collectedData: Partial<z.infer<T>> | null | undefined,
  schema: T
) {
  return (Object.keys(schema.shape) as (keyof z.infer<T>)[]).reduce(
    (acc, key) => {
      return {
        ...acc,
        [key]: notEmpty(collectedData?.[key])
          ? collectedData?.[key]
          : notEmpty(inputData?.[key])
            ? inputData?.[key]
            : null,
      };
    },
    {} as z.infer<T>
  );
}
