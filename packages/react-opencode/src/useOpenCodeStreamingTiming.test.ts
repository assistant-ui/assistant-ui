import { describe, it, expect } from "vitest";
import type { OpenCodeThreadState } from "./types";
import {
  getLastAssistantId,
  getMessageTextLength,
  getMessageToolCallCount,
} from "./useOpenCodeStreamingTiming";

function makeState(
  overrides: Partial<{
    messageOrder: string[];
    messagesById: OpenCodeThreadState["messagesById"];
  }> = {},
): OpenCodeThreadState {
  return {
    sessionId: "ses_1",
    session: null,
    sessionStatus: null,
    loadState: { type: "ready" },
    runState: { type: "idle" },
    messageOrder: overrides.messageOrder ?? [],
    messagesById: overrides.messagesById ?? {},
    pendingUserMessages: {},
    interactions: {
      permissions: { pending: {}, resolved: {} },
      questions: { pending: {}, answered: {}, rejected: {} },
    },
    unhandledEvents: [],
    sync: {},
  } as OpenCodeThreadState;
}

function msg(
  id: string,
  parts: { type: string; text?: string }[],
): OpenCodeThreadState["messagesById"][string] {
  return {
    id,
    info: { id, role: "assistant" } as never,
    parts: parts as never,
    shadowParts: undefined,
  };
}

describe("getLastAssistantId", () => {
  it("returns undefined for empty state", () => {
    expect(getLastAssistantId(makeState())).toBeUndefined();
  });

  it("returns the last assistant message id", () => {
    const state = makeState({
      messageOrder: ["a", "b"],
      messagesById: {
        a: msg("a", [{ type: "text", text: "first" }]),
        b: msg("b", [{ type: "text", text: "second" }]),
      },
    });
    expect(getLastAssistantId(state)).toBe("b");
  });

  it("skips message ids not present in messagesById", () => {
    const state = makeState({
      messageOrder: ["a", "ghost"],
      messagesById: {
        a: msg("a", [{ type: "text", text: "hi" }]),
      },
    });
    expect(getLastAssistantId(state)).toBe("a");
  });

  it("does not bleed from prior messages into active id lookup", () => {
    const state = makeState({
      messageOrder: ["prior", "active"],
      messagesById: {
        prior: msg("prior", [{ type: "text", text: "old" }]),
        active: msg("active", [{ type: "text", text: "" }]),
      },
    });
    expect(getLastAssistantId(state)).toBe("active");
  });
});

describe("getMessageTextLength", () => {
  it("returns 0 for unknown message", () => {
    expect(getMessageTextLength(makeState(), "missing")).toBe(0);
  });

  it("sums text parts", () => {
    const state = makeState({
      messageOrder: ["m"],
      messagesById: { m: msg("m", [{ type: "text", text: "hello" }]) },
    });
    expect(getMessageTextLength(state, "m")).toBe(5);
  });

  it("sums text and reasoning parts", () => {
    const state = makeState({
      messageOrder: ["m"],
      messagesById: {
        m: msg("m", [
          { type: "text", text: "hello" },
          { type: "reasoning", text: "think" },
        ]),
      },
    });
    expect(getMessageTextLength(state, "m")).toBe(10);
  });

  it("ignores tool parts", () => {
    const state = makeState({
      messageOrder: ["m"],
      messagesById: { m: msg("m", [{ type: "tool" }]) },
    });
    expect(getMessageTextLength(state, "m")).toBe(0);
  });
});

describe("getMessageToolCallCount", () => {
  it("returns 0 for unknown message", () => {
    expect(getMessageToolCallCount(makeState(), "missing")).toBe(0);
  });

  it("counts tool parts", () => {
    const state = makeState({
      messageOrder: ["m"],
      messagesById: {
        m: msg("m", [
          { type: "text", text: "result" },
          { type: "tool" },
          { type: "tool" },
        ]),
      },
    });
    expect(getMessageToolCallCount(state, "m")).toBe(2);
  });

  it("returns 0 when no tool parts", () => {
    const state = makeState({
      messageOrder: ["m"],
      messagesById: { m: msg("m", [{ type: "text", text: "hi" }]) },
    });
    expect(getMessageToolCallCount(state, "m")).toBe(0);
  });
});
