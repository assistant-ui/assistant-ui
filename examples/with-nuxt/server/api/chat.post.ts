import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";

export default defineEventHandler(async (event) => {
  const abortController = new AbortController();
  event.node.res.on("close", () => {
    if (!event.node.res.writableFinished) {
      abortController.abort();
    }
  });

  const { messages, system } = await readBody<{
    messages: UIMessage[];
    system?: string;
  }>(event);

  const aiSDKTools = {
    weather: tool({
      description: "Get the current weather for a city",
      inputSchema: jsonSchema<{ city: string }>({
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
        },
        required: ["city"],
        additionalProperties: false,
      }),
      execute: async ({ city }) => ({
        city,
        temperature: Math.round(8 + Math.random() * 20),
        condition: "sunny",
      }),
    }),
  };
  const result = streamText({
    abortSignal: abortController.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    system,
    stopWhen: stepCountIs(3),
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
});
