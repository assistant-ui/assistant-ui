import { AssistantUITools } from "@assistant-ui/react/runtimes/core/ThreadRuntimeCore";
import { tool } from "ai";
import { z } from "zod";

const aiSDKTools = {
  weather: tool({
    description: "Fetched the current weather in the given location.",
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      // Generate a random temperature between 0°C and 35°C
      const tempCelsius = Math.random() * 35;
      return {
        location: location,
        tempCelsius: Number(tempCelsius.toFixed(1)),
      };
    },
  }),

  // This is a tool that asks the user for their location. The user supplies the location on the client side component via `addResult`
  getLocationFromUser: tool({
    description:
      "Asks the user for their location if the user does provide one.",
    parameters: z.object({
      location: z.string(),
    }),
    execute: async () => undefined,
  }),
} satisfies AssistantUITools;

export type Tools = typeof aiSDKTools;
export const tools = aiSDKTools;
