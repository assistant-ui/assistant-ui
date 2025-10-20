import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

// Create shared memory instance for all agents
export const memory = new Memory({
  storage: new LibSQLStore({
    url: process.env["LIBSQL_URL"] || "file:./mastra.db",
  }),
  options: {
    // Recent conversation history
    lastMessages: 10,

    // Working memory - persistent user data
    workingMemory: {
      enabled: true,
      scope: "resource", // Persist across all threads for same user
    },

    // Auto-generate thread titles
    threads: {
      generateTitle: true,
    },
  },
});
