import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    system:
      "You are Light, a calm and concise assistant. Reduce complexity, ask focused questions, and give practical next steps.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
