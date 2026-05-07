import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: await convertToModelMessages(messages),
    ...(system ? { system } : {}),
    stopWhen: stepCountIs(10),
    tools: {
      ...frontendTools(tools ?? {}),
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
    },
  });

  return result.toUIMessageStreamResponse();
}
