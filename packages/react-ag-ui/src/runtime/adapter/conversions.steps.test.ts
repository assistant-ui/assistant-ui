import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import { fromAgUiMessages, toAgUiMessages } from "./conversions";

const reasoning = (
  text: string,
  meta: Record<string, unknown> = {},
): Record<string, unknown> => ({
  type: "reasoning",
  text,
  ...(Object.keys(meta).length > 0 ? { providerMetadata: { agui: meta } } : {}),
});

const toolCall = (
  id: string,
  parentId: string,
  result?: unknown,
): Record<string, unknown> => ({
  type: "tool-call",
  toolCallId: id,
  toolName: "lookup",
  args: {},
  argsText: "{}",
  parentId,
  ...(result !== undefined ? { result } : {}),
});

const joined = (
  content: Record<string, unknown>[],
  opaqueReasoning?: Record<string, unknown>[],
): ThreadMessageLike =>
  ({
    id: "a-1",
    role: "assistant",
    content,
    ...(opaqueReasoning
      ? { metadata: { custom: { agui: { opaqueReasoning } } } }
      : {}),
  }) as unknown as ThreadMessageLike;

describe("toAgUiMessages joined steps", () => {
  it("replays each step's reasoning, calls and results in arrival order", () => {
    const wire = toAgUiMessages([
      joined([
        reasoning("plan", { reasoningId: "r-1", encryptedValue: "sig-1" }),
        { type: "text", text: "Checking." },
        toolCall("c-1", "m-1", "one"),
        toolCall("c-2", "m-1", "two"),
        reasoning("next", { reasoningId: "r-2", encryptedValue: "sig-2" }),
        toolCall("c-3", "m-2", "three"),
        reasoning("done", { reasoningId: "r-3", encryptedValue: "sig-3" }),
        { type: "text", text: "All set." },
      ]),
    ]);

    expect(wire.map((m) => [m.role, m.id])).toEqual([
      ["reasoning", "r-1"],
      ["assistant", "m-1"],
      ["tool", "c-1:tool"],
      ["tool", "c-2:tool"],
      ["reasoning", "r-2"],
      ["assistant", "m-2"],
      ["tool", "c-3:tool"],
      ["reasoning", "r-3"],
      ["assistant", "a-1"],
    ]);
    expect(wire[1]).toMatchObject({
      content: "Checking.",
      toolCalls: [{ id: "c-1" }, { id: "c-2" }],
    });
    expect(wire[5]).toMatchObject({ content: "", toolCalls: [{ id: "c-3" }] });
    expect(wire[8]).toEqual({
      id: "a-1",
      role: "assistant",
      content: "All set.",
    });
  });

  it("keeps a signed reasoning block with empty text", () => {
    const wire = toAgUiMessages([
      joined([
        reasoning("", { reasoningId: "r-1", encryptedValue: "sig-1" }),
        toolCall("c-1", "m-1", "one"),
      ]),
    ]);
    expect(wire[0]).toEqual({
      id: "r-1",
      role: "reasoning",
      content: "",
      encryptedValue: "sig-1",
    });
  });

  it("still drops a blank reasoning part that carries nothing", () => {
    const wire = toAgUiMessages([
      joined([reasoning("  "), { type: "text", text: "hi" }]),
    ]);
    expect(wire.map((m) => m.role)).toEqual(["assistant"]);
  });

  it("returns signatures and wire metadata exactly as received", () => {
    const encryptedValue = JSON.stringify({
      signature: "EqQBCkYIBxgCKkD+/==",
      provider_name: "bedrock",
    });
    const wire = toAgUiMessages([
      joined([
        reasoning("plan", {
          reasoningId: "r-1",
          encryptedValue,
          messageMetadata: { provider: { block: 0 } },
        }),
        toolCall("c-1", "m-1", "one"),
      ]),
    ]);
    expect(wire[0]).toEqual({
      id: "r-1",
      role: "reasoning",
      content: "plan",
      encryptedValue,
      metadata: { provider: { block: 0 } },
    });
  });

  it("puts a redacted block back in the step it arrived in", () => {
    const wire = toAgUiMessages([
      joined(
        [
          reasoning("plan", { reasoningId: "r-1", encryptedValue: "sig-1" }),
          toolCall("c-1", "m-1", "one"),
          toolCall("c-2", "m-2", "two"),
          { type: "text", text: "Done." },
        ],
        [
          { id: "x-1", encryptedValue: "redacted-1", index: 0 },
          { id: "x-2", encryptedValue: "redacted-2", index: 2 },
          { id: "x-3", encryptedValue: "redacted-3", index: 3 },
        ],
      ),
    ]);
    expect(wire.map((m) => [m.role, m.id])).toEqual([
      ["reasoning", "x-1"],
      ["reasoning", "r-1"],
      ["assistant", "m-1"],
      ["tool", "c-1:tool"],
      ["reasoning", "x-2"],
      ["assistant", "m-2"],
      ["tool", "c-2:tool"],
      ["reasoning", "x-3"],
      ["assistant", "a-1"],
    ]);
  });

  it("leaves an unpositioned redacted block ahead of the message", () => {
    const wire = toAgUiMessages([
      joined(
        [reasoning("plan"), toolCall("c-1", "m-1", "one")],
        [{ id: "x-1", encryptedValue: "redacted-1" }],
      ),
    ]);
    expect(wire.map((m) => m.id)).toEqual([
      "x-1",
      "a-1:reasoning-0",
      "a-1",
      "c-1:tool",
    ]);
  });

  it("round-trips a snapshot of several steps", () => {
    const original = [
      { id: "u-1", role: "user", content: "go" },
      { id: "r-1", role: "reasoning", content: "plan", encryptedValue: "s1" },
      {
        id: "c-1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "c-1",
            type: "function",
            function: { name: "lookup", arguments: "{}" },
          },
        ],
      },
      { id: "t-1", role: "tool", content: "one", toolCallId: "c-1" },
      { id: "x-1", role: "reasoning", content: "", encryptedValue: "s2" },
      { id: "r-2", role: "reasoning", content: "answer", encryptedValue: "s3" },
      { id: "m-2", role: "assistant", content: "Done." },
    ];
    const imported = fromAgUiMessages(original as any, { showThinking: true });
    expect(imported.map((m) => m.id)).toEqual(["u-1", "m-2"]);
    expect(toAgUiMessages(imported)).toEqual(original);
  });

  it("keeps a redacted block between two answered tool-only steps", () => {
    const call = (id: string) => ({
      id,
      role: "assistant",
      toolCalls: [
        { id, type: "function", function: { name: "lookup", arguments: "{}" } },
      ],
    });
    const original = [
      { id: "u-1", role: "user", content: "go" },
      call("c-1"),
      { id: "t-1", role: "tool", content: "one", toolCallId: "c-1" },
      { id: "x-1", role: "reasoning", content: "", encryptedValue: "s1" },
      call("c-2"),
      { id: "t-2", role: "tool", content: "two", toolCallId: "c-2" },
      { id: "m-1", role: "assistant", content: "Done." },
    ];
    const wire = toAgUiMessages(fromAgUiMessages(original as any));
    expect(wire.map((m) => m.id)).toEqual([
      "u-1",
      "c-1",
      "t-1",
      "x-1",
      "c-2",
      "t-2",
      "m-1",
    ]);
  });

  it("does not use a parent id another step already goes out under", () => {
    const wire = toAgUiMessages([
      joined([toolCall("c-1", "a-1", "one"), { type: "text", text: "Done." }]),
    ]);
    expect(wire.map((m) => m.id)).toEqual(["c-1", "c-1:tool", "a-1"]);
  });
});
