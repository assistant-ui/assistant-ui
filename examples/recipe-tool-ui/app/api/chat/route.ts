import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { isAllowedRequestContext } from "../request-context";

export const maxDuration = 30;

const tools = {
  getWeather: tool({
    description: "Get the current weather in a city.",
    inputSchema: z.object({ city: z.string() }),
    // Replace with a call to your weather provider.
    execute: async ({ city }) => ({
      city,
      temperatureC: 21,
      condition: "Sunny",
      humidity: 40,
    }),
  }),
};

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
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
