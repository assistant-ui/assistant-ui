import { describe, expect, it } from "vitest";
import { shouldContinue } from "../legacy-runtime/runtime-cores/local/shouldContinue";
import type { ThreadAssistantMessage } from "../types";

const makeMessage = (
  overrides: Partial<ThreadAssistantMessage>,
): ThreadAssistantMessage => ({
  id: "msg-1",
  role: "assistant",
  createdAt: new Date(),
  content: [],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
  ...overrides,
});

const toolCall = (toolName: string, result?: unknown) => ({
  type: "tool-call" as const,
  toolCallId: `call-${toolName}`,
  toolName,
  args: {},
  argsText: "{}",
  ...(result !== undefined ? { result } : {}),
});

describe("shouldContinue", () => {
  it("returns false when status is not requires-action", () => {
    const msg = makeMessage({
      status: { type: "complete", reason: "stop" },
    });
    expect(shouldContinue(msg, undefined)).toBe(false);
  });

  it("returns false when reason is not tool-calls", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "interrupt" },
    });
    expect(shouldContinue(msg, undefined)).toBe(false);
  });

  it("returns true when all tool calls have results (no humanToolNames)", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [toolCall("search", "found it"), toolCall("calculate", 42)],
    });
    expect(shouldContinue(msg, undefined)).toBe(true);
  });

  it("returns false when some tool calls have no result (no humanToolNames)", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [toolCall("search", "found it"), toolCall("calculate")],
    });
    expect(shouldContinue(msg, undefined)).toBe(false);
  });

  it("returns true when unresolved tool call is not a human tool", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [toolCall("auto-tool")],
    });
    expect(shouldContinue(msg, ["human-approval"])).toBe(true);
  });

  it("returns false when unresolved tool call IS a human tool", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [toolCall("human-approval")],
    });
    expect(shouldContinue(msg, ["human-approval"])).toBe(false);
  });

  it("returns true for non-tool-call content parts", () => {
    const msg = makeMessage({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [
        { type: "text", text: "Hello" } as any,
        toolCall("search", "done"),
      ],
    });
    expect(shouldContinue(msg, undefined)).toBe(true);
  });
});
