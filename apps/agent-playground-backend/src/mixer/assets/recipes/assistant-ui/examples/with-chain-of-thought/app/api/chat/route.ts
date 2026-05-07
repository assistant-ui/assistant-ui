import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  zodSchema,
} from "ai";
import type { UIMessage } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    tools,
  }: { messages: UIMessage[]; tools: Record<string, any> } = await req.json();

  const result = streamText({
    // Use a reasoning model to showcase chain of thought
    model: openai("o4-mini"),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      // Frontend tools registered via makeAssistantTool (e.g. execute_js)
      ...frontendTools(tools),

      // Backend-only tools
      get_current_weather: tool({
        description: "Get the current weather for a city",
        inputSchema: zodSchema(
          z.object({
            city: z.string(),
          }),
        ),
        execute: async ({ city }) => {
          return `The weather in ${city} is sunny, 72°F`;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
