import { describe, expect, it } from "vitest";
import {
  collectTraceStats,
  derivePhase,
  pluralize,
  summarizeTraceStats,
  traceHasIncomplete,
  traceHasRunning,
  type TraceNode,
} from "./model";

describe("pluralize", () => {
  it("selects singular/plural via Intl.PluralRules (English one/other)", () => {
    expect(pluralize(1, "step")).toBe("step");
    expect(pluralize(0, "step")).toBe("steps");
    expect(pluralize(2, "step")).toBe("steps");
    expect(pluralize(1, "source")).toBe("source");
    expect(pluralize(3, "source")).toBe("sources");
  });
});

describe("derivePhase", () => {
  it("returns 'idle' when there are no parts", () => {
    expect(
      derivePhase({
        partsLength: 0,
        isStreaming: true,
        hasRequiresAction: true,
        hasIncomplete: true,
      }),
    ).toBe("idle");
  });

  it("prefers 'requires-action' over 'running' when both apply", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: true,
        hasRequiresAction: true,
        hasIncomplete: false,
      }),
    ).toBe("requires-action");
  });

  it("returns 'running' while streaming with no requires-action signal", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: true,
        hasRequiresAction: false,
        hasIncomplete: true,
      }),
    ).toBe("running");
  });

  it("returns 'incomplete' for a stopped chain with any incomplete part", () => {
    expect(
      derivePhase({
        partsLength: 2,
        isStreaming: false,
        hasRequiresAction: false,
        hasIncomplete: true,
      }),
    ).toBe("incomplete");
  });

  it("returns 'complete' as the default terminal state", () => {
    expect(
      derivePhase({
        partsLength: 3,
        isStreaming: false,
        hasRequiresAction: false,
        hasIncomplete: false,
      }),
    ).toBe("complete");
  });
});

describe("trace summaries", () => {
  it("summarizes incomplete trace stats without implying success", () => {
    expect(
      summarizeTraceStats(
        { totalSteps: 2, searchSteps: 1, toolSteps: 1 },
        undefined,
        "incomplete",
      ),
    ).toBe("Stopped after 2 steps");
  });

  it("detects incomplete status in nested trace nodes", () => {
    expect(
      traceHasIncomplete([{ kind: "step", id: "pending", status: "pending" }]),
    ).toBe(false);

    expect(
      traceHasIncomplete([
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

  it("keeps a 0s duration in the summary", () => {
    expect(
      summarizeTraceStats({ totalSteps: 1, searchSteps: 0, toolSteps: 0 }, 0),
    ).toBe("Completed 1 step (0s)");
  });
});

describe("collectTraceStats", () => {
  it("counts search and non-search tools disjointly and ignores groups", () => {
    const trace: TraceNode[] = [
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

    // a + d are searches; b is a tool; c is a plain step; group node itself
    // is not counted toward totalSteps.
    expect(collectTraceStats(trace)).toEqual({
      totalSteps: 4,
      searchSteps: 2,
      toolSteps: 1,
    });
  });
});

describe("traceHasRunning", () => {
  it("detects a running step nested inside groups", () => {
    expect(
      traceHasRunning([
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
  });
});
