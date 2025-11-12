import { Agent, AgentExecutionOptions, AgentGenerateOptions, AgentStreamOptions } from "@mastra/core/agent";

import { fetchPrompt, getAgentDefaultOptions } from "../../utils";

const defaults = <
  T extends AgentExecutionOptions | AgentGenerateOptions | AgentStreamOptions,
>(
  options: T
) => {
  return {
    ...options,
    ...getAgentDefaultOptions({
      runtimeContext: options.runtimeContext,
    }),
  };
};

export const dataExtractorAgent = new Agent({
  name: "data-extractor-agent",
  async instructions({ runtimeContext, mastra }) {
    return await fetchPrompt({
      promptName: "Data Extractor",
      runtimeContext,
      logger: mastra?.getLogger(),
    });
  },
  tools: {},
  defaultGenerateOptions: defaults,
  defaultStreamOptions: defaults,
  defaultVNextStreamOptions: defaults,
  model: "openrouter/google/gemini-2.5-flash",
});