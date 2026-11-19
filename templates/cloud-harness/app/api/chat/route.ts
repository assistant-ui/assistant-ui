import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

export const POST = async (request: Request) => {
  if (!isAllowedRequestContext(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages } = (await request.json()) as { messages: UIMessage[] };
  const result = streamText({
    abortSignal: request.signal,
    model: openai.responses("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
};
