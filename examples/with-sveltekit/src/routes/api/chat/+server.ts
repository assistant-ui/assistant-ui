import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { OPENAI_API_KEY } from "$app/env/private";
import type { RequestHandler } from "./$types";

function isAllowedRequestContext(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  if (origin === null) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  if (!isAllowedRequestContext(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const { messages, system } = (await request.json()) as {
    messages: UIMessage[];
    system?: string;
  };

  const openai = createOpenAI({ apiKey: OPENAI_API_KEY });
  const result = streamText({
    abortSignal: request.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages),
    system,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) =>
      error instanceof Error ? error.message : String(error),
  });
};
