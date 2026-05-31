import { describe, expect, it } from "vitest";
import {
  agentTraceHasIncomplete,
  agentTraceHasRunning,
  collectAgentTraceStats,
  pluralize,
  summarizeAgentTraceStats,
  type AgentTraceNode,
} from "./model";
import {
  getAgentTraceStepLabel,
  getLatestAgentTraceStep,
  mapAgentTraceStatusToStepStatus,
} from "./shared";

describe("AgentTrace model", () => {
  it("summarizes trace stats without implying success for incomplete traces", () => {
    expect(pluralize(1, "step")).toBe("step");
    expect(pluralize(2, "step")).toBe("steps");
    expect(
      summarizeAgentTraceStats(
        { totalSteps: 2, searchSteps: 1, toolSteps: 1 },
        undefined,
        "incomplete",
      ),
    ).toBe("Stopped after 2 steps");
    expect(
      summarizeAgentTraceStats(
        { totalSteps: 1, searchSteps: 0, toolSteps: 0 },
        0,
      ),
    ).toBe("Completed 1 step (0s)");
  });

  it("counts nested search and tool steps", () => {
    const trace: AgentTraceNode[] = [
      { kind: "step", id: "a", type: "search", toolName: "search_web" },
      { kind: "step", id: "b", type: "tool", toolName: "run_code" },
      { kind: "step", id: "c", type: "default" },
      {
        kind: "group",
        id: "g",
        label: "Group",
        children: [
          { kind: "step", id: "d", type: "web_search", toolName: "web_search" },
        ],
      },
    ];

    expect(collectAgentTraceStats(trace)).toEqual({
      totalSteps: 4,
      searchSteps: 2,
      toolSteps: 1,
    });
  });

  it("detects nested running and incomplete states", () => {
    expect(
      agentTraceHasRunning([
        {
          kind: "group",
          id: "g1",
          label: "Outer",
          children: [
            {
              kind: "group",
              id: "g2",
              label: "Inner",
              children: [{ kind: "step", id: "live", status: "running" }],
            },
          ],
        },
      ]),
    ).toBe(true);

    expect(
      agentTraceHasIncomplete([
        {
          kind: "group",
          id: "group",
          label: "Group",
          children: [
            { kind: "step", id: "pending", status: "pending" },
            { kind: "step", id: "failed", status: "incomplete" },
          ],
        },
      ]),
    ).toBe(true);
  });

  it("finds latest nested steps and maps status for ChainOfThought primitives", () => {
    const nested: AgentTraceNode = {
      kind: "group",
      id: "g-1",
      label: "Group",
      children: [
        { kind: "step", id: "s-1", label: "First" },
        {
          kind: "group",
          id: "g-2",
          label: "Nested",
          children: [{ kind: "step", id: "s-2", toolName: "search_web" }],
        },
      ],
    };

    const latest = getLatestAgentTraceStep(nested);
    expect(latest?.id).toBe("s-2");
    expect(latest ? getAgentTraceStepLabel(latest) : undefined).toBe(
      "Tool: search_web",
    );
    expect(mapAgentTraceStatusToStepStatus("running")).toBe("active");
    expect(mapAgentTraceStatusToStepStatus("incomplete")).toBe("error");
  });
});
