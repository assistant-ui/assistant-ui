import { describe, expect, it, vi } from "vitest";
import type { ChatModelRunResult } from "@assistant-ui/core";
import { RunAggregator } from "./run-aggregator";
import type { AgUiEvent } from "../types";

const setup = () => {
  const current: ChatModelRunResult[] = [];
  const aggregator = new RunAggregator({
    showThinking: true,
    logger: { debug: vi.fn(), error: vi.fn() },
    emit: (update) => current.push(update),
    onTextMessageStart: () => {},
  });
  const send = (...events: AgUiEvent[]) => {
    for (const event of events) aggregator.handle(event);
  };
  send(
    { type: "RUN_STARTED", runId: "run" },
    {
      type: "TOOL_CALL_START",
      toolCallId: "task",
      toolCallName: "task",
    },
  );
  const toolCall = () =>
    current
      .at(-1)
      ?.content?.find(
        (part) => part.type === "tool-call" && part.toolCallId === "task",
      );
  return { send, toolCall };
};

describe("RunAggregator tool-call args while streaming", () => {
  it("publishes partially parsed args on every TOOL_CALL_ARGS delta", () => {
    const harness = setup();
    const args = () => {
      const part = harness.toolCall();
      return part && part.type === "tool-call" ? (part.args ?? {}) : undefined;
    };

    harness.send({ type: "TOOL_CALL_ARGS", toolCallId: "task", delta: '{"q"' });
    expect(args()?.q).toBeUndefined();

    harness.send({ type: "TOOL_CALL_ARGS", toolCallId: "task", delta: ":" });
    expect(args()?.q).toBeUndefined();

    harness.send({ type: "TOOL_CALL_ARGS", toolCallId: "task", delta: "1," });
    expect(args()?.q).toBe(1);

    harness.send({
      type: "TOOL_CALL_ARGS",
      toolCallId: "task",
      delta: '"name":"Jo',
    });
    expect(args()).toMatchObject({ q: 1, name: "Jo" });

    harness.send({ type: "TOOL_CALL_ARGS", toolCallId: "task", delta: '"}' });
    expect(args()).toEqual({ q: 1, name: "Jo" });
  });

  it("keeps the exact parsed args once the container closes", () => {
    const harness = setup();
    const args = () => {
      const part = harness.toolCall();
      return part && part.type === "tool-call" ? (part.args ?? {}) : undefined;
    };

    harness.send({
      type: "TOOL_CALL_ARGS",
      toolCallId: "task",
      delta: '{"q":1,"nested":{"a":[1,2],"b":null}}',
    });
    harness.send({ type: "TOOL_CALL_END", toolCallId: "task" });

    expect(args()).toEqual({ q: 1, nested: { a: [1, 2], b: null } });
  });

  it("falls back to empty args when the delta makes the container invalid", () => {
    const harness = setup();
    const args = () => {
      const part = harness.toolCall();
      return part && part.type === "tool-call" ? (part.args ?? {}) : undefined;
    };

    harness.send({
      type: "TOOL_CALL_ARGS",
      toolCallId: "task",
      delta: '{"q":1} trailing',
    });

    expect(args()).toEqual({});
  });
});
