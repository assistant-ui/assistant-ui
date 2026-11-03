"use client";

import {
  ActivityRunExample,
  type ActivityRun,
} from "@/components/demo/elements/run-activity";
import { defineStates } from "./types";

const noop = () => {};

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");
const STARTED_AT = Date.parse("2026-01-01T00:00:00.000Z");

type Part = ActivityRun["parts"][number];

const INSPECT: Part = {
  id: "commentary-1",
  kind: "commentary",
  label: "Inspecting the files",
  part: { type: "text", text: "I’ll inspect the files." },
};

const READ: Part = {
  id: "read-1",
  kind: "tool",
  label: "Reading thread.tsx",
  part: {
    type: "tool-call",
    toolCallId: "read-1",
    toolName: "read_file",
    args: { path: "thread.tsx" },
    argsText: '{"path":"thread.tsx"}',
    result: "Read thread.tsx",
  },
};

const CHECK: Part = {
  id: "commentary-2",
  kind: "commentary",
  label: "Checking the fix",
  part: { type: "text", text: "I found the issue; checking the fix." },
};

const TEST: Part = {
  id: "test-1",
  kind: "tool",
  label: "Running the tests",
  part: {
    type: "tool-call",
    toolCallId: "test-1",
    toolName: "run_command",
    args: { command: "pnpm test" },
    argsText: '{"command":"pnpm test"}',
    result: "All tests passed.",
  },
};

const ANSWER: Part = {
  id: "answer-1",
  kind: "answer",
  label: "",
  part: { type: "text", text: "The fix is ready. The tests pass." },
};

const run = (overrides: Partial<ActivityRun>): ActivityRun => ({
  id: "state-run",
  createdAt: CREATED_AT,
  status: { type: "complete", reason: "stop" },
  timing: { startedAt: STARTED_AT, completedAt: STARTED_AT + 42_000 },
  parts: [INSPECT, READ, CHECK, TEST, ANSWER],
  ...overrides,
});

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The run is still working and the summary shows its latest step.",
    Component: () => (
      <ActivityRunExample
        run={run({
          status: { type: "running" },
          timing: undefined,
          parts: [INSPECT, READ, CHECK],
        })}
      />
    ),
  },
  {
    key: "requires-action",
    label: "Needs input",
    note: "A tool call waits for approval outside the folded history.",
    Component: () => (
      <ActivityRunExample
        run={run({
          status: { type: "requires-action", reason: "tool-calls" },
          timing: undefined,
          parts: [
            INSPECT,
            READ,
            CHECK,
            {
              id: "test-1",
              kind: "tool",
              label: "Running the tests",
              part: {
                type: "tool-call",
                toolCallId: "test-1",
                toolName: "run_command",
                args: { command: "pnpm test" },
                argsText: '{"command":"pnpm test"}',
                approval: { id: "approval-1", prompt: "Run pnpm test?" },
              },
            },
          ],
        })}
        onRespondToToolApproval={noop}
      />
    ),
  },
  {
    key: "success",
    label: "Completed",
    note: "The run finished, so the history folds behind its duration and the answer stays visible.",
    Component: () => <ActivityRunExample run={run({})} />,
  },
  {
    key: "cancelled",
    label: "Stopped",
    note: "The user stopped the run before it reached an answer.",
    Component: () => (
      <ActivityRunExample
        run={run({
          status: { type: "incomplete", reason: "cancelled" },
          timing: { startedAt: STARTED_AT, completedAt: STARTED_AT + 9_000 },
          parts: [INSPECT, READ, CHECK],
        })}
      />
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "A tool call failed, so it stays visible beside the failed summary.",
    Component: () => (
      <ActivityRunExample
        run={run({
          status: {
            type: "incomplete",
            reason: "error",
            error: "run_command exited with code 1",
          },
          timing: { startedAt: STARTED_AT, completedAt: STARTED_AT + 18_000 },
          parts: [
            INSPECT,
            READ,
            CHECK,
            {
              id: "test-1",
              kind: "tool",
              label: "Running the tests",
              part: {
                type: "tool-call",
                toolCallId: "test-1",
                toolName: "run_command",
                args: { command: "pnpm test" },
                argsText: '{"command":"pnpm test"}',
                result: "1 test failed: composer clears draft after send",
                isError: true,
              },
            },
          ],
        })}
      />
    ),
  },
  {
    key: "answer-only",
    label: "Answer only",
    note: "A run with no commentary or tools has nothing to expand, only its summary and answer.",
    Component: () => <ActivityRunExample run={run({ parts: [ANSWER] })} />,
  },
]);
