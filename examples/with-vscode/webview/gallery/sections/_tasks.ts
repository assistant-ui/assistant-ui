import {
  fromThreadMessageLike,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";

const transcript = (
  id: string,
  instruction: string,
  reply: ThreadMessageLike["content"],
): ThreadMessage[] => [
  fromThreadMessageLike({ role: "user", content: instruction }, `${id}-u`, {
    type: "complete",
    reason: "unknown",
  }),
  fromThreadMessageLike({ role: "assistant", content: reply }, `${id}-a`, {
    type: "complete",
    reason: "stop",
  }),
];

const minutesAgo = (minutes: number) => Date.now() - minutes * 60_000;

/**
 * Delegations with nested transcripts, as a subagent tool streams them: done,
 * failed, and one left without a result that takes the message's status
 * (running or waiting).
 */
export const taskMessages = (
  status: "running" | "requires-action",
): ThreadMessageLike[] => [
  { role: "user", content: "Add draft persistence to the composer." },
  {
    role: "assistant",
    status:
      status === "running"
        ? { type: "running" }
        : { type: "requires-action", reason: "tool-calls" },
    content: [
      { type: "text", text: "Splitting the work across three subagents." },
      {
        type: "tool-call",
        toolCallId: "task-explore",
        toolName: "delegate",
        args: {
          description: "Explore the runtime",
          subagent_type: "research",
        },
        timing: { startedAt: minutesAgo(3), completedAt: minutesAgo(2) },
        messages: transcript(
          "explore",
          "Find where the composer keeps its draft.",
          [
            {
              type: "tool-call",
              toolCallId: "explore-grep",
              toolName: "grep",
              args: { pattern: "setText" },
              result: { matches: 4 },
            },
            {
              type: "text",
              text: "The draft lives in `ComposerRuntimeCore`; nothing persists it per thread.",
            },
          ],
        ),
        result: "The draft lives in ComposerRuntimeCore and is lost on switch.",
      },
      {
        type: "tool-call",
        toolCallId: "task-types",
        toolName: "delegate",
        args: { description: "Fix composer types", subagent_type: "coder" },
        timing: { startedAt: minutesAgo(2), completedAt: minutesAgo(1) },
        messages: transcript("types", "Tighten the composer state types.", [
          { type: "text", text: "`pnpm typecheck` fails in packages/react." },
        ]),
        result: "tsc exited with code 2: 3 errors in composer.ts",
        isError: true,
      },
      {
        type: "tool-call",
        toolCallId: "task-tests",
        toolName: "delegate",
        args: {
          description: "Write regression tests for the draft store",
          subagent_type: "tester",
        },
        timing: { startedAt: minutesAgo(1) },
        messages: transcript("tests", "Cover thread switches mid-edit.", [
          {
            type: "text",
            text: "Writing `draft-store.test.ts` with three cases.",
          },
        ]),
      },
    ],
  },
];
