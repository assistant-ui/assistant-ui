import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { MessageStateBinding } from "./bindings";
import type { MessagePartState } from "./message-part-runtime";
import { MessagePartRuntimeImpl } from "./message-part-runtime";
import type { ThreadRuntimeCoreBinding } from "./thread-runtime";

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
  message: messageOverride,
  live,
}: {
  part?: MessagePartState;
  core: ThreadRuntimeCore;
  message?: ReturnType<typeof makeMessage>;
  live?: {
    part: MessagePartState;
    core: ThreadRuntimeCore;
    threadId: string;
  };
}) => {
  // The captured identity is read at construction; the live state only
  // applies once the runtime has moved on. Every binding serves the
  // original objects for the whole construction window (flagged by
  // `constructing`) and the moved-on ones afterwards.
  let constructing = true;
  const contentBinding = {
    path: partPath,
    getState: () => (constructing ? part : (live?.part ?? part)),
    subscribe: () => () => {},
  };
  const messageBinding: MessageStateBinding = {
    path: messagePath,
    getState: () => messageOverride ?? message,
    subscribe: () => () => {},
  };
  const threadBinding = {
    path: threadPath,
    getState: () => (constructing ? core : (live?.core ?? core)),
    // The production binding is a `ThreadRuntimeImpl.__internal_threadBinding`,
    // which carries `getStateState`; the implementation probes for it.
    getStateState: () => ({
      threadId: constructing ? "thread-1" : (live?.threadId ?? "thread-1"),
    }),
    subscribe: () => () => {},
    outerSubscribe: () => () => {},
  } as ThreadRuntimeCoreBinding;
  const runtime = new MessagePartRuntimeImpl(
    contentBinding,
    messageBinding,
    threadBinding,
  );
  constructing = false;
  return runtime;
};

const makeMessage = (id: string) => ({
  ...message,
  id,
  content: [
    {
      ...toolPart,
      toolCallId: `call-${id}`,
    },
  ],
});

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

describe("MessagePartRuntime retained part after a thread switch (#9386)", () => {
  const makeCores = () => {
    const recordOriginal = vi.fn(async () => {});
    const recordSuccessor = vi.fn(async () => {});
    const addResultSuccessor = vi.fn();
    const addResultOriginal = vi.fn();
    const originalCore = {
      addToolResult: addResultOriginal,
      unstable_recordToolInteraction: recordOriginal,
    } as unknown as ThreadRuntimeCore;
    const successorCore = {
      addToolResult: addResultSuccessor,
      unstable_recordToolInteraction: recordSuccessor,
    } as unknown as ThreadRuntimeCore;
    return {
      recordOriginal,
      recordSuccessor,
      addResultOriginal,
      addResultSuccessor,
      originalCore,
      successorCore,
    };
  };

  it("records against the original thread's core after a thread switch", async () => {
    const { recordOriginal, recordSuccessor, originalCore, successorCore } =
      makeCores();
    const runtime = createRuntime({
      core: originalCore,
      live: {
        part: { ...toolPart, toolCallId: "call-successor" },
        core: successorCore,
        threadId: "thread-2",
      },
    });

    await runtime.unstable_recordInteraction({
      type: "action",
      payload: { source: "retained" },
    });

    expect(recordOriginal).toHaveBeenCalledExactlyOnceWith({
      messageId: "message-1",
      toolCallId: "call-1",
      interaction: expect.objectContaining({ type: "action" }),
    });
    expect(recordSuccessor).not.toHaveBeenCalled();
  });

  it("uses the live core while it still hosts the captured thread", async () => {
    const { recordOriginal, recordSuccessor, originalCore, successorCore } =
      makeCores();
    const runtime = createRuntime({
      core: originalCore,
      // A reload rebuilt the core object but the thread id is unchanged —
      // the live core is the right target.
      live: {
        part: toolPart,
        core: successorCore,
        threadId: "thread-1",
      },
    });

    await runtime.unstable_recordInteraction({
      type: "action",
      payload: {},
    });

    expect(recordSuccessor).toHaveBeenCalledOnce();
    expect(recordOriginal).not.toHaveBeenCalled();
  });

  it("sends a retained addToolResult with the captured tool call ids, not the successor's", () => {
    const {
      addResultOriginal,
      addResultSuccessor,
      originalCore,
      successorCore,
    } = makeCores();
    const runtime = createRuntime({
      core: originalCore,
      live: {
        part: { ...toolPart, toolCallId: "call-successor", toolName: "other" },
        core: successorCore,
        threadId: "thread-2",
      },
    });

    runtime.addToolResult({ result: "done" });

    expect(addResultOriginal).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        messageId: "message-1",
        toolName: "weather",
        toolCallId: "call-1",
      }),
    );
    expect(addResultSuccessor).not.toHaveBeenCalled();
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
