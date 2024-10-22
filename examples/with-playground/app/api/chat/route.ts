import { createOpenAI } from "@ai-sdk/openai";
import { createEdgeRuntimeAPI } from "@assistant-ui/react/edge";

export const maxDuration = 30;

export const { POST } = createEdgeRuntimeAPI({
  model: ({ apiKey, modelName }) => {
    if (!apiKey) throw new Error("apiKey is required");
    if (!modelName) throw new Error("modelName is required");
    return createOpenAI({ apiKey })(modelName);
  },
});
