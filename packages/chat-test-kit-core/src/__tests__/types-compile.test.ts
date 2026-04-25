import { describe, expect, it } from "vitest";

import type {
  AbortAndRestartInjection,
  AssistantStreamTurn,
  AssistantToolCallTurn,
  CancelInjection,
  ContentPart,
  DelayTurn,
  DisconnectInjection,
  Injection,
  InterruptInjection,
  MetadataTurn,
  TextPart,
  ToolCallPart,
  ToolResultTurn,
  Transcript,
  TransportErrorInjection,
  Turn,
  UserTurn,
} from "../transcript/types";
import { TRANSCRIPT_VERSION } from "../transcript/version";

describe("transcript types", () => {
  it("TRANSCRIPT_VERSION is the string literal '0'", () => {
    expect(TRANSCRIPT_VERSION).toBe("0");
  });

  it("content part variants assign to ContentPart", () => {
    const text: TextPart = { type: "text", text: "hi" };
    const tool: ToolCallPart = {
      type: "tool-call",
      toolCallId: "tc_1",
      toolName: "x",
      args: { a: 1 },
      argsText: '{"a":1}',
    };
    const parts: ContentPart[] = [text, tool];
    expect(parts).toHaveLength(2);
  });

  it("each turn shape is a valid Turn", () => {
    const turns: Turn[] = [
      {
        kind: "user",
        content: [{ type: "text", text: "hi" }],
      } satisfies UserTurn,
      {
        kind: "assistantStream",
        text: "Hello",
        chunks: ["Hel", "lo"],
      } satisfies AssistantStreamTurn,
      {
        kind: "assistantToolCall",
        toolCallId: "tc_1",
        name: "x",
        args: {},
        argsText: "{}",
      } satisfies AssistantToolCallTurn,
      {
        kind: "toolResult",
        toolCallId: "tc_1",
        value: 1,
      } satisfies ToolResultTurn,
      { kind: "delay", ms: 10 } satisfies DelayTurn,
      { kind: "metadata", data: {} } satisfies MetadataTurn,
    ];
    expect(turns).toHaveLength(6);
  });

  it("each injection variant assigns to Injection", () => {
    const injections: Injection[] = [
      { kind: "cancel", at: { turnIndex: 0 } } satisfies CancelInjection,
      {
        kind: "interrupt",
        at: { turnIndex: 0 },
        reason: "x",
      } satisfies InterruptInjection,
      {
        kind: "transportError",
        at: { turnIndex: 0 },
        message: "boom",
      } satisfies TransportErrorInjection,
      {
        kind: "disconnect",
        at: { turnIndex: 0, afterChunk: 1 },
      } satisfies DisconnectInjection,
      {
        kind: "abortAndRestart",
        at: { turnIndex: 0 },
      } satisfies AbortAndRestartInjection,
    ];
    expect(injections).toHaveLength(5);
  });

  it("Transcript root requires version, turns, injections", () => {
    const t: Transcript = { version: "0", turns: [], injections: [] };
    expect(t.version).toBe("0");
  });
});
