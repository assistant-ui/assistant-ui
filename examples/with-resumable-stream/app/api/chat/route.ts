import { openai } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
  JsonToSseTransformStream,
} from "ai";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { z } from "zod";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL",
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const streamId = crypto.randomUUID();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      get_current_weather: tool({
        description: "Get the current weather for a city",
        inputSchema: z.object({
          city: z.string().describe("The city to get weather for"),
        }),
        execute: async ({ city }: { city: string }) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return `The weather in ${city} is sunny with a temperature of 72°F`;
        },
      }),
    },
  });

  const stream = result
    .toUIMessageStream()
    .pipeThrough(new JsonToSseTransformStream());

  const streamContext = getStreamContext();

  if (streamContext) {
    try {
      const resumableStream = await streamContext.resumableStream(
        streamId,
        () => stream,
      );

      if (resumableStream) {
        return new Response(resumableStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Stream-Id": streamId,
          },
        });
      }
    } catch (error) {
      console.error("Failed to create resumable stream:", error);
    }
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Stream-Id": streamId,
    },
  });
}
