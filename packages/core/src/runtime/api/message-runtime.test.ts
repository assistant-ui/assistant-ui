import { describe, expect, it } from "vitest";
import type { CompleteAttachment } from "../../types/attachment";
import type {
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
} from "../../types/message";
import type { ThreadRuntimeCoreBinding } from "./thread-runtime";
import {
  MessageRuntimeImpl,
  toMessagePartStatus,
  type MessageState,
  type MessageStateBinding,
} from "./message-runtime";

const messagePath = {
  ref: "threads.main.messages[0]",
  threadSelector: { type: "main" as const },
  messageSelector: { type: "index" as const, index: 0 },
};

const attachment: CompleteAttachment = {
  id: "attachment-1",
  type: "file",
  name: "notes.txt",
  contentType: "text/plain",
  content: [{ type: "text", text: "notes" }],
  status: { type: "complete" },
};

const message: MessageState = {
  id: "message-1",
  role: "assistant",
  createdAt: new Date(0),
  content: [
    { type: "text", text: "Hello" },
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName: "weather",
      args: {},
      argsText: "{}",
    },
  ],
  attachments: [attachment],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
  parentId: null,
  index: 0,
  isLast: true,
  branchNumber: 1,
  branchCount: 1,
  speech: undefined,
};

const messageBinding: MessageStateBinding = {
  path: messagePath,
  getState: () => message,
  subscribe: () => () => {},
};

const threadBinding = {
  subscribe: () => () => {},
} as unknown as ThreadRuntimeCoreBinding;

describe("MessageRuntimeImpl paths", () => {
  it("appends nested selectors to the message path", () => {
    const runtime = new MessageRuntimeImpl(messageBinding, threadBinding);

    expect(runtime.composer.path.ref).toBe("threads.main.messages[0].composer");
    expect(runtime.getMessagePartByIndex(0).path.ref).toBe(
      "threads.main.messages[0].content[0]",
    );
    expect(runtime.getMessagePartByToolCallId("call-1").path.ref).toBe(
      'threads.main.messages[0].content[toolCallId="call-1"]',
    );
    expect(runtime.getAttachmentByIndex(0).path.ref).toBe(
      "threads.main.messages[0].attachments[0]",
    );
  });
});

const assistantMessage = (
  content: readonly ThreadAssistantMessagePart[],
  status: ThreadAssistantMessage["status"] = { type: "running" },
): ThreadAssistantMessage => ({
  id: "m1",
  role: "assistant",
  createdAt: new Date(0),
  content,
  status,
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

describe("toMessagePartStatus", () => {
  it("keeps a content part running while a trailing empty text part is present", () => {
    const message = assistantMessage([
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "" },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "complete",
    );
  });

  it("keeps a content part running while a trailing whitespace-only text part is present", () => {
    const message = assistantMessage([
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "   " },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
  });

  it("keeps a content part running while a trailing empty reasoning part is present", () => {
    const message = assistantMessage([
      { type: "text", text: "answer so far" },
      { type: "reasoning", text: "" },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
  });

  it("skips multiple trailing empty parts", () => {
    const message = assistantMessage([
      { type: "text", text: "answer" },
      { type: "text", text: "" },
      { type: "reasoning", text: "   " },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "complete",
    );
    expect(toMessagePartStatus(message, 2, message.content[2]!).type).toBe(
      "complete",
    );
  });

  it("marks earlier parts complete once the trailing text part has content", () => {
    const message = assistantMessage([
      { type: "reasoning", text: "thinking..." },
      { type: "text", text: "Hello" },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "complete",
    );
    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "running",
    );
  });

  it("does not skip an empty part that is the only part", () => {
    const message = assistantMessage([{ type: "text", text: "" }]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
  });

  it("treats an empty part in the middle as complete, not as the last part", () => {
    const message = assistantMessage([
      { type: "text", text: "first" },
      { type: "reasoning", text: "" },
      { type: "text", text: "last" },
    ]);

    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "complete",
    );
    expect(toMessagePartStatus(message, 2, message.content[2]!).type).toBe(
      "running",
    );
  });

  it("returns the message status for the last part when the message is complete", () => {
    const message = assistantMessage([{ type: "text", text: "done" }], {
      type: "complete",
      reason: "stop",
    });

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "complete",
    );
  });

  it("returns complete for every part once the message requires action", () => {
    const message = assistantMessage(
      [
        { type: "text", text: "hi" },
        { type: "text", text: "" },
      ],
      { type: "requires-action", reason: "tool-calls" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "complete",
    );
    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "complete",
    );
  });

  it("returns complete for a tool-call part that has a result", () => {
    const message = assistantMessage([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "weather",
        args: {},
        argsText: "{}",
        result: { temp: 72 },
      },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "complete",
    );
  });

  it("keeps a no-result tool-call running and marks a trailing empty text part complete", () => {
    const message = assistantMessage([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "weather",
        args: {},
        argsText: "{}",
      },
      { type: "text", text: "" },
    ]);

    expect(toMessagePartStatus(message, 0, message.content[0]!).type).toBe(
      "running",
    );
    expect(toMessagePartStatus(message, 1, message.content[1]!).type).toBe(
      "complete",
    );
  });
});
