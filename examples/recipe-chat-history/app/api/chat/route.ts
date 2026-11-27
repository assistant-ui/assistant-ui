import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
