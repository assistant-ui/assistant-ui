import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export const POST = async (request: Request) => {
  const { messages } = (await request.json()) as { messages: UIMessage[] };
  const result = streamText({
    model: openai.responses("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
};
