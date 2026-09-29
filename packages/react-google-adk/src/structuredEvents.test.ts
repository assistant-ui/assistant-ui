import { describe, expect, it } from "vitest";
import { toAdkStructuredEvents } from "./structuredEvents";
import type { AdkEvent } from "./types";

const makeEvent = (overrides: Partial<AdkEvent> = {}): AdkEvent => ({
  id: "evt-1",
  ...overrides,
});

describe("toAdkStructuredEvents", () => {
  it("converts a function call with args", () => {
    expect(
      toAdkStructuredEvents(
        makeEvent({
          author: "agent",
          content: {
            role: "model",
            parts: [
              {
                functionCall: { name: "search", id: "tc-1", args: { q: "x" } },
              },
            ],
          },
        }),
      ),
    ).toEqual([
      {
        type: "tool_call",
        call: { name: "search", id: "tc-1", args: { q: "x" } },
      },
    ]);
  });

  it("defaults a function call without args to empty args", () => {
    expect(
      toAdkStructuredEvents(
        makeEvent({
          author: "agent",
          content: {
            role: "model",
            parts: [{ functionCall: { name: "search", id: "tc-1" } }],
          },
        }),
      ),
    ).toEqual([
      { type: "tool_call", call: { name: "search", id: "tc-1", args: {} } },
    ]);
  });

  it("keeps the other parts of an event carrying a call without args", () => {
    expect(
      toAdkStructuredEvents(
        makeEvent({
          author: "agent",
          content: {
            role: "model",
            parts: [
              { functionCall: { name: "search" } },
              { text: "still here" },
            ],
          },
        }),
      ),
    ).toEqual([
      { type: "tool_call", call: { name: "search", args: {} } },
      { type: "content", content: "still here" },
    ]);
  });
});
