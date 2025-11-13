"use client";

import { describe, it, expect } from "vitest";
import { parseAGUIEvent } from "../src/runtime/event-parser";

describe("parseAGUIEvent", () => {
  it("parses text content event", () => {
    const event = parseAGUIEvent({
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
    const event = parseAGUIEvent({ type: "TEXT_MESSAGE_CONTENT", delta: "" });
    expect(event).toBeNull();
  });

  it("falls back to RAW for unknown types", () => {
    const event = parseAGUIEvent({ type: "UNKNOWN_EVENT", foo: "bar" });
    expect(event).toEqual({
      type: "RAW",
      event: { type: "UNKNOWN_EVENT", foo: "bar" },
      source: "UNKNOWN_EVENT",
    });
  });
});
