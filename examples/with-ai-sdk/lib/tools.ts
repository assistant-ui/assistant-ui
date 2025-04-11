import { aiSDKAdapter, auiTool } from "@assistant-ui/react";
import { z } from "zod";
import { tool } from "ai";
import pg from "pg";

// export const webSearchTool = auiTool({
//   name: "weather",
//   type: "client",
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

export const webSearchToolServer = auiTool({
  name: "weather",
  type: "server",
  description: "fetches current weather for location",
  parameters: z.object({
    location: z.string(),
    temperature: z.number(),
  }),
  execute: async () => {
    const client = new pg.Client({
      connectionString: "test",
    });
    await client.connect();
    const res = await client.query("SELECT * FROM users");
    await client.end();
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

export const weatherTool = webSearchToolServer;
