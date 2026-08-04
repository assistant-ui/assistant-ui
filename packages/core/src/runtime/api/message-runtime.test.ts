import { describe, expect, it } from "vitest";
import type { CompleteAttachment } from "../../types/attachment";
import type { ThreadAssistantMessage } from "../../types/message";
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

const createAssistantMessage = (
  content: ThreadAssistantMessage["content"],
  status: ThreadAssistantMessage["status"],
): ThreadAssistantMessage => ({
  id: "message-1",
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
  it("honours a supplied running status on a non-last part", () => {
    const message = createAssistantMessage(
      [
        { type: "text", text: "first", status: { type: "running" } },
        { type: "text", text: "last" },
      ],
      { type: "running" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "running",
    });
  });

  it("honours a supplied complete status on the last part", () => {
    const message = createAssistantMessage(
      [{ type: "reasoning", text: "done", status: { type: "complete" } }],
      { type: "running" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "complete",
    });
  });

  it("ignores supplied statuses after the message completes", () => {
    const message = createAssistantMessage(
      [{ type: "text", text: "truncated", status: { type: "running" } }],
      { type: "complete", reason: "stop" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "complete",
      reason: "stop",
    });
  });

  it("falls back to positional statuses for statusless running parts", () => {
    const message = createAssistantMessage(
      [
        { type: "text", text: "first" },
        { type: "reasoning", text: "last" },
      ],
      { type: "running" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "complete",
    });
    expect(toMessagePartStatus(message, 1, message.content[1]!)).toEqual({
      type: "running",
    });
  });

  it("preserves tool-call status derivation", () => {
    const unresolved = createAssistantMessage(
      [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          args: {},
          argsText: "{}",
        },
      ],
      { type: "running" },
    );
    const resolved = createAssistantMessage(
      [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          args: {},
          argsText: "{}",
          result: "sunny",
        },
      ],
      { type: "running" },
    );

    expect(toMessagePartStatus(unresolved, 0, unresolved.content[0]!)).toEqual({
      type: "running",
    });
    expect(toMessagePartStatus(resolved, 0, resolved.content[0]!)).toEqual({
      type: "complete",
    });
  });

  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
    ["null", null],
  ])("treats %s tool results as complete", (_label, result) => {
    const message = createAssistantMessage(
      [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "weather",
          args: {},
          argsText: "{}",
          result,
        },
      ],
      { type: "running" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "complete",
    });
  });

  it("normalizes supplied upstream statuses", () => {
    const upstreamComplete = {
      type: "text",
      text: "done",
      status: { type: "complete", reason: "unknown" },
    } as unknown as ThreadAssistantMessage["content"][number];
    const upstreamIncomplete = {
      type: "reasoning",
      text: "interrupted",
      status: {
        type: "incomplete",
        reason: "unknown",
        error: "upstream error",
      },
    } as unknown as ThreadAssistantMessage["content"][number];
    const message = createAssistantMessage(
      [upstreamComplete, upstreamIncomplete],
      { type: "running" },
    );

    expect(toMessagePartStatus(message, 0, message.content[0]!)).toEqual({
      type: "complete",
    });
    expect(toMessagePartStatus(message, 1, message.content[1]!)).toEqual({
      type: "incomplete",
      reason: "other",
    });
  });
});

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
