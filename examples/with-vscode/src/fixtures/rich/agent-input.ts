import { defineFixtures, type FixtureStep } from "../types";
import { RUN_JOB_TOOL, type RunJobResult } from "./agent-run";

/** Human tools rendered in `webview/fixture-ui/agent-input.tsx`; each waits for the user. */
export const ASK_QUESTIONS_TOOL = "ask_questions";
export const REQUEST_INPUT_TOOL = "request_input";
export const REQUEST_PERMISSION_TOOL = "request_permission";
export const CHOOSE_OPTION_TOOL = "choose_option";

type Option = { id: string; label: string; description?: string };

export type AskQuestionsArgs = {
  steps: {
    id: string;
    question: string;
    description?: string;
    selectionMode?: "single" | "multiple";
    options: Option[];
  }[];
};
export type AskQuestionsResult = Record<string, string[]>;
export type RequestInputArgs = {
  server: string;
  message: string;
  fields: {
    name: string;
    label: string;
    value: string;
    kind: "text" | "choice" | "toggle";
    options?: string[];
    required?: boolean;
  }[];
};
export type RequestInputResult = { action: "accept" | "decline" };
export type RequestPermissionArgs = {
  capability: string;
  requester: string;
  reach: string[];
};
export type RequestPermissionResult = {
  scope: "session" | "always" | "denied";
};
export type ChooseOptionArgs = {
  question: string;
  selectionMode: "single" | "multiple";
  options: Option[];
};
export type ChooseOptionResult = { ids: string[] };

const QUESTIONS_ID = "interview-questions";
const INPUT_ID = "interview-input";
const PERMISSION_ID = "interview-permission";
const CHOOSE_ID = "choose-checks";

const QUESTIONS: AskQuestionsArgs = {
  steps: [
    {
      id: "audience",
      question: "Who should receive the release notes?",
      options: [
        { id: "team", label: "The project team" },
        { id: "users", label: "Every user" },
      ],
    },
    {
      id: "sections",
      question: "What should the notes cover?",
      description: "Choose everything that belongs in them.",
      selectionMode: "multiple",
      options: [
        { id: "features", label: "New features" },
        { id: "fixes", label: "Fixes" },
        { id: "breaking", label: "Breaking changes" },
      ],
    },
  ],
};

const labelOf = (id: string) =>
  QUESTIONS.steps
    .flatMap((step) => step.options)
    .find((option) => option.id === id)?.label ?? id;

export default defineFixtures([
  {
    name: "interview",
    description:
      "Question flow, elicitation form and permission grant, each answered before the run continues",
    prompt: "interview Publish the release notes",
    script: ({ toolResults }): FixtureStep[] => {
      if (!toolResults.has(QUESTIONS_ID)) {
        return [
          { type: "text", text: "A few questions before I draft the notes." },
          {
            type: "tool-call",
            toolCallId: QUESTIONS_ID,
            toolName: ASK_QUESTIONS_TOOL,
            args: QUESTIONS,
          },
        ];
      }
      const answers = toolResults.get(QUESTIONS_ID) as AskQuestionsResult;
      if (!toolResults.has(INPUT_ID)) {
        const picked = Object.values(answers).flat().map(labelOf);
        return [
          {
            type: "text",
            text: `Drafting for ${picked.join(", ") || "nobody"}. The GitHub server needs a target first.`,
          },
          {
            type: "tool-call",
            toolCallId: INPUT_ID,
            toolName: REQUEST_INPUT_TOOL,
            args: {
              server: "github-mcp",
              message: "Confirm where the release notes should be published.",
              fields: [
                {
                  name: "repo",
                  label: "Repository",
                  value: "assistant-ui/assistant-ui",
                  kind: "text",
                  required: true,
                },
                {
                  name: "visibility",
                  label: "Visibility",
                  value: "Public",
                  kind: "choice",
                  options: ["Public", "Draft"],
                },
                {
                  name: "notify",
                  label: "Notify watchers",
                  value: "true",
                  kind: "toggle",
                },
              ],
            } satisfies RequestInputArgs,
          },
        ];
      }
      const input = toolResults.get(INPUT_ID) as RequestInputResult;
      if (input.action === "decline") {
        return [
          { type: "text", text: "Declined. The notes stay a local draft." },
        ];
      }
      if (!toolResults.has(PERMISSION_ID)) {
        return [
          {
            type: "text",
            text: "Publishing needs write access to the repository.",
          },
          {
            type: "tool-call",
            toolCallId: PERMISSION_ID,
            toolName: REQUEST_PERMISSION_TOOL,
            args: {
              capability: "Repository write access",
              requester: "github-mcp",
              reach: [
                "Create a release on assistant-ui/assistant-ui",
                "Notify the repository's watchers",
              ],
            } satisfies RequestPermissionArgs,
          },
        ];
      }
      const { scope } = toolResults.get(
        PERMISSION_ID,
      ) as RequestPermissionResult;
      if (scope === "denied") {
        return [
          { type: "text", text: "Permission denied. Nothing was published." },
        ];
      }
      return [
        {
          type: "tool-call",
          toolCallId: "interview-publish",
          toolName: RUN_JOB_TOOL,
          args: { title: "Publish the release notes" },
          result: {
            status: "success",
            summary: "Release v0.14.0 published; 214 watchers notified.",
            elapsedMs: 8_000,
          } satisfies RunJobResult,
        },
        {
          type: "text",
          text: `Published with access granted for ${scope === "always" ? "every session" : "this session"}.`,
        },
      ];
    },
  },
  {
    name: "choose",
    description: "Option list the user answers before the run continues",
    prompt: "choose Pick the checks to run",
    script: ({ toolResults }): FixtureStep[] => {
      if (!toolResults.has(CHOOSE_ID)) {
        return [
          {
            type: "tool-call",
            toolCallId: CHOOSE_ID,
            toolName: CHOOSE_OPTION_TOOL,
            args: {
              question: "Which checks should run before the deploy?",
              selectionMode: "multiple",
              options: [
                { id: "typecheck", label: "Typecheck" },
                {
                  id: "unit",
                  label: "Unit tests",
                  description: "About 40 seconds.",
                },
                {
                  id: "e2e",
                  label: "End-to-end tests",
                  description: "About 6 minutes.",
                },
              ],
            } satisfies ChooseOptionArgs,
          },
        ];
      }
      const { ids } = toolResults.get(CHOOSE_ID) as ChooseOptionResult;
      return [
        {
          type: "text",
          text: `Running ${ids.length} check${ids.length === 1 ? "" : "s"}: ${ids.join(", ")}.`,
        },
      ];
    },
  },
]);
