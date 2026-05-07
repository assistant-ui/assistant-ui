"use client";

import { describe, it, expect } from "vitest";
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

  it("passes RUN_FINISHED through with no outcome (legacy)", () => {
    const event = parseAgUiEvent({ type: "RUN_FINISHED", runId: "r1" });
    expect(event).toEqual({ type: "RUN_FINISHED", runId: "r1" });
  });

  it("parses RUN_FINISHED success outcome including result", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
      result: { ok: true },
    });
    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "r1",
      outcome: { type: "success" },
      result: { ok: true },
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
});
