import { openai } from "@ai-sdk/openai";
import { LLMProvider, Logger } from "@renisa-ai/config/types";
import { EmbeddingModel } from "ai";

export class EmbedFactory {
  static getModel(
    provider = "openai",
    size: "small" | "large" = "small",
    logger: Logger = console
  ): Exclude<EmbeddingModel, string> {
    const llmProvider = provider.toLowerCase() as LLMProvider;

    const openaiEmbeddingModel = openai.textEmbeddingModel(
      size === "large" ? "text-embedding-3-large" : "text-embedding-3-small"
    );
    switch (llmProvider) {
      case "openai":
        return openaiEmbeddingModel;
      case "anthropic":
        throw new Error("Anthropic is currently not supported for embeddings");
      // return anthropic.textEmbeddingModel("");
      case "mistral":
        throw new Error("Mistral is currently not supported for embeddings");
      default:
        logger.warn(
          `Unknown LLM provider: ${llmProvider}. Falling back to OpenAI.`
        );
        return openaiEmbeddingModel;
    }
  }
}
