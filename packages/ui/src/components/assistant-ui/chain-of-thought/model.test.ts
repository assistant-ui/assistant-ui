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

  it("accepts an irregular plural form", () => {
    expect(pluralize(1, "query", "queries")).toBe("query");
    expect(pluralize(2, "query", "queries")).toBe("queries");
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

  it("renders the duration suffix when provided", () => {
    expect(
      summarizeTraceStats({ totalSteps: 2, searchSteps: 0, toolSteps: 0 }, 3),
    ).toBe("Completed 2 steps (3s)");
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

  it("does not double-count a single search tool as both search and tool", () => {
    expect(
      collectTraceStats([{ kind: "step", id: "s", toolName: "search_web" }]),
    ).toEqual({ totalSteps: 1, searchSteps: 1, toolSteps: 0 });
  });

  it("treats a non-search tool whose name contains 'search' substring as a search", () => {
    // Documents the substring-based heuristic: `research_topic` matches.
    expect(
      collectTraceStats([
        { kind: "step", id: "r", toolName: "research_topic" },
      ]),
    ).toEqual({ totalSteps: 1, searchSteps: 1, toolSteps: 0 });
  });
});

describe("traceHasRunning", () => {
  it("returns false when nothing is running", () => {
    expect(
      traceHasRunning([{ kind: "step", id: "a", status: "complete" }]),
    ).toBe(false);
  });

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

  it("detects a running group node itself", () => {
    expect(
      traceHasRunning([
        { kind: "group", id: "g", label: "G", status: "running", children: [] },
      ]),
    ).toBe(true);
  });

  it("detects a running step three levels deep (recursion has no depth cap)", () => {
    // Phase detection must see all nodes regardless of the render-time maxDepth
    // that collapses deep groups — a running grandchild still reports running.
    expect(
      traceHasRunning([
        {
          kind: "group",
          id: "g1",
          label: "L0",
          children: [
            {
              kind: "group",
              id: "g2",
              label: "L1",
              children: [
                {
                  kind: "group",
                  id: "g3",
                  label: "L2",
                  children: [{ kind: "step", id: "deep", status: "running" }],
                },
              ],
            },
          ],
        },
      ]),
    ).toBe(true);
  });
});
