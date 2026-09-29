import { describe, expect, it } from "vitest";
import type {
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ToolCallMessagePart,
} from "../../types/message";
import {
  iterateToolCallParts,
  mapToolCallPartsDeep,
  walkToolCallTree,
} from "./tool-call-tree";

const toolCall = (
  toolCallId: string,
  messages?: readonly ThreadMessage[],
): ToolCallMessagePart => ({
  type: "tool-call",
  toolCallId,
  toolName: "t",
  argsText: "{}",
  args: {},
  ...(messages !== undefined && { messages }),
});

const assistant = (
  id: string,
  content: readonly ThreadAssistantMessagePart[],
): ThreadAssistantMessage =>
  ({
    id,
    role: "assistant",
    content,
    status: { type: "complete", reason: "unknown" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    createdAt: new Date(0),
    attachments: [],
  }) as unknown as ThreadAssistantMessage;

const user = (id: string): ThreadMessage =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text: "hi" }],
    metadata: { custom: {} },
    createdAt: new Date(0),
    attachments: [],
  }) as unknown as ThreadMessage;

// root
// └─ a ─ nested message "m2"
//         ├─ b ─ nested message "m3"
//         │       └─ c
//         └─ d
const tree = () => {
  const c = toolCall("c");
  const b = toolCall("b", [assistant("m3", [c])]);
  const d = toolCall("d");
  const a = toolCall("a", [assistant("m2", [b, d])]);
  return { a, b, c, d };
};

describe("walkToolCallTree", () => {
  it("yields every part in document order, each ahead of its descendants", () => {
    const { a } = tree();
    const entries = [
      ...walkToolCallTree([user("m0"), assistant("m1", [a, toolCall("e")])]),
    ];

    expect(entries.map((entry) => entry.part.toolCallId)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("reports the message that directly holds each part", () => {
    const { a } = tree();
    const entries = [...walkToolCallTree([assistant("m1", [a])])];

    expect(
      Object.fromEntries(
        entries.map((entry) => [entry.part.toolCallId, entry.messageId]),
      ),
    ).toEqual({ a: "m1", b: "m2", c: "m3", d: "m2" });
  });

  it("skips messages whose content is not an array", () => {
    const malformed = {
      id: "m1",
      role: "assistant",
    } as unknown as ThreadMessage;
    expect([...walkToolCallTree([malformed])]).toEqual([]);
  });

  it("skips a non-assistant message carrying a tool-call part", () => {
    const malformed = {
      ...user("m2"),
      content: [toolCall("b")],
    } as unknown as ThreadMessage;
    const a = toolCall("a", [malformed]);

    expect(
      [...walkToolCallTree([assistant("m1", [a])])].map(
        (entry) => entry.part.toolCallId,
      ),
    ).toEqual(["a"]);
  });
});

describe("iterateToolCallParts", () => {
  it("matches walkToolCallTree over the same content", () => {
    const { a } = tree();
    const content = [a, toolCall("e")];

    expect([...iterateToolCallParts(content)].map((p) => p.toolCallId)).toEqual(
      [...walkToolCallTree([assistant("m1", content)])].map(
        (entry) => entry.part.toolCallId,
      ),
    );
  });

  it("ignores non tool-call parts", () => {
    expect([
      ...iterateToolCallParts([
        { type: "text", text: "hi" } as ThreadAssistantMessagePart,
        toolCall("a"),
      ]),
    ]).toHaveLength(1);
  });
});

describe("mapToolCallPartsDeep", () => {
  it("rewrites nested parts and reports the change", () => {
    const { a } = tree();
    const content = [a];
    const { content: next, changed } = mapToolCallPartsDeep(content, (part) =>
      part.toolCallId === "c" ? { ...part, isError: true } : part,
    );

    expect(changed).toBe(true);
    const parts = [...iterateToolCallParts(next)];
    expect(parts.find((part) => part.toolCallId === "c")?.isError).toBe(true);
    expect(
      parts.find((part) => part.toolCallId === "d")?.isError,
    ).toBeUndefined();
  });

  it("skips a nested message whose content is not an array", () => {
    const malformed = {
      id: "m2",
      role: "assistant",
    } as unknown as ThreadMessage;
    const a = toolCall("a", [malformed]);

    expect(() =>
      mapToolCallPartsDeep([a], (part) => ({ ...part, isError: true })),
    ).not.toThrow();
  });

  it("keeps the original content identity when nothing changed", () => {
    const { a } = tree();
    const content = [a, toolCall("e")];
    const result = mapToolCallPartsDeep(content, (part) => part);

    expect(result.changed).toBe(false);
    expect(result.content).toBe(content);
  });

  it("preserves untouched sibling messages by identity", () => {
    const nested = assistant("m2", [toolCall("b")]);
    const sibling = user("m3");
    const a = toolCall("a", [nested, sibling]);
    const { content: next } = mapToolCallPartsDeep([a], (part) =>
      part.toolCallId === "b" ? { ...part, isError: true } : part,
    );

    const mapped = next[0] as ToolCallMessagePart;
    expect(mapped).not.toBe(a);
    expect(mapped.messages?.[1]).toBe(sibling);
    expect(mapped.messages?.[0]).not.toBe(nested);
  });
});
