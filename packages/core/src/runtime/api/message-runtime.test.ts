import { describe, expect, it } from "vitest";
import type { CompleteAttachment } from "../../types/attachment";
import type { ThreadRuntimeCoreBinding } from "./thread-runtime";
import {
  MessageRuntimeImpl,
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
