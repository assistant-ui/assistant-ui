import { describe, expect, it } from "vitest";
import { toAgUiMessages } from "./conversions";

type Message = Parameters<typeof toAgUiMessages>[0][number];
type ToolCall = Exclude<Message["content"], string>[number] & {
  type: "tool-call";
};

const toolCall = (
  toolCallId: string,
  messages?: readonly Message[],
): ToolCall =>
  ({
    type: "tool-call",
    toolCallId,
    toolName: "test",
    args: {},
    ...(messages ? { messages } : {}),
  }) as ToolCall;

const assistant = (id: string, content: readonly ToolCall[]): Message =>
  ({ id, role: "assistant", content }) as Message;

const deepToolCall = (depth: number) => {
  let part = toolCall(String(depth - 1));
  for (let index = depth - 2; index >= 0; index--) {
    part = toolCall(String(index), [assistant(`nested-${index}`, [part])]);
  }
  return part;
};

describe("toAgUiMessages nested tool calls", () => {
  it("preserves document order", () => {
    const [converted] = toAgUiMessages([
      assistant("root", [
        toolCall("root-call", [
          assistant("nested", [
            toolCall("first", [assistant("deep", [toolCall("first-child")])]),
            toolCall("second"),
          ]),
        ]),
      ]),
    ]);

    expect(converted).toMatchObject({ role: "assistant" });
    if (converted?.role !== "assistant") throw new Error("expected assistant");
    expect(converted.toolCalls?.map(({ id }) => id)).toEqual([
      "root-call",
      "first",
      "first-child",
      "second",
    ]);
  });

  it("converts deeply nested tool calls without overflowing the stack", () => {
    const depth = 10_000;

    const [converted] = toAgUiMessages([
      assistant("root", [deepToolCall(depth)]),
    ]);

    expect(converted).toMatchObject({ role: "assistant" });
    if (converted?.role !== "assistant") throw new Error("expected assistant");
    expect(converted.toolCalls).toHaveLength(depth);
    expect(converted.toolCalls?.at(-1)?.id).toBe(String(depth - 1));
  });

  it("terminates cyclic nested tool-call messages without throwing", () => {
    const messages: Message[] = [];
    messages.push(assistant("nested", [toolCall("nested-call", messages)]));

    const [converted] = toAgUiMessages([
      assistant("root", [toolCall("root-call", messages)]),
    ]);

    expect(converted).toMatchObject({ role: "assistant" });
    if (converted?.role !== "assistant") throw new Error("expected assistant");
    expect(converted.toolCalls?.map(({ id }) => id)).toEqual([
      "root-call",
      "nested-call",
    ]);
  });
});
