import { createVectorQueryTool } from "@mastra/rag";

import { EmbedFactory } from "../providers/embedFactory";

// Configure memory with semantic recall for better context awareness
export const searchKnowledgeBase = createVectorQueryTool({
  id: "search-knowledge-base",
  vectorStoreName: "knowledgeBase",
  indexName: "knowledgeBase",
  model: EmbedFactory.getModel("openai", "small"),
  description: "Search the knowledge base for the most relevant information",
}) as ReturnType<typeof createVectorQueryTool>;
