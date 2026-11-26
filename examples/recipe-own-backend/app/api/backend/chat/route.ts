import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

// Stands in for your existing backend: it takes role/text pairs and streams plain text back.
const ChatRequest = z.object({
  messages: z.array(
    z.object({ role: z.enum(["user", "assistant"]), text: z.string() }),
  ),
});

export async function POST(req: Request) {
  const { messages } = ChatRequest.parse(await req.json());

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: messages.map(({ role, text }) =>
      role === "user"
        ? { role: "user", content: text }
        : { role: "assistant", content: text },
    ),
  });

  return result.toTextStreamResponse();
}
