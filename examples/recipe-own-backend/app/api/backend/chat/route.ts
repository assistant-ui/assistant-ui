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

  // Streams plain text, and fails the response if the model fails, so the chat shows an error.
  const text = new ReadableStream<string>({
    async start(controller) {
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") controller.enqueue(part.text);
        if (part.type === "error") return controller.error(part.error);
      }
      controller.close();
    },
  });

  return new Response(text.pipeThrough(new TextEncoderStream()), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
