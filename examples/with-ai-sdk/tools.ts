import { aiSDKAdapter, auiServerTool } from "@assistant-ui/react";
import { z } from "zod";

export const webSearchTool = auiServerTool({
  toolName: "weather",
  description: "fetches current weather for location",
  parameters: z.object({
    location: z.string(),
    temperature: z.number(),
  }),
  server: async () => {
    return {
      location: "sf",
      temperature: 78,
    };
  },
});

// export const webSearchTool = auiClientTool({
//   toolName: "weather",
//   description: "fetches current weather for location",
//   parameters: z.object({
//     location: z.string(),
//     temperature: z.number(),
//   }),
//   execute: async () => {
//     return {
//       location: "sf",
//       temperature: 78,
//     };
//   },
// });

export const weatherTool = aiSDKAdapter(webSearchTool);
