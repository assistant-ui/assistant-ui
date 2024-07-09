import { createOpenAI } from "@ai-sdk/openai";
import { createEdgeRuntimeAPI } from "@assistant-ui/react/edge";

const openai = createOpenAI({
  baseURL: process.env["OPENAI_BASE_URL"] as string,
});

export const runtime = "edge";

export const { POST } = createEdgeRuntimeAPI({
  model: openai("gpt-3.5-turbo"),
});
