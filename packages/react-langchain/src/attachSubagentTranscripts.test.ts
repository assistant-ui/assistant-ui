import {
  bindExternalStoreMessage,
  getExternalStoreMessages,
  type ThreadMessage,
} from "@assistant-ui/core";
import { describe, expect, it } from "vitest";
import {
  attachSubagentTranscripts,
  createAttachMemo,
} from "./attachSubagentTranscripts";

const assistantMessage = (id: string, toolCallId?: string): ThreadMessage =>
  ({
    id,
    createdAt: new Date(),
    role: "assistant",
    status: { type: "complete", reason: "unknown" },
    content: toolCallId
      ? [
          {
            type: "tool-call",
            toolCallId,
            toolName: "task",
            args: {},
            argsText: "{}",
          },
        ]
      : [{ type: "text", text: id }],
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

const transcript = (id: string) => [assistantMessage(id)];

describe("attachSubagentTranscripts", () => {
  it("returns the input array when no tool call has a transcript", () => {
    const messages = [assistantMessage("message", "unknown")];

    expect(
      attachSubagentTranscripts(
        messages,
        new Map([["task", transcript("transcript")]]),
        createAttachMemo(),
      ),
    ).toBe(messages);
  });

  it("attaches a transcript and preserves untouched message identities", () => {
    const matching = assistantMessage("matching", "task");
    const untouched = assistantMessage("untouched");
    const messages = [matching, untouched];
    const childTranscript = transcript("child");

    const attached = attachSubagentTranscripts(
      messages,
      new Map([["task", childTranscript]]),
      createAttachMemo(),
    );

    expect(attached).not.toBe(messages);
    expect(attached[0]).not.toBe(matching);
    expect(attached[1]).toBe(untouched);
    const part = attached[0]!.content[0]!;
    expect(part.type).toBe("tool-call");
    if (part.type !== "tool-call") throw new Error("expected a tool call");
    expect(part.messages).toBe(childTranscript);
  });

  it("reuses the attached array when transcript identities are unchanged", () => {
    const messages = [assistantMessage("matching", "task")];
    const childTranscript = transcript("child");
    const memo = createAttachMemo();

    const first = attachSubagentTranscripts(
      messages,
      new Map([["task", childTranscript]]),
      memo,
    );
    const second = attachSubagentTranscripts(
      messages,
      new Map([["task", childTranscript]]),
      memo,
    );

    expect(second).toBe(first);
  });

  it("rebuilds only messages whose transcript changed", () => {
    const messages = [
      assistantMessage("first", "task-one"),
      assistantMessage("second", "task-two"),
    ];
    const firstTranscript = transcript("first-transcript");
    const secondTranscript = transcript("second-transcript");
    const memo = createAttachMemo();
    const first = attachSubagentTranscripts(
      messages,
      new Map([
        ["task-one", firstTranscript],
        ["task-two", secondTranscript],
      ]),
      memo,
    );
    const next = attachSubagentTranscripts(
      messages,
      new Map([
        ["task-one", transcript("updated-transcript")],
        ["task-two", secondTranscript],
      ]),
      memo,
    );

    expect(next).not.toBe(first);
    expect(next[0]).not.toBe(first[0]);
    expect(next[1]).toBe(first[1]);
  });

  it("rebuilds when the same transcript moves to another tool call", () => {
    const first = assistantMessage("f", "call-a").content[0]!;
    const second = assistantMessage("s", "call-b").content[0]!;
    const message = {
      ...assistantMessage("pair"),
      content: [first, second],
    } as ThreadMessage;
    const nested = transcript("nested");
    const memo = createAttachMemo();

    const [before] = attachSubagentTranscripts(
      [message],
      new Map([["call-a", nested]]),
      memo,
    );
    const [after] = attachSubagentTranscripts(
      [message],
      new Map([["call-b", nested]]),
      memo,
    );

    expect(before?.content[0]).toMatchObject({ messages: nested });
    expect(after).not.toBe(before);
    expect(after?.content[0]).toBe(first);
    expect(after?.content[1]).toMatchObject({ messages: nested });
  });

  it("keeps untouched parts of a partially matched message by reference", () => {
    const text = { type: "text" as const, text: "hello" };
    const matched = assistantMessage("m", "call-matched").content[0]!;
    const unmatched = assistantMessage("u", "call-unmatched").content[0]!;
    const message = {
      ...assistantMessage("mixed"),
      content: [text, matched, unmatched],
    } as ThreadMessage;
    const nested = transcript("nested");

    const [attached] = attachSubagentTranscripts(
      [message],
      new Map([["call-matched", nested]]),
      createAttachMemo(),
    );

    expect(attached?.content[0]).toBe(text);
    expect(attached?.content[1]).toMatchObject({ messages: nested });
    expect(attached?.content[2]).toBe(unmatched);
  });

  it("preserves message and array external-store bindings", () => {
    const message = assistantMessage("matching", "task");
    const messages = [message];
    const originalMessage = { id: "original-message" };
    const originalMessages = [{ id: "original-messages" }];
    bindExternalStoreMessage(message, originalMessage);
    bindExternalStoreMessage(messages, originalMessages);

    const attached = attachSubagentTranscripts(
      messages,
      new Map([["task", transcript("child")]]),
      createAttachMemo(),
    );

    expect(getExternalStoreMessages(attached[0]!)).toEqual([originalMessage]);
    expect(getExternalStoreMessages({ messages: attached })).toBe(
      originalMessages,
    );
  });
});
