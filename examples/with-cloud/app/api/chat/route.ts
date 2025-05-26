import { openai } from "@ai-sdk/openai";
import { jsonSchema, streamText } from "ai";
import {
  backendTool,
  backendTools,
  toAISDKTool,
} from "assistant-stream/core/tool/tool-types";
import { z } from "zod";
import { z as zv4 } from "zod/v4";

export const runtime = "edge";
export const maxDuration = 30;

// Define the weather tool
const weatherTool = backendTool({
  description: "Get weather information",
  parameters: z.object({
    location: z.string().describe("Location to get weather for"),
  }),
  execute: async ({ location }) => {
    return {
      weather: `${location} is sunny`,
    };
  },
});

// TODO: support vercel to our tool definition conversion.
// const weatherTool2 = tool({
//   description: "Get weather information",
//   parameters: z.object({
//     location: z.string().describe("Location to get weather for"),
//   }),
//   execute: async ({ location }) => {
//     return {
//       weather: `${location} is sunny`,
//     };
//   },
// });

const dayTool = backendTool({
  description: "Get the current day of the week",
  parameters: jsonSchema({
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Timezone to get the day for",
      },
    },
    required: ["timezone"],
    additionalProperties: false,
  }),
  execute: async () => {
    return {
      day: "Monday",
    };
  },
});

const rainTool = backendTool({
  description: "Get the current rain forecast",
  parameters: zv4.object({
    expectedPercentage: zv4.number().describe("Expected percentage of rain"),
  }),
  execute: async ({ expectedPercentage }) => {
    return {
      rain: `${expectedPercentage}% chance of rain`,
    };
  },
});

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const allTools = {
    ...(tools || {}),
  };

  console.log(
    "allTools",
    Object.fromEntries(
      Object.entries<{ parameters: unknown }>(allTools).map(([name, tool]) => [
        name,
        {
          parameters: tool.parameters,
        },
      ]),
    ),
  );

  console.log("weather: ", JSON.stringify(toAISDKTool(weatherTool)));
  // console.log("day: ", JSON.stringify(toAISDKTool(dayTool)));

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    // forward system prompt and tools from the frontend
    system,
    tools: {
      ...Object.fromEntries(
        Object.entries<{ parameters: unknown }>(allTools).map(
          ([name, tool]) => [
            name,
            {
              parameters: jsonSchema(tool.parameters as object),
            },
          ],
        ),
      ),
      weather: toAISDKTool(weatherTool),
      day: toAISDKTool(dayTool),
    },
    onError: (error) => {
      console.error("error", error);
    },
  });

  return result.toDataStreamResponse();
}

const BackendTools = backendTools({
  weather: weatherTool,
  day: dayTool,
  rain: rainTool,
  // weather2: weatherTool2,
});

export type BackendTools = typeof BackendTools;
