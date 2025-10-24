import { Mastra } from "@mastra/core";
import { screeningAgent } from "./agents/screeningAgent";
import { interviewAgent } from "./agents/interviewAgent";
import { hiringWorkflow } from "./workflows/hiringWorkflow";
import { LibSQLStore } from "@mastra/libsql";

export const mastra = new Mastra({
  agents: {
    screeningAgent,
    interviewAgent,
  },
  workflows: {
    hiringWorkflow,
  },
  storage: new LibSQLStore({
    url: process.env["LIBSQL_URL"] || "file:./mastra.db",
  }),
});
