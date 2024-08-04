import { openai } from "@ai-sdk/openai";
import { createEdgeRuntimeAPI } from "@assistant-ui/react/edge";

export const maxDuration = 30;

export const { POST } = createEdgeRuntimeAPI({
  model: openai("gpt-4o"),
});
