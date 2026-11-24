import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import data from "../../data.json";

export const maxDuration = 60;

const SYSTEM = `You answer in a chat where an answer can be live UI drawn in the thread.

- When the person asks for something they can use or look at, draw it: render_spec for anything the components can show, show_widget for games, animations and drawings they cannot.
- When they ask to change something already in the chat, change that one instead of drawing a new one.
- Anything else gets a short answer in plain Markdown.
- After drawing, say in one or two sentences what it does and what they can change. Never paste its code or spec.`;

const bodySchema = z.object({
  messages: z.array(
    z.looseObject({ role: z.string(), parts: z.array(z.unknown()) }),
  ),
  system: z.string().max(64000).optional(),
  tools: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  // Any route file under app/ is a public endpoint on the site that serves it, so this one stays off unless switched on.
  if (process.env["BLOCKS_LIVE_API"] !== "true") {
    return new Response(
      'The assistant is switched off here. Set BLOCKS_LIVE_API to "true" to turn it on.',
      { status: 404 },
    );
  }
  if (!process.env["OPENAI_API_KEY"]) {
    return new Response(
      "No model key is set. Copy .env.example to .env.local and add one.",
      { status: 401 },
    );
  }
  const body = bodySchema.safeParse(await req.json().catch(() => undefined));
  if (!body.success) {
    return new Response("The request body is not a chat request.", {
      status: 400,
    });
  }

  const messages = body.data.messages as unknown as UIMessage[];
  // The widget tools run in the browser, so only their schemas come here. Their instructions arrive in `system`.
  const tools = frontendTools(
    (body.data.tools ?? {}) as Parameters<typeof frontendTools>[0],
  );
  const result = streamText({
    abortSignal: req.signal,
    model: openai(data.model),
    system: body.data.system ? `${SYSTEM}\n\n${body.data.system}` : SYSTEM,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : "The model request failed.",
    }),
  });
}
