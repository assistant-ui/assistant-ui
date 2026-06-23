import { openai } from "@ai-sdk/openai";
import { createAISDKRoute } from "@assistant-ui/react-ai-sdk";
import { stepCountIs } from "ai";
import toolkit from "../../toolkit";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export const { POST } = createAISDKRoute({
  toolkit,
  model: openai("gpt-5.4-nano"),
  streamText: {
    stopWhen: stepCountIs(10),
  },
});
