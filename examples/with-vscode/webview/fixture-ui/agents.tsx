import { AgentPlan } from "@assistant-ui/ui/components/assistant-ui/elements/agent-plan.tsx";
import { ApprovalCard } from "@assistant-ui/ui/components/assistant-ui/elements/approval-card.tsx";
import type {
  DataMessagePartComponent,
  ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  PLAN_DATA,
  RUN_COMMAND_TOOL,
  type PlanData,
  type RunCommandArgs,
  type RunCommandResult,
} from "../../src/fixtures/rich/agents";
import { defineFixtureUI } from "../define-fixture-ui";

const RunCommand: ToolCallMessagePartComponent<
  RunCommandArgs,
  RunCommandResult
> = ({ args, result }) => (
  <ApprovalCard
    className="my-2"
    state={result === undefined ? "running" : "done"}
    command={args.command}
    title="Run command"
    subtitle="The agent ran a shell command"
    details={
      result
        ? [
            { label: "Exit code", value: String(result.exitCode) },
            { label: "Output", value: result.output },
          ]
        : undefined
    }
  />
);

const Plan: DataMessagePartComponent<PlanData> = ({ data }) => (
  <AgentPlan
    className="my-2"
    title="Plan"
    steps={data.steps}
    activeIndex={data.activeIndex}
  />
);

export default defineFixtureUI({
  tools: {
    // Standalone keeps the card out of the collapsed tool-call group.
    [RUN_COMMAND_TOOL]: {
      type: "backend",
      display: "standalone",
      render: RunCommand,
    },
  },
  dataUIs: [{ name: PLAN_DATA, render: Plan }],
});
