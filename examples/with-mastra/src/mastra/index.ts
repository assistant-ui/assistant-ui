import { chatRoute } from "@mastra/ai-sdk";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { assessRolloutRisk, draftReleaseBrief } from "./tools/release-tools.js";
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
  tools: { draftReleaseBrief },
  instructions: `You are a concise release operations assistant.
Help users turn product changes into clear release notes, risk checks, and rollout plans.
Call draftReleaseBrief before writing release notes or a release announcement.
Use the conversation history when the user refers to earlier details.
Prefer short headings and concrete next actions.`,
});

const riskAnalyst = new Agent({
  id: "risk-analyst",
  name: "Risk Analyst",
  model: "openai/gpt-4o-mini",
  memory,
  tools: { assessRolloutRisk },
  instructions: `You are a skeptical but practical release risk analyst.
Call assessRolloutRisk before recommending whether a rollout should proceed.
Ask for missing persistence or rollback details instead of inventing them.
Summarize the tool result as concrete release gates.`,
});

export const mastra = new Mastra({
  storage,
  agents: { releaseAssistant, riskAnalyst },
  workflows: { releaseReviewWorkflow },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
        version: "v6",
      }),
    ],
  },
});
