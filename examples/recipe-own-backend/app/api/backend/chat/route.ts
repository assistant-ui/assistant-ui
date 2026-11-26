import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { isAllowedRequestContext } from "../../request-context";

export const maxDuration = 30;

// Stands in for your existing backend: it takes role/text pairs and streams plain text back.
const ChatRequest = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), text: z.string() }),
  ),
});

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const body = ChatRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: body.data.messages.map(({ role, text }) =>
      role === "user"
        ? { role: "user", content: text }
        : { role: "assistant", content: text },
    ),
  });

  return result.toTextStreamResponse();
}
