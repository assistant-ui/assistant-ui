import { defineFixtures } from "../types";

/** Rendered by the tool UI in `webview/fixture-ui/agents.tsx`. */
export const RUN_COMMAND_TOOL = "run_command";

/** Rendered by the data UI in `webview/fixture-ui/agents.tsx`. */
export const PLAN_DATA = "plan";

export type RunCommandArgs = { command: string };
export type RunCommandResult = { exitCode: number; output: string };
export type PlanData = { steps: string[]; activeIndex: number };

const plan: PlanData = {
  steps: ["Read the failing test", "Patch the route", "Re-run the suite"],
  activeIndex: 2,
};

export default defineFixtures([
  {
    name: "agent",
    description:
      "Plan data part, a tool with a registered UI, and a failing tool call",
    prompt: "agent Fix the failing test",
    script: () => [
      { type: "data", name: PLAN_DATA, data: plan },
      { type: "text", text: "Running the test suite." },
      {
        type: "tool-call",
        toolCallId: "run-1",
        toolName: RUN_COMMAND_TOOL,
        args: { command: "pnpm vitest run src/fixtures" },
        result: {
          exitCode: 0,
          output: "✓ src/fixtures/route.test.ts (4 tests)",
        } satisfies RunCommandResult,
      },
      {
        type: "tool-call",
        toolCallId: "read-1",
        toolName: "read_file",
        args: { path: "src/legacy.ts" },
        result: "ENOENT: no such file or directory, open 'src/legacy.ts'",
        isError: true,
      },
      { type: "text", text: "The suite passes; `src/legacy.ts` is gone." },
    ],
  },
]);
