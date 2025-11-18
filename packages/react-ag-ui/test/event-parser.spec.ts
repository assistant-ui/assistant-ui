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

  it("falls back to RAW for unknown types", () => {
    const event = parseAgUiEvent({ type: "UNKNOWN_EVENT", foo: "bar" });
    expect(event).toEqual({
      type: "RAW",
      event: { type: "UNKNOWN_EVENT", foo: "bar" },
      source: "UNKNOWN_EVENT",
    });
  });
});
