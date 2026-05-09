import { createOpenAI } from "@ai-sdk/openai";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type UIMessage,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";
import { z } from "zod";
import { getResumableStreamContext } from "@/lib/resumable-context";

export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    id?: string;
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const streamId = crypto.randomUUID();

  const sourceBody = process.env["OPENAI_API_KEY"]
    ? await buildOpenAIBody({
        messages,
        ...(system && { system }),
        ...(tools && { tools }),
      })
    : buildMockBody({ messages });

  const context = await getResumableStreamContext();
  const stream = await context.run(streamId, () => sourceBody);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      [RESUMABLE_STREAM_ID_HEADER]: streamId,
    },
  });
}

function convertFrontendTools(
  tools: Record<string, { description?: string; parameters: JSONSchema7 }>,
): Record<string, ReturnType<typeof tool>> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [
      name,
      tool({
        ...(t.description ? { description: t.description } : {}),
        inputSchema: t.parameters as never,
      }),
    ]),
  );
}

async function buildOpenAIBody({
  messages,
  system,
  tools,
}: {
  messages: UIMessage[];
  system?: string;
  tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
}): Promise<ReadableStream<Uint8Array>> {
  const openai = createOpenAI({
    apiKey: process.env["OPENAI_API_KEY"]!,
    ...(process.env["OPENAI_BASE_URL"] && {
      baseURL: process.env["OPENAI_BASE_URL"],
    }),
  });
  const result = streamText({
    model: openai("gpt-4o"),
    messages: await convertToModelMessages(messages),
    ...(system ? { system } : {}),
    stopWhen: stepCountIs(10),
    tools: {
      ...convertFrontendTools(tools ?? {}),
      get_current_weather: tool({
        description: "Get the current weather",
        inputSchema: zodSchema(z.object({ city: z.string() })),
        execute: async ({ city }) => `The weather in ${city} is sunny`,
      }),
      slow_count: tool({
        description: "Count slowly to N",
        inputSchema: zodSchema(
          z.object({ to: z.number().int().min(1).max(50) }),
        ),
        execute: async ({ to }) => {
          await new Promise((r) => setTimeout(r, to * 200));
          return `counted to ${to}`;
        },
      }),
    },
  });

  const response = result.toUIMessageStreamResponse();
  if (!response.body) throw new Error("expected response body");
  return response.body;
}

function buildMockBody({
  messages,
}: {
  messages: UIMessage[];
}): ReadableStream<Uint8Array> {
  const lastUserText =
    messages
      .filter((m) => m.role === "user")
      .at(-1)
      ?.parts.flatMap((p) =>
        p.type === "text" ? [(p as { type: "text"; text: string }).text] : [],
      )
      .join(" ") ?? "your message";

  const text =
    `(mock response. set OPENAI_API_KEY for the real model)\n\n` +
    `you said: ${lastUserText}\n\n` +
    `here is a slow stream you can interrupt mid-flight by reloading the page. ` +
    `the resumable layer keeps the producer running on the server, so when ` +
    `the browser reconnects it continues right where it left off, with no ` +
    `wasted tokens and no lost progress. ` +
    `lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ` +
    `tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim ` +
    `veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea ` +
    `commodo consequat. duis aute irure dolor in reprehenderit in voluptate ` +
    `velit esse cillum dolore eu fugiat nulla pariatur. excepteur sint ` +
    `occaecat cupidatat non proident, sunt in culpa qui officia deserunt ` +
    `mollit anim id est laborum.\n\n` +
    `done.`;

  const messageId = `msg-${crypto.randomUUID()}`;
  const textPartId = `text-${crypto.randomUUID()}`;
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
      for (const tok of tokens) {
        await new Promise((r) => setTimeout(r, 250));
        writer.write({
          type: "text-delta",
          id: textPartId,
          delta: tok,
        });
      }
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });

  return uiStream
    .pipeThrough(new JsonToSseTransformStream())
    .pipeThrough(new TextEncoderStream());
}
