import { Mastra } from "@mastra/core";
import { Memory } from "@mastra/memory";
import { createLibSqlStore } from "@mastra/memory/libsql";
import { chefAgent } from "./agents/chefAgent";
import { weatherAgent } from "./agents/weatherAgent";

// Create memory store for persistent conversations
const memory = new Memory({
  storage: createLibSqlStore({
    path: "./mastra.db",
  }),
});

export const mastra = new Mastra({
  agents: {
    chefAgent,
    weatherAgent
  },
  memory,
  logger: {
    level: "info",
  },
});