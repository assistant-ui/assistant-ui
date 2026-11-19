import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAllowedRequestContext(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const result = streamText({
    abortSignal: request.signal,
    model: openai("gpt-6-luna"),
    system: "You are a concise, helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
