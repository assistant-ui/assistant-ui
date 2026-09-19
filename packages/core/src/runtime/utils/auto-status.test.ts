import { describe, expect, it } from "vitest";
import type { MessageStatus, ThreadMessage } from "../../types/message";
import {
  getAutoStatus,
  getContentAutoStatus,
  isBackgroundToolCall,
} from "./auto-status";

const nestedAssistantMessage = (status: MessageStatus): ThreadMessage => ({
  id: "nested-assistant",
  createdAt: new Date(0),
  role: "assistant",
  content: [],
  status,
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const pendingToolCall = (messages?: readonly ThreadMessage[]) => ({
  type: "tool-call" as const,
  toolName: "delegate",
  args: {},
  argsText: "",
  messages,
});

describe("getAutoStatus", () => {
  it("reports a cancelled message as incomplete", () => {
    expect(
      getAutoStatus(true, false, false, false, undefined, true),
    ).toMatchObject({ type: "incomplete", reason: "cancelled" });
  });

  it("keeps a cancelled message incomplete once a later message arrives", () => {
    expect(
      getAutoStatus(false, false, false, false, undefined, true),
    ).toMatchObject({ type: "incomplete", reason: "cancelled" });
  });

  it("reports an uncancelled message as complete", () => {
    expect(
      getAutoStatus(true, false, false, false, undefined, false),
    ).toMatchObject({ type: "complete", reason: "unknown" });
  });

  it.each([false, 0, ""])("preserves the falsy error payload %j", (error) => {
    expect(getAutoStatus(true, false, false, false, error)).toMatchObject({
      type: "incomplete",
      reason: "error",
      error,
    });
  });

  it("treats a null error as no error", () => {
    expect(getAutoStatus(true, false, false, false, null)).toMatchObject({
      type: "complete",
      reason: "unknown",
    });
  });

  it.each([
    ["running", { type: "running" }, true, false, false, undefined],
    [
      "an interrupted tool call",
      { type: "requires-action", reason: "interrupt" },
      false,
      true,
      true,
      undefined,
    ],
    [
      "a pending tool call",
      { type: "requires-action", reason: "tool-calls" },
      false,
      false,
      true,
      undefined,
    ],
    [
      "an error",
      { type: "incomplete", reason: "error", error: "boom" },
      false,
      false,
      false,
      "boom",
    ],
  ])(
    "keeps %s ahead of cancellation",
    (_label, expected, isRunning, interrupted, pending, error) => {
      expect(
        getAutoStatus(true, isRunning, interrupted, pending, error, true),
      ).toMatchObject(expected);
    },
  );

  it.each([true, false])(
    "keeps a background tool call running when isLast is %s",
    (isLast) => {
      expect(
        getContentAutoStatus(
          [pendingToolCall([nestedAssistantMessage({ type: "running" })])],
          isLast,
          false,
        ),
      ).toMatchObject({ type: "running" });
    },
  );

  it("reads the trailing nested message, not an earlier running one", () => {
    expect(
      isBackgroundToolCall(
        pendingToolCall([
          nestedAssistantMessage({ type: "running" }),
          nestedAssistantMessage({ type: "complete", reason: "unknown" }),
        ]),
      ),
    ).toBe(false);
  });

  it("lets cancellation clear a background tool call", () => {
    expect(
      getAutoStatus(true, false, false, true, undefined, true, true),
    ).toMatchObject({ type: "requires-action", reason: "tool-calls" });
  });

  it("keeps a settled nested tool call pending", () => {
    expect(
      getContentAutoStatus(
        [
          pendingToolCall([
            nestedAssistantMessage({ type: "complete", reason: "unknown" }),
          ]),
        ],
        true,
        false,
      ),
    ).toMatchObject({ type: "requires-action", reason: "tool-calls" });
  });

  it("keeps an interrupted tool call ahead of a background tool call", () => {
    expect(
      getContentAutoStatus(
        [
          {
            ...pendingToolCall(),
            interrupt: { type: "human", payload: {} },
          },
          pendingToolCall([nestedAssistantMessage({ type: "running" })]),
        ],
        false,
        false,
      ),
    ).toMatchObject({ type: "requires-action", reason: "interrupt" });
  });

  it.each([
    ["a result", { ...pendingToolCall(), result: {} }],
    ["no nested messages", pendingToolCall()],
    [
      "only a user nested message",
      pendingToolCall([
        {
          id: "nested-user",
          createdAt: new Date(0),
          role: "user",
          content: [],
          attachments: [],
          metadata: { custom: {} },
        },
      ]),
    ],
  ])(
    "does not treat a tool call with %s as a background call",
    (_label, call) => {
      expect(isBackgroundToolCall(call)).toBe(false);
    },
  );
});
