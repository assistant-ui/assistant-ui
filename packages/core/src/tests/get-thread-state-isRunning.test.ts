import { describe, expect, it } from "vitest";
import { getThreadState } from "../runtime/api/thread-runtime";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type { ThreadMessage } from "../types/message";

const baseRuntime = (
  overrides: Partial<ThreadRuntimeCore>,
): ThreadRuntimeCore =>
  ({
    messages: [],
    isDisabled: false,
    isLoading: false,
    capabilities: {} as any,
    state: null,
    suggestions: [],
    extras: undefined,
    speech: undefined,
    voice: undefined,
    ...overrides,
  }) as unknown as ThreadRuntimeCore;

const userMessage: ThreadMessage = {
  id: "u1",
  role: "user",
  content: [],
  createdAt: new Date(),
  attachments: [],
  metadata: { custom: {} },
} as unknown as ThreadMessage;

const completeAssistant: ThreadMessage = {
  id: "a1",
  role: "assistant",
  content: [],
  createdAt: new Date(),
  status: { type: "complete", reason: "stop" },
  metadata: { unstable_state: null, custom: {}, steps: [] },
} as unknown as ThreadMessage;

const runningAssistant: ThreadMessage = {
  ...completeAssistant,
  id: "a2",
  status: { type: "running" },
} as unknown as ThreadMessage;

describe("getThreadState.isRunning", () => {
  it("falls back to last-message heuristic when runtime.isRunning is undefined", () => {
    expect(
      getThreadState(baseRuntime({ messages: [runningAssistant] })).isRunning,
    ).toBe(true);

    expect(
      getThreadState(baseRuntime({ messages: [completeAssistant] })).isRunning,
    ).toBe(false);

    expect(
      getThreadState(baseRuntime({ messages: [userMessage] })).isRunning,
    ).toBe(false);
  });

  it("prefers explicit runtime.isRunning=true even when last message is complete", () => {
    expect(
      getThreadState(
        baseRuntime({ isRunning: true, messages: [completeAssistant] }),
      ).isRunning,
    ).toBe(true);
  });

  it("prefers explicit runtime.isRunning=true when last message is a user message", () => {
    expect(
      getThreadState(baseRuntime({ isRunning: true, messages: [userMessage] }))
        .isRunning,
    ).toBe(true);
  });

  it("prefers explicit runtime.isRunning=false even when last message is running", () => {
    expect(
      getThreadState(
        baseRuntime({ isRunning: false, messages: [runningAssistant] }),
      ).isRunning,
    ).toBe(false);
  });
});
