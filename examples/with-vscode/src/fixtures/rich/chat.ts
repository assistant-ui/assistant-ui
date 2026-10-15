import { defineFixtures } from "../types";

/** Rendered by the data UIs in `webview/fixture-ui/chat.tsx`. */
export const CHAT_FOLLOWUPS_DATA = "chat-followups";
export const CHAT_DELIVERABLES_DATA = "chat-deliverables";
export const CHAT_RETRY_DATA = "chat-retry";

export type ChatFollowupsData = { suggestions: string[] };
export type ChatDeliverablesData = {
  files: {
    id: string;
    name: string;
    size: string;
    kind: "image" | "document" | "file";
  }[];
};
export type ChatRetryData = { title: string; detail: string };

export default defineFixtures([
  {
    name: "followups",
    description: "Answer followed by suggestion pills that send a follow-up",
    prompt: "followups How should drafts persist?",
    script: () => [
      {
        type: "text",
        text: "Keep drafts in the runtime, keyed by thread id, and restore them when a thread becomes active.",
      },
      {
        type: "data",
        name: CHAT_FOLLOWUPS_DATA,
        data: {
          suggestions: [
            "Show me the diff",
            "Why not React context?",
            "Write a regression test",
          ],
        } satisfies ChatFollowupsData,
      },
    ],
  },
  {
    name: "deliverables",
    description: "Answer that hands back generated files as attachment tiles",
    prompt: "deliverables Export the report",
    script: () => [
      { type: "text", text: "The report is ready in three formats." },
      {
        type: "data",
        name: CHAT_DELIVERABLES_DATA,
        data: {
          files: [
            {
              id: "chart",
              name: "usage-chart.png",
              size: "212 KB",
              kind: "image",
            },
            {
              id: "report",
              name: "weekly-report.pdf",
              size: "1.4 MB",
              kind: "document",
            },
            {
              id: "raw",
              name: "usage-2026-09.csv",
              size: "88 KB",
              kind: "file",
            },
          ],
        } satisfies ChatDeliverablesData,
      },
    ],
  },
  {
    name: "retry",
    description: "Partial answer with an error card that regenerates the reply",
    prompt: "retry Summarize the whole repository",
    script: () => [
      { type: "text", text: "The repository has three layers:" },
      {
        type: "data",
        name: CHAT_RETRY_DATA,
        data: {
          title: "Generation stopped",
          detail: "The model hit the output limit after 4,096 tokens.",
        } satisfies ChatRetryData,
      },
    ],
  },
]);
