import { describe, expect, it } from "vitest";
import {
  defaultInferStep,
  getLatestTraceStep,
  getTraceStepLabel,
  groupMessagePartsByParentId,
  mapTraceStatusToStepStatus,
  mapTraceStatusToToolBadge,
  traceFromMessageParts,
  traceFromThreadMessage,
} from "./chain-of-thought/trace-shared";
import type { ThreadMessage } from "@assistant-ui/react";
import type { TraceNode, TraceStep } from "./chain-of-thought";

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

  it("maps trace statuses to step/tool badge statuses", () => {
    expect(mapTraceStatusToStepStatus("running")).toBe("active");
    expect(mapTraceStatusToStepStatus("incomplete")).toBe("error");
    expect(mapTraceStatusToStepStatus("error")).toBe("error");
    expect(mapTraceStatusToStepStatus("complete")).toBe("complete");
    expect(mapTraceStatusToStepStatus(undefined)).toBe("complete");

    expect(mapTraceStatusToToolBadge("running")).toBe("running");
    expect(mapTraceStatusToToolBadge("incomplete")).toBe("error");
    expect(mapTraceStatusToToolBadge("error")).toBe("error");
    expect(mapTraceStatusToToolBadge("complete")).toBe("complete");
    expect(mapTraceStatusToToolBadge(undefined)).toBe("complete");
  });

  it("creates trace steps from message parts with default inference", () => {
    const trace = traceFromMessageParts([
      {
        type: "tool-call",
        toolName: "search_web",
      },
    ]);

    expect(trace).toHaveLength(1);
    expect(trace[0]).toMatchObject({
      kind: "step",
      type: "search",
      toolName: "search_web",
      id: "step-0",
      label: "Tool: search_web",
    });
  });

  it("supports custom grouping and inferStep mapping", () => {
    const trace = traceFromMessageParts(
      [
        { type: "text", text: "A" },
        { type: "text", text: "B" },
      ],
      {
        groupingFunction: () => [{ groupKey: "group-1", indices: [0, 1] }],
        inferStep: () => ({
          label: "Custom",
          type: "code",
          status: "active",
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

  it("converts thread messages to trace via message content", () => {
    const message: ThreadMessage = {
      id: "m-1",
      role: "assistant",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      content: [{ type: "tool-call", toolName: "image_search" }] as any,
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      status: { type: "complete", reason: "stop" },
    } as ThreadMessage;

    const trace = traceFromThreadMessage(message);
    expect(trace[0]).toMatchObject({
      kind: "step",
      type: "search",
      toolName: "image_search",
    });
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
  });
});
