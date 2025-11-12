import { Agent } from "@mastra/core/agent";

import { fetchPrompt, getAgentDefaultOptions } from "../../utils";

export const intentClassifierAgent = new Agent({
  name: "intent-classifier-agent",
  async instructions({ runtimeContext, mastra }) {
    return await fetchPrompt({
      promptName: "Intent Classifier",
      runtimeContext,
      logger: mastra?.getLogger(),
    });
  },
  defaultGenerateOptions: getAgentDefaultOptions,
  defaultStreamOptions: getAgentDefaultOptions,
  defaultVNextStreamOptions: getAgentDefaultOptions,
  model: "openrouter/google/gemini-2.5-flash",
});
