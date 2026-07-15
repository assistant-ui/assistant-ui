import { chatRoute } from "@mastra/ai-sdk";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { releaseReviewWorkflow } from "./workflows/release-review.js";

const storage = new LibSQLStore({
  id: "assistant-ui-mastra-example",
  url: "file:./mastra.db",
});

const memory = new Memory({
  storage,
  options: {
    lastMessages: 20,
  },
});

const releaseAssistant = new Agent({
  id: "release-assistant",
  name: "Release Assistant",
  model: "openai/gpt-4o-mini",
  memory,
  instructions: `You are a concise release operations assistant.
Help users turn product changes into clear release notes, risk checks, and rollout plans.
Use the conversation history when the user refers to earlier details.
Prefer short headings and concrete next actions.`,
});

export const mastra = new Mastra({
  storage,
  agents: { releaseAssistant },
  workflows: { releaseReviewWorkflow },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat",
        agent: "releaseAssistant",
        version: "v6",
      }),
    ],
  },
});
