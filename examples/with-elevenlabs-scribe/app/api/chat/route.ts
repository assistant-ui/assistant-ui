import { openai } from "@ai-sdk/openai";
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const aiSDKTools = {
    get_current_weather: tool({
      description: "Get the current weather",
      inputSchema: zodSchema(
        z.object({
          city: z.string(),
        }),
      ),
      execute: async ({ city }) => {
        return `The weather in ${city} is sunny`;
      },
    }),
  };
  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    stopWhen: stepCountIs(10),
    tools: aiSDKTools,
  });

  return result.toUIMessageStreamResponse();
}
