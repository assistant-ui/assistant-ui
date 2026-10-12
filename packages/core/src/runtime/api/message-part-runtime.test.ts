import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { MessageStateBinding } from "./bindings";
import type { MessagePartState } from "./message-part-runtime";
import { MessagePartRuntimeImpl } from "./message-part-runtime";
import type { ThreadRuntimeImpl, ThreadRuntimeState } from "./thread-runtime";

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
    getStateState: () => ({ threadId: "thread-1" }) as ThreadRuntimeState,
    subscribe: () => () => {},
    outerSubscribe: () => () => {},
  };
  return new MessagePartRuntimeImpl(
    contentBinding,
    messageBinding,
    threadBinding,
  );
};

const retainedToolPart: MessagePartState = {
  ...toolPart,
  approval: { id: "approval-1" },
};

const replacementToolPart: MessagePartState = {
  ...toolPart,
  toolCallId: "call-2",
  toolName: "replacement",
  approval: { id: "approval-2" },
};

const createRetainedRuntime = (core: ThreadRuntimeCore) => {
  let part: MessagePartState = retainedToolPart;
  let messageId = "message-1";
  let currentCore = core;
  let threadId = "thread-1";

  const contentBinding = {
    path: partPath,
    getState: () => part,
    subscribe: () => () => {},
  };
  const messageBinding: MessageStateBinding = {
    path: messagePath,
    getState: () => ({ ...message, id: messageId }),
    subscribe: () => () => {},
  };
  const threadBinding: ThreadRuntimeImpl["__internal_threadBinding"] = {
    path: threadPath,
    getState: () => currentCore,
    getStateState: () => ({ threadId }) as ThreadRuntimeState,
    subscribe: () => () => {},
    outerSubscribe: () => () => {},
  };

  return {
    runtime: new MessagePartRuntimeImpl(
      contentBinding,
      messageBinding,
      threadBinding,
    ),
    replace: (replacement: {
      part?: MessagePartState;
      messageId?: string;
      core?: ThreadRuntimeCore;
      threadId?: string;
    }) => {
      part = replacement.part ?? replacementToolPart;
      messageId = replacement.messageId ?? "message-2";
      currentCore = replacement.core ?? currentCore;
      threadId = replacement.threadId ?? threadId;
    },
  };
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

describe("MessagePartRuntime retained tool actions", () => {
  it.each([
    {
      name: "a thread switch",
      threadId: "thread-2",
      currentCore: "successor",
      expectedCore: "original",
    },
    {
      name: "a branch switch",
      threadId: "thread-1",
      currentCore: "original",
      expectedCore: "original",
    },
    {
      name: "a same-thread restart",
      threadId: "thread-1",
      currentCore: "successor",
      expectedCore: "successor",
    },
  ])(
    "keeps action targets through $name",
    async ({ threadId, currentCore, expectedCore }) => {
      const originalCore = {
        addToolResult: vi.fn(),
        resumeToolCall: vi.fn(),
        respondToToolApproval: vi.fn(async () => {}),
        unstable_recordToolInteraction: vi.fn(async () => {}),
      } as unknown as ThreadRuntimeCore;
      const successorCore = {
        addToolResult: vi.fn(),
        resumeToolCall: vi.fn(),
        respondToToolApproval: vi.fn(async () => {}),
        unstable_recordToolInteraction: vi.fn(async () => {}),
      } as unknown as ThreadRuntimeCore;
      const { runtime, replace } = createRetainedRuntime(originalCore);

      replace({
        core: currentCore === "successor" ? successorCore : originalCore,
        threadId,
      });

      runtime.addToolResult({ answer: "result" });
      runtime.resumeToolCall({ answer: "resume" });
      await runtime.respondToToolApproval({ approved: true });

      const targetCore =
        expectedCore === "successor" ? successorCore : originalCore;
      const otherCore =
        expectedCore === "successor" ? originalCore : successorCore;
      expect(targetCore.addToolResult).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: "message-1",
          toolName: "weather",
          toolCallId: "call-1",
          result: { answer: "result" },
        }),
      );
      expect(targetCore.resumeToolCall).toHaveBeenCalledWith({
        toolCallId: "call-1",
        payload: { answer: "resume" },
      });
      expect(targetCore.respondToToolApproval).toHaveBeenCalledWith({
        approvalId: "approval-1",
        approved: true,
      });
      expect(targetCore.unstable_recordToolInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: "message-1",
          toolCallId: "call-1",
          interaction: expect.objectContaining({
            type: "human-response",
            payload: { answer: "resume" },
          }),
        }),
      );
      expect(otherCore.addToolResult).not.toHaveBeenCalled();
      expect(otherCore.resumeToolCall).not.toHaveBeenCalled();
      expect(otherCore.respondToToolApproval).not.toHaveBeenCalled();
      expect(otherCore.unstable_recordToolInteraction).not.toHaveBeenCalled();
    },
  );
});
