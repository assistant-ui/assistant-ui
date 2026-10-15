import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export default defineEventHandler(async (event) => {
  const abortController = new AbortController();
  event.node.res.on("close", () => {
    if (!event.node.res.writableFinished) {
      abortController.abort();
    }
  });

  const { messages } = await readBody<{ messages: UIMessage[] }>(event);
  const result = streamText({
    abortSignal: abortController.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
});
