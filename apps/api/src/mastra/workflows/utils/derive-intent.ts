import { Mastra } from "@mastra/core";
import { StructuredOutputOptions } from "@mastra/core/processors";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { z } from "zod";

export async function deriveIntent<
  T extends z.ZodObject<{
    intent: z.ZodUnion<readonly z.ZodLiteral<string>[]>;
    confidence: z.ZodNumber;
  }>,
>({
  mastra,
  runtimeContext,
  question,
  userMessage,
  schema,
}: {
  mastra: Mastra;
  runtimeContext: RuntimeContext;
  question: string;
  userMessage: string;
  schema: StructuredOutputOptions<T>["schema"];
}): Promise<z.infer<T> | null> {
  const agent = mastra.getAgent("intentClassifierAgent");
  const newRuntimeContext = new RuntimeContext(
    Object.entries({
      ...Object.fromEntries(runtimeContext.entries()),
      schema: JSON.stringify(z.toJSONSchema(schema)),
    })
  );
  const generated = await agent.generate?.(
    JSON.stringify({
      question,
      userMessage,
    }),
    {
      runtimeContext: newRuntimeContext,
      structuredOutput: { schema } as unknown as StructuredOutputOptions,
    }
  );

  const { data: result = null } = schema.safeParse(generated.object);
  mastra.getLogger().info("intent-derived", {
    question,
    userMessage,
    runtimeContext: Object.fromEntries(newRuntimeContext.entries()),
    result,
  });
  return result;
}
