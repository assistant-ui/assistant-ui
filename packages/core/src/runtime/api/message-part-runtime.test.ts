import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { MessageStateBinding } from "./bindings";
import type { MessagePartState } from "./message-part-runtime";
import { MessagePartRuntimeImpl } from "./message-part-runtime";
import {
  MessageRuntimeImpl,
  type MessageRuntimeState,
} from "./message-runtime";
import type { ThreadRuntimeImpl } from "./thread-runtime";

const threadPath = {
  ref: "threads.main",
  threadSelector: { type: "main" as const },
};

const messagePath = {
  ...threadPath,
  ref: "threads.main.messages[0]",
  messageSelector: { type: "index" as const, index: 0 },
};

const partPath = {
  ...messagePath,
  ref: "threads.main.messages[0].content[0]",
  messagePartSelector: { type: "index" as const, index: 0 },
};

const toolPart: MessagePartState = {
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "weather",
  args: {},
  argsText: "{}",
  status: { type: "requires-action", reason: "tool-calls" },
};

const textPart: MessagePartState = {
  type: "text",
  text: "hello",
  status: { type: "complete" },
};

const message = {
  id: "message-1",
  role: "assistant" as const,
  createdAt: new Date(0),
  content: [toolPart],
  status: { type: "requires-action" as const, reason: "tool-calls" as const },
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

const createRuntime = ({
  part = toolPart,
  core,
}: {
  part?: MessagePartState;
  core: ThreadRuntimeCore;
}) => {
  const contentBinding = {
    path: partPath,
    getState: () => part,
    subscribe: () => () => {},
  };
  const messageBinding: MessageStateBinding = {
    path: messagePath,
    getState: () => message,
    subscribe: () => () => {},
  };
  const threadBinding: ThreadRuntimeImpl["__internal_threadBinding"] = {
    path: threadPath,
    getState: () => core,
    getStateState: () =>
      ({ threadId: "thread-1" }) as ReturnType<ThreadRuntimeImpl["getState"]>,
    subscribe: () => () => {},
    outerSubscribe: () => () => {},
  };
  return new MessagePartRuntimeImpl(
    contentBinding,
    messageBinding,
    threadBinding,
  );
};

describe("MessagePartRuntime interaction recording", () => {
  it("rejects invalid inputs without throwing synchronously", async () => {
    const core = {
      unstable_recordToolInteraction: vi.fn(),
    } as unknown as ThreadRuntimeCore;
    const runtime = createRuntime({ core });

    const recording = runtime.unstable_recordInteraction({
      type: "action",
      payload: "not an object",
    });

    await expect(recording).rejects.toThrow(
      "An action interaction payload must be a JSON object.",
    );
    expect(core.unstable_recordToolInteraction).not.toHaveBeenCalled();
  });

  it("rejects recording on non-tool parts", async () => {
    const core = {
      unstable_recordToolInteraction: vi.fn(),
    } as unknown as ThreadRuntimeCore;
    const runtime = createRuntime({ core, part: textPart });

    await expect(
      runtime.unstable_recordInteraction({ type: "action", payload: {} }),
    ).rejects.toThrow("Tried to record interaction on non-tool message part");
  });

  it("rejects when the core cannot record tool interactions", async () => {
    const runtime = createRuntime({ core: {} as ThreadRuntimeCore });

    await expect(
      runtime.unstable_recordInteraction({ type: "action", payload: {} }),
    ).rejects.toThrow("Runtime does not support recording tool interactions.");
  });

  it("delegates stamped interactions with the message and tool call ids", async () => {
    const recordInteraction = vi.fn(async () => {});
    const core = {
      unstable_recordToolInteraction: recordInteraction,
    } as unknown as ThreadRuntimeCore;
    const runtime = createRuntime({ core });

    await runtime.unstable_recordInteraction({
      type: "action",
      payload: { action: "toggle" },
    });

    expect(recordInteraction).toHaveBeenCalledExactlyOnceWith({
      messageId: "message-1",
      toolCallId: "call-1",
      interaction: {
        type: "action",
        payload: { action: "toggle" },
        occurredAt: expect.any(Number),
      },
    });
  });

  it("keeps a retained recorder on its original thread, message, and tool call", async () => {
    let currentMessage: MessageRuntimeState = {
      ...message,
      id: "message-a",
      content: [{ ...toolPart, toolCallId: "call-a" }],
    };
    const recordA = vi.fn(async () => {});
    const recordB = vi.fn(async () => {});
    let currentCore = {
      unstable_recordToolInteraction: recordA,
    } as unknown as ThreadRuntimeCore;
    let currentThreadId = "thread-a";
    const messageBinding: MessageStateBinding = {
      path: messagePath,
      getState: () => currentMessage,
      subscribe: () => () => {},
    };
    const threadBinding: ThreadRuntimeImpl["__internal_threadBinding"] = {
      path: threadPath,
      getState: () => currentCore,
      getStateState: () =>
        ({ threadId: currentThreadId }) as ReturnType<
          ThreadRuntimeImpl["getState"]
        >,
      subscribe: () => () => {},
      outerSubscribe: () => () => {},
    };
    const part = new MessageRuntimeImpl(
      messageBinding,
      threadBinding,
    ).getMessagePartByIndex(0);

    currentMessage = {
      ...message,
      id: "message-b",
      content: [{ ...toolPart, toolCallId: "call-b" }],
    };
    currentCore = {
      unstable_recordToolInteraction: recordB,
    } as unknown as ThreadRuntimeCore;
    currentThreadId = "thread-b";

    await part.unstable_recordInteraction({
      type: "action",
      payload: { action: "toggle" },
    });

    expect(recordA).toHaveBeenCalledExactlyOnceWith({
      messageId: "message-a",
      toolCallId: "call-a",
      interaction: {
        type: "action",
        payload: { action: "toggle" },
        occurredAt: expect.any(Number),
      },
    });
    expect(recordB).not.toHaveBeenCalled();
  });

  it("records into a successor core of the same thread", async () => {
    const recordA = vi.fn(async () => {});
    const recordB = vi.fn(async () => {});
    let currentCore = {
      unstable_recordToolInteraction: recordA,
    } as unknown as ThreadRuntimeCore;
    const messageBinding: MessageStateBinding = {
      path: messagePath,
      getState: () => message,
      subscribe: () => () => {},
    };
    const threadBinding: ThreadRuntimeImpl["__internal_threadBinding"] = {
      path: threadPath,
      getState: () => currentCore,
      getStateState: () =>
        ({ threadId: "thread-a" }) as ReturnType<ThreadRuntimeImpl["getState"]>,
      subscribe: () => () => {},
      outerSubscribe: () => () => {},
    };
    const part = new MessageRuntimeImpl(
      messageBinding,
      threadBinding,
    ).getMessagePartByIndex(0);

    currentCore = {
      unstable_recordToolInteraction: recordB,
    } as unknown as ThreadRuntimeCore;

    await part.unstable_recordInteraction({
      type: "action",
      payload: { action: "toggle" },
    });

    expect(recordB).toHaveBeenCalledExactlyOnceWith({
      messageId: "message-1",
      toolCallId: "call-1",
      interaction: {
        type: "action",
        payload: { action: "toggle" },
        occurredAt: expect.any(Number),
      },
    });
    expect(recordA).not.toHaveBeenCalled();
  });
});

describe("MessagePartRuntime resumeToolCall", () => {
  it("records the accepted human response", () => {
    const resumeToolCall = vi.fn();
    const recordInteraction = vi.fn(async () => {});
    const runtime = createRuntime({
      core: {
        resumeToolCall,
        unstable_recordToolInteraction: recordInteraction,
      } as unknown as ThreadRuntimeCore,
    });
    const payload = { answer: "yes" };

    runtime.resumeToolCall(payload);

    expect(resumeToolCall).toHaveBeenCalledExactlyOnceWith({
      toolCallId: "call-1",
      payload,
    });
    expect(recordInteraction).toHaveBeenCalledExactlyOnceWith({
      messageId: "message-1",
      toolCallId: "call-1",
      interaction: {
        type: "human-response",
        payload,
        occurredAt: expect.any(Number),
      },
    });
    expect(resumeToolCall.mock.invocationCallOrder[0]).toBeLessThan(
      recordInteraction.mock.invocationCallOrder[0]!,
    );
  });

  it("does not record a human response when resuming throws", () => {
    const error = new Error("resume failed");
    const recordInteraction = vi.fn(async () => {});
    const runtime = createRuntime({
      core: {
        resumeToolCall: () => {
          throw error;
        },
        unstable_recordToolInteraction: recordInteraction,
      } as unknown as ThreadRuntimeCore,
    });

    expect(() => runtime.resumeToolCall({ answer: "yes" })).toThrow(error);
    expect(recordInteraction).not.toHaveBeenCalled();
  });

  it("keeps an accepted resume successful when recording fails", async () => {
    const resumeToolCall = vi.fn();
    const runtime = createRuntime({
      core: {
        resumeToolCall,
        unstable_recordToolInteraction: vi.fn(async () => {
          throw new Error("recording failed");
        }),
      } as unknown as ThreadRuntimeCore,
    });

    expect(() => runtime.resumeToolCall({ answer: "yes" })).not.toThrow();
    await Promise.resolve();
    expect(resumeToolCall).toHaveBeenCalledOnce();
  });
});
