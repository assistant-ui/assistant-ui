import { describe, expect, it } from "vitest";
import {
  defaultInferStep,
  getLatestTraceStep,
  getTraceStepLabel,
  groupMessagePartsByParentId,
  traceFromMessageParts,
} from "./trace-shared";
import type { TraceNode, TraceStep } from "../chain-of-thought";

describe("trace-shared", () => {
  it("groups message parts by parentId while preserving first-seen order", () => {
    const groups = groupMessagePartsByParentId([
      { type: "text", parentId: "alpha" },
      { type: "text" },
      { type: "tool-call", parentId: "alpha" },
      { type: "text", parentId: "beta" },
      { type: "text" },
    ]);

    expect(groups).toEqual([
      { groupKey: "alpha", indices: [0, 2] },
      { groupKey: undefined, indices: [1] },
      { groupKey: "beta", indices: [3] },
      { groupKey: undefined, indices: [4] },
    ]);
  });

  it("creates trace steps from message parts with default inference", () => {
    const trace = traceFromMessageParts([
      {
        type: "tool-call",
        toolName: "search_web",
        status: { type: "running" },
      },
    ]);

    expect(trace).toHaveLength(1);
    expect(trace[0]).toMatchObject({
      kind: "step",
      type: "search",
      toolName: "search_web",
      id: "__step_0",
      label: "Tool: search_web",
      status: "running",
    });
  });

  it("marks default-inferred incomplete message part groups as incomplete", () => {
    const trace = traceFromMessageParts([
      {
        type: "tool-call",
        toolName: "search_web",
        status: { type: "incomplete", reason: "error" },
      },
    ]);

    expect(trace[0]).toMatchObject({
      kind: "step",
      status: "incomplete",
    });
  });

  it("supports custom grouping and inferStep mapping", () => {
    const trace = traceFromMessageParts(
      [
        { type: "text", text: "A", status: { type: "running" } },
        { type: "text", text: "B" },
      ],
      {
        groupingFunction: () => [{ groupKey: "group-1", indices: [0, 1] }],
        inferStep: ({ isActive }) => ({
          label: "Custom",
          type: "code",
          status: isActive ? "active" : "complete",
        }),
      },
    );

    expect(trace).toEqual([
      {
        kind: "step",
        id: "group-1",
        label: "Custom",
        type: "code",
        status: "running",
      },
    ]);
  });

  it("preserves custom inferStep pending status and visual metadata", () => {
    const trace = traceFromMessageParts([{ type: "text", text: "A" }], {
      inferStep: () => ({
        label: "Queued",
        status: "pending",
        stepLabel: 2,
        icon: "custom-icon",
      }),
    });

    expect(trace).toEqual([
      {
        kind: "step",
        id: "__step_0",
        label: "Queued",
        status: "pending",
        stepLabel: 2,
        icon: "custom-icon",
      },
    ]);
  });

  it("finds the latest step in nested trace nodes", () => {
    const nested: TraceNode = {
      kind: "group",
      id: "g-1",
      label: "Group",
      children: [
        { kind: "step", id: "s-1", label: "First" },
        {
          kind: "group",
          id: "g-2",
          label: "Nested",
          children: [{ kind: "step", id: "s-2", label: "Second" }],
        },
      ],
    } as TraceNode;

    const latest = getLatestTraceStep(nested);
    expect(latest?.id).toBe("s-2");
  });

  it("resolves step labels and default inference behavior", () => {
    const explicit: TraceStep = {
      kind: "step",
      id: "s-explicit",
      label: "Explicit",
    };
    const toolFallback: TraceStep = {
      kind: "step",
      id: "s-tool",
      toolName: "search_web",
    };
    const empty: TraceStep = { kind: "step", id: "s-empty" };

    expect(getTraceStepLabel(explicit)).toBe("Explicit");
    expect(getTraceStepLabel(toolFallback)).toBe("Tool: search_web");
    expect(getTraceStepLabel(empty)).toBeUndefined();

    expect(
      defaultInferStep({
        groupKey: undefined,
        indices: [0],
        parts: [{ type: "text", text: "hello" }],
        isActive: false,
      }),
    ).toEqual({ type: "default" });
    expect(
      defaultInferStep({
        groupKey: undefined,
        indices: [0],
        parts: [{ type: "text", text: "hello", status: { type: "running" } }],
        isActive: true,
      }),
    ).toEqual({ type: "default", status: "active" });
  });
});
