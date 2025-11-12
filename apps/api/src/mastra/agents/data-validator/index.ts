import {
  Agent,
  AgentExecutionOptions,
  AgentGenerateOptions,
  AgentStreamOptions,
} from "@mastra/core/agent";

import { fetchPrompt, getAgentDefaultOptions } from "../../utils";

import { askClarificationTool, flagInconsistencyTool } from "./tools";

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

export const dataValidatorAgent = new Agent({
  name: "data-validator-agent",
  async instructions({ runtimeContext, mastra }) {
    return await fetchPrompt({
      promptName: "Data Validator",
      runtimeContext,
      logger: mastra?.getLogger(),
    });
  },
  tools: {
    askClarificationTool,
    flagInconsistencyTool,
  },
  defaultGenerateOptions: defaults,
  defaultStreamOptions: defaults,
  defaultVNextStreamOptions: defaults,
  model: "openrouter/google/gemini-2.5-flash",
});
