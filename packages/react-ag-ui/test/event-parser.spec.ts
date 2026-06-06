"use client";

import { describe, it, expect, vi } from "vitest";
import { parseAgUiEvent } from "../src/runtime/event-parser";

describe("parseAgUiEvent", () => {
  it("parses text content event", () => {
    const event = parseAgUiEvent({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
    });
    expect(event).toEqual({
      type: "TEXT_MESSAGE_CONTENT",
      messageId: "m1",
      delta: "hi",
    });
  });

  it("guards against invalid events", () => {
    const event = parseAgUiEvent({ type: "TEXT_MESSAGE_CONTENT", delta: "" });
    expect(event).toBeNull();
  });

  it("parses reasoning content with optional message id", () => {
    const event = parseAgUiEvent({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "chain of thought",
    });
    expect(event).toEqual({
      type: "REASONING_MESSAGE_CONTENT",
      messageId: "m-reason",
      delta: "chain of thought",
    });
  });

  it("falls back to RAW for unknown types", () => {
    const event = parseAgUiEvent({ type: "UNKNOWN_EVENT", foo: "bar" });
    expect(event).toEqual({
      type: "RAW",
      event: { type: "UNKNOWN_EVENT", foo: "bar" },
      source: "UNKNOWN_EVENT",
    });
  });

  it("parses ACTIVITY_SNAPSHOT events", () => {
    const event = parseAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "m1",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
      replace: true,
    });
    expect(event).toEqual({
      type: "ACTIVITY_SNAPSHOT",
      messageId: "m1",
      activityType: "mcp-apps",
      content: {
        resourceUri: "ui://srv/mcp-app.html",
        toolInput: { city: "sf" },
      },
      replace: true,
    });
  });

  it("guards against ACTIVITY_SNAPSHOT missing activityType or content", () => {
    expect(
      parseAgUiEvent({ type: "ACTIVITY_SNAPSHOT", content: {} }),
    ).toBeNull();
    expect(
      parseAgUiEvent({ type: "ACTIVITY_SNAPSHOT", activityType: "mcp-apps" }),
    ).toBeNull();
  });

  it("passes RUN_FINISHED through with no outcome (legacy)", () => {
    const event = parseAgUiEvent({ type: "RUN_FINISHED", runId: "r1" });
    expect(event).toEqual({ type: "RUN_FINISHED", runId: "r1" });
  });

  it("parses RUN_FINISHED success outcome", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
    });
    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
    });
  });

  it("parses RUN_FINISHED interrupt outcome with interrupts", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "int-1",
            reason: "tool_call",
            message: "approve?",
            toolCallId: "call-1",
            responseSchema: { type: "object" },
            metadata: { foo: "bar" },
          },
        ],
      },
    });
    expect(event).toMatchObject({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "int-1",
            reason: "tool_call",
            message: "approve?",
            toolCallId: "call-1",
            responseSchema: { type: "object" },
            metadata: { foo: "bar" },
          },
        ],
      },
    });
  });

  it("drops malformed interrupt outcomes (no interrupts)", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "interrupt", interrupts: [] },
    });
    expect(event).toEqual({ type: "RUN_FINISHED", runId: "r1" });
  });

  it("logs a debug entry when interrupt outcome falls back silently", () => {
    const debug = vi.fn();
    parseAgUiEvent(
      {
        type: "RUN_FINISHED",
        runId: "r1",
        outcome: {
          type: "interrupt",
          interrupts: [{ id: "" }, { reason: "" }],
        },
      },
      { logger: { debug } as any },
    );
    expect(debug).toHaveBeenCalledTimes(1);
    expect(debug.mock.calls[0][0]).toMatch(/no valid interrupts/);
  });
});
