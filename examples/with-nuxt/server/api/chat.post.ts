import { openai } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

export default defineEventHandler(async (event) => {
  const { messages, system } = await readBody<{
    messages: ModelMessage[];
    system?: string;
  }>(event);

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages,
    system,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
});
