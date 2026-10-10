import { defineFixtures, type FixtureStep } from "../types";
import { PLAN_DATA, RUN_COMMAND_TOOL, type PlanData } from "./agents";

/** Tool UIs registered in `webview/fixture-ui/agent-run.tsx`. */
export const WEB_FETCH_TOOL = "web_fetch";
export const FETCH_ISSUE_TOOL = "fetch_issue";
export const DELEGATE_TOOL = "delegate";
export const RUN_JOB_TOOL = "run_job";
export const COMPUTER_TOOL = "computer";
/** The frontend tool `JSONGenerativeUI.present()` builds. */
export const PRESENT_TOOL = "present";

/** Data UIs registered in `webview/fixture-ui/agent-run.tsx`. */
export const TIMELINE_DATA = "timeline";
export const SUBAGENTS_DATA = "subagents";
export const HANDOFF_DATA = "handoff";
export const TODOS_DATA = "todos";
export const TRACE_DATA = "trace";
export const CHECKPOINTS_DATA = "checkpoints";
export const MEMORY_DATA = "memory";
export const CLAIMS_DATA = "claims";
export const ARTIFACT_DATA = "artifact";
export const COST_DATA = "cost";
export const CONTEXT_DATA = "context";
export const GUARDRAIL_DATA = "guardrail";

export type WebFetchArgs = { url: string };
export type WebFetchResult = { summary: string };
export type FetchIssueArgs = {
  url: string;
  attempt: number;
  maxAttempts: number;
};
export type DelegateArgs = { description: string; subagent_type: string };
export type RunJobArgs = { title: string };
export type RunJobResult = {
  status: "success" | "partial" | "failed" | "cancelled";
  summary: string;
  elapsedMs: number;
};
export type ComputerArgs = {
  url: string;
  steps: { id: string; action: string; target: string; x: number; y: number }[];
};
export type TimelineData = {
  steps: {
    verb: string;
    chip: string;
    kind: "think" | "read" | "run" | "edit";
  }[];
  stats: { file: string; added?: number; removed?: number }[];
  label: string;
};
export type SubagentsData = {
  agents: { name: string; model: string }[];
  completedCount: number;
  progress: number[];
};
export type HandoffData = {
  from: string;
  to: string;
  reason: string;
  carried: string[];
};
export type TodosData = {
  revision: number;
  items: {
    id: string;
    text: string;
    status: "pending" | "active" | "done" | "failed" | "cancelled";
    reason?: string;
  }[];
};
export type TraceData = {
  totalMs: number;
  spans: {
    id: string;
    name: string;
    depth: number;
    startMs: number;
    durationMs: number;
    status: "running" | "completed" | "failed";
  }[];
};
export type CheckpointsData = {
  currentId: string;
  checkpoints: { id: string; label: string; at: string; files: number }[];
};
export type MemoryData = {
  chips: {
    id: string;
    text: string;
    change: "added" | "updated" | "existing";
  }[];
};
export type ClaimsData = {
  claims: {
    id: string;
    text: string;
    confidence: "grounded" | "inferred" | "uncertain";
    basis: string;
  }[];
};
export type ArtifactData = { title: string; meta: string; words: number };
export type CostData = {
  runCost: string;
  sessionCost: string;
  lines: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: string;
    share: number;
  }[];
};
export type ContextData = {
  limit: number;
  segments: { label: string; tokens: number }[];
};
export type GuardrailData = {
  title: string;
  explanation: string;
  policy: string;
  alternatives: string[];
};

const todos = (
  revision: number,
  statuses: TodosData["items"][number]["status"][],
): TodosData => ({
  revision,
  items: [
    { id: "read", text: "Read the composer runtime", status: statuses[0]! },
    { id: "store", text: "Add the draft store", status: statuses[1]! },
    { id: "wire", text: "Persist drafts per thread", status: statuses[2]! },
    {
      id: "e2e",
      text: "Run the end-to-end suite",
      status: statuses[3]!,
      ...(statuses[3] === "failed" && {
        reason: "The preview deployment timed out.",
      }),
    },
    { id: "docs", text: "Update the docs", status: statuses[4]! },
  ],
});

const plan: PlanData = {
  steps: [
    "Read the composer runtime",
    "Add the draft store",
    "Persist drafts per thread",
    "Verify on CI",
    "Update the docs",
  ],
  activeIndex: 3,
};

const readCalls = (prefix: string, paths: string[]): FixtureStep[] =>
  paths.map((path, index) => ({
    type: "tool-call",
    toolCallId: `${prefix}-${index}`,
    toolName: "read_file",
    args: { path },
    result: { lines: 40 + index * 17 },
  }));

const PRESENT_CALL_ID = "present-1";

export default defineFixtures([
  {
    name: "toolcalls",
    description:
      "Tool call, tool error, grouped reads without a UI, and a tool timeline",
    prompt: "toolcalls Show every tool state",
    script: (): FixtureStep[] => [
      { type: "text", text: "Fetching the webview guide first." },
      {
        type: "tool-call",
        toolCallId: "fetch-1",
        toolName: WEB_FETCH_TOOL,
        args: {
          url: "https://code.visualstudio.com/api/extension-guides/webview",
        } satisfies WebFetchArgs,
        result: {
          summary:
            "Webviews need a CSP meta tag; scripts run only with a nonce.",
        } satisfies WebFetchResult,
      },
      {
        type: "tool-call",
        toolCallId: "issue-1",
        toolName: FETCH_ISSUE_TOOL,
        args: {
          url: "https://api.example.com/v1/issues/2291",
          attempt: 3,
          maxAttempts: 3,
        } satisfies FetchIssueArgs,
        result: "ETIMEDOUT after 30000ms",
        isError: true,
      },
      {
        type: "text",
        text: "The issue tracker timed out; reading the code instead.",
      },
      ...readCalls("read", [
        "webview/main.tsx",
        "src/webviews.ts",
        "src/fixtures/route.ts",
      ]),
      {
        type: "data",
        name: TIMELINE_DATA,
        data: {
          label: "4 steps · 2 files changed",
          steps: [
            { verb: "Thinking", chip: "where the bridge lives", kind: "think" },
            { verb: "Read", chip: "webviews.ts", kind: "read" },
            { verb: "Ran", chip: "pnpm vitest", kind: "run" },
            { verb: "Edited", chip: "route.ts", kind: "edit" },
          ],
          stats: [
            { file: "route.ts", added: 14, removed: 3 },
            { file: "webviews.ts", added: 2 },
          ],
        } satisfies TimelineData,
      },
      {
        type: "text",
        text: "`serveWebviewHost` in `src/webviews.ts` answers every `vscodeFetch` request.",
      },
    ],
  },
  {
    name: "delegate",
    description: "Subagents, task cards for delegations, and a handoff",
    prompt: "delegate Split the draft work across subagents",
    script: (): FixtureStep[] => [
      { type: "text", text: "Splitting the work across three subagents." },
      {
        type: "data",
        name: SUBAGENTS_DATA,
        data: {
          agents: [
            { name: "Explore the runtime", model: "haiku" },
            { name: "Fix composer types", model: "sonnet" },
            { name: "Write regression tests", model: "sonnet" },
          ],
          completedCount: 3,
          progress: [100, 100, 100],
        } satisfies SubagentsData,
      },
      {
        type: "tool-call",
        toolCallId: "delegate-explore",
        toolName: DELEGATE_TOOL,
        args: {
          description: "Explore the runtime",
          subagent_type: "research",
        } satisfies DelegateArgs,
        result: "The draft lives in ComposerRuntimeCore and is lost on switch.",
      },
      {
        type: "tool-call",
        toolCallId: "delegate-types",
        toolName: DELEGATE_TOOL,
        args: {
          description: "Fix composer types",
          subagent_type: "coder",
        } satisfies DelegateArgs,
        result: "tsc exited with code 2: 3 errors in composer.ts",
        isError: true,
      },
      {
        type: "tool-call",
        toolCallId: "delegate-tests",
        toolName: DELEGATE_TOOL,
        args: {
          description: "Write regression tests for the draft store",
          subagent_type: "tester",
        } satisfies DelegateArgs,
        result: "Added draft-store.test.ts with 3 passing cases.",
      },
      {
        type: "data",
        name: HANDOFF_DATA,
        data: {
          from: "Explorer",
          to: "Maintainer",
          reason:
            "The explorer found the seam; the type errors need an agent that can write and verify a patch.",
          carried: [
            "The failing typecheck output",
            "ComposerRuntimeCore as the place to persist drafts",
          ],
        } satisfies HandoffData,
      },
      {
        type: "text",
        text: "Two of three delegations finished; the maintainer takes the type errors.",
      },
    ],
  },
  {
    name: "longrun",
    description:
      "A long multi-step agent run: plan, todos, tools, job, trace, checkpoints, memory, claims, artifact, cost",
    prompt: "longrun Ship draft persistence end to end",
    script: (): FixtureStep[] => [
      {
        type: "reasoning",
        text: "Drafts must survive a thread switch. The composer already routes state through the runtime, so persisting per thread id avoids a parallel store. I will read the runtime, add the store, wire it, and verify on CI before touching the docs.",
      },
      { type: "data", name: PLAN_DATA, data: plan },
      {
        type: "data",
        name: TODOS_DATA,
        data: todos(1, ["active", "pending", "pending", "pending", "pending"]),
      },
      { type: "text", text: "Reading the composer runtime." },
      ...readCalls("long-read", [
        "packages/core/src/composer/composer-runtime-core.ts",
        "packages/core/src/composer/draft.ts",
        "packages/react/src/primitives/composer/ComposerInput.tsx",
        "packages/core/src/runtimes/local/local-thread-runtime-core.ts",
      ]),
      {
        type: "tool-call",
        toolCallId: "long-typecheck",
        toolName: RUN_COMMAND_TOOL,
        args: { command: "pnpm --filter @assistant-ui/core typecheck" },
        result: { exitCode: 0, output: "tsc --noEmit: 0 errors" },
      },
      {
        type: "tool-call",
        toolCallId: "long-computer",
        toolName: COMPUTER_TOOL,
        args: {
          url: "localhost:3000/threads/draft-demo",
          steps: [
            {
              id: "1",
              action: "type",
              target: '"half a thought"',
              x: 40,
              y: 70,
            },
            { id: "2", action: "click", target: "Second thread", x: 18, y: 30 },
            { id: "3", action: "click", target: "First thread", x: 18, y: 18 },
          ],
        } satisfies ComputerArgs,
        result: { restored: true },
      },
      {
        type: "data",
        name: TODOS_DATA,
        data: todos(2, ["done", "done", "done", "active", "pending"]),
      },
      {
        type: "tool-call",
        toolCallId: "long-job",
        toolName: RUN_JOB_TOOL,
        args: { title: "Verify draft persistence on CI" } satisfies RunJobArgs,
        result: {
          status: "partial",
          summary:
            "Build and unit tests passed. The e2e suite timed out on the preview.",
          elapsedMs: 312_000,
        } satisfies RunJobResult,
      },
      {
        type: "data",
        name: TRACE_DATA,
        data: {
          totalMs: 2400,
          spans: [
            {
              id: "run",
              name: "run",
              depth: 0,
              startMs: 0,
              durationMs: 2400,
              status: "completed",
            },
            {
              id: "m1",
              name: "chat.completions",
              depth: 1,
              startMs: 30,
              durationMs: 800,
              status: "completed",
            },
            {
              id: "t1",
              name: "read_file ×4",
              depth: 1,
              startMs: 850,
              durationMs: 240,
              status: "completed",
            },
            {
              id: "t2",
              name: "run_job",
              depth: 1,
              startMs: 1100,
              durationMs: 900,
              status: "completed",
            },
            {
              id: "t3",
              name: "e2e preview",
              depth: 2,
              startMs: 1300,
              durationMs: 700,
              status: "failed",
            },
            {
              id: "m2",
              name: "chat.completions",
              depth: 1,
              startMs: 2010,
              durationMs: 390,
              status: "completed",
            },
          ],
        } satisfies TraceData,
      },
      {
        type: "data",
        name: TODOS_DATA,
        data: todos(3, ["done", "done", "done", "failed", "done"]),
      },
      {
        type: "data",
        name: CHECKPOINTS_DATA,
        data: {
          currentId: "3",
          checkpoints: [
            { id: "1", label: "Before the draft store", at: "09:41", files: 0 },
            { id: "2", label: "Draft store added", at: "09:58", files: 3 },
            {
              id: "3",
              label: "Drafts persisted per thread",
              at: "10:12",
              files: 5,
            },
          ],
        } satisfies CheckpointsData,
      },
      {
        type: "data",
        name: MEMORY_DATA,
        data: {
          chips: [
            { id: "1", text: "Works in a pnpm monorepo", change: "existing" },
            { id: "2", text: "Wants a changeset per package", change: "added" },
            {
              id: "3",
              text: "Runs the e2e suite before merging",
              change: "updated",
            },
          ],
        } satisfies MemoryData,
      },
      {
        type: "data",
        name: CLAIMS_DATA,
        data: {
          claims: [
            {
              id: "1",
              text: "Drafts now survive a thread switch.",
              confidence: "grounded",
              basis: "computer check",
            },
            {
              id: "2",
              text: "No public API changed.",
              confidence: "inferred",
              basis: "from the diff",
            },
            {
              id: "3",
              text: "The e2e timeout is unrelated to this change.",
              confidence: "uncertain",
              basis: "not rerun",
            },
          ],
        } satisfies ClaimsData,
      },
      {
        type: "data",
        name: ARTIFACT_DATA,
        data: {
          title: "Draft persistence PR description",
          meta: "Document · v1 · just now",
          words: 312,
        } satisfies ArtifactData,
      },
      {
        type: "data",
        name: COST_DATA,
        data: {
          runCost: "$2.76",
          sessionCost: "$18.40",
          lines: [
            {
              model: "Opus 5",
              inputTokens: 48_200,
              outputTokens: 12_400,
              cost: "$1.66",
              share: 0.62,
            },
            {
              model: "Sonnet 5",
              inputTokens: 92_800,
              outputTokens: 21_100,
              cost: "$0.86",
              share: 0.29,
            },
            {
              model: "Haiku 4.5",
              inputTokens: 140_000,
              outputTokens: 8_900,
              cost: "$0.24",
              share: 0.09,
            },
          ],
        } satisfies CostData,
      },
      {
        type: "data",
        name: CONTEXT_DATA,
        data: {
          limit: 200_000,
          segments: [
            { label: "System prompt", tokens: 1_800 },
            { label: "Tools", tokens: 4_200 },
            { label: "Attached files", tokens: 38_500 },
            { label: "Conversation", tokens: 88_400 },
          ],
        } satisfies ContextData,
      },
      {
        type: "text",
        text: "Draft persistence is in: drafts survive thread switches and the unit suite passes. The e2e run timed out on the preview, so rerun it before merging.",
      },
    ],
  },
  {
    name: "guardrail",
    description: "A refusal notice with alternatives",
    prompt: "guardrail Scan a server I don't own",
    script: (): FixtureStep[] => [
      {
        type: "data",
        name: GUARDRAIL_DATA,
        data: {
          title: "I can't help with that",
          explanation:
            "This asks for a working attack against infrastructure you don't own. I can help with the defensive side of the same problem.",
          policy: "policy",
          alternatives: [
            "Explain how rate limiting defends against this",
            "Review my own service for the same weakness",
          ],
        } satisfies GuardrailData,
      },
    ],
  },
  {
    name: "present",
    description:
      "Generative UI through JSONGenerativeUI.present(), a frontend tool",
    prompt: "present Show the release status as UI",
    script: ({ toolResults }): FixtureStep[] =>
      toolResults.has(PRESENT_CALL_ID)
        ? [
            {
              type: "text",
              text: "The card above updates as the release moves.",
            },
          ]
        : [
            { type: "text", text: "Here is the release status." },
            {
              type: "tool-call",
              toolCallId: PRESENT_CALL_ID,
              toolName: PRESENT_TOOL,
              args: {
                _type: "Card",
                title: "Release 0.14",
                children: [
                  {
                    _type: "Alert",
                    tone: "warning",
                    title: "E2E timed out",
                    description:
                      "Build and unit tests passed; the preview suite needs a rerun.",
                  },
                  {
                    _type: "Row",
                    justify: "between",
                    children: [
                      { _type: "Text", value: "Packages", weight: "medium" },
                      { _type: "Badge", value: "12 ready", variant: "success" },
                    ],
                  },
                  {
                    _type: "Markdown",
                    value: "Rerun with `pnpm test:e2e --filter preview`.",
                  },
                ],
              },
            },
          ],
  },
]);
