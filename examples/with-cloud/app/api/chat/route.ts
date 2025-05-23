import { openai } from "@ai-sdk/openai";
// import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { jsonSchema, streamText } from "ai";
import { BackendTool } from "assistant-stream/core/tool/tool-types";
import { z } from "zod";

export const runtime = "edge";
export const maxDuration = 30;

// Define the weather tool
const weatherTool = {
  description: "Get weather information",
  parameters: z.object({
    location: z.string().describe("Location to get weather for"),
  }),
  execute: async () => {
    return {
      weather: "sunny",
    };
  },
} satisfies BackendTool;

const dayTool = {
  description: "Get the current day of the week",
  parameters: z.object({
    timezone: z.string().describe("Timezone to get the day for"),
  }),
  execute: async () => {
    return {
      day: "Monday",
    };
  },
} satisfies BackendTool;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const allTools = {
    ...(tools || {}),
    weather: weatherTool,
    day: dayTool,
  };

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    // forward system prompt and tools from the frontend
    system,
    tools: Object.fromEntries(
      Object.entries<{ parameters: unknown }>(allTools).map(([name, tool]) => [
        name,
        {
          parameters: jsonSchema(tool.parameters!),
        },
      ]),
    ),
  });

  return result.toDataStreamResponse();
}

export type BackendTools = {
  weather: typeof weatherTool;
  day: typeof dayTool;
};
