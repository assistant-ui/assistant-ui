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

  it("parses legacy run finished events without an outcome", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "run-1",
    });

    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "run-1",
    });
  });

  it("preserves success run finished outcomes", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: { type: "success" },
    });

    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: { type: "success" },
    });
  });

  it("preserves interrupt run finished outcomes", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "interrupt-1",
            reason: "tool_call",
            message: "Approve search?",
            toolCallId: "call-1",
            responseSchema: {
              type: "object",
              properties: { approved: { type: "boolean" } },
            },
            expiresAt: "2026-05-05T10:00:00Z",
            metadata: { source: "test" },
          },
        ],
      },
    });

    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: "interrupt-1",
            reason: "tool_call",
            message: "Approve search?",
            toolCallId: "call-1",
            responseSchema: {
              type: "object",
              properties: { approved: { type: "boolean" } },
            },
            expiresAt: "2026-05-05T10:00:00Z",
            metadata: { source: "test" },
          },
        ],
      },
    });
  });

  it("drops malformed interrupt outcomes", () => {
    const event = parseAgUiEvent({
      type: "RUN_FINISHED",
      runId: "run-1",
      outcome: {
        type: "interrupt",
        interrupts: [{ id: "missing-reason" }],
      },
    });

    expect(event).toEqual({
      type: "RUN_FINISHED",
      runId: "run-1",
    });
  });
});
