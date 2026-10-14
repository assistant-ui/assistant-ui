import { describe, it, expect, vi } from "vitest";
import type { AbstractAgent } from "@ag-ui/client";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { AgUiThreadRuntimeCore } from "./AgUiThreadRuntimeCore";
import { makeLogger } from "./logger";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createCore(
  history?: ThreadHistoryAdapter,
  agent = {} as AbstractAgent,
) {
  const core = new AgUiThreadRuntimeCore({
    agent,
    logger: makeLogger(),
    showThinking: true,
    ...(history && { history }),
  });
  const update = (nextHistory?: ThreadHistoryAdapter) =>
    core.updateOptions({
      agent,
      logger: makeLogger(),
      showThinking: true,
      ...(nextHistory && { history: nextHistory }),
    });
  return { core, update };
}

function createHistory() {
  return {
    load: vi.fn().mockResolvedValue({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user" as const,
            content: [{ type: "text" as const, text: "hello" }],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    }),
    append: vi.fn().mockResolvedValue(undefined),
  };
}

const userMessage = (text: string) =>
  ({
    parentId: null,
    role: "user",
    content: [{ type: "text", text }],
    startRun: false,
  }) as unknown as AppendMessage;

const storedUser: ThreadMessage = {
  id: "restored",
  role: "user",
  content: [{ type: "text", text: "earlier" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const storedToolCall: ThreadAssistantMessage = {
  id: "assistant",
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call",
      toolName: "lookup",
      args: {},
      argsText: "{}",
    },
  ],
  status: { type: "requires-action", reason: "tool-calls" },
  createdAt: new Date(0),
  metadata: {
    custom: {},
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
  },
};

const storedInterrupt: ThreadAssistantMessage = {
  ...storedToolCall,
  status: { type: "requires-action", reason: "interrupt" },
  content: [
    {
      ...storedToolCall.content[0]!,
      approval: { id: "gate", prompt: "Continue?" },
    },
  ] as ThreadAssistantMessage["content"],
  metadata: {
    ...storedToolCall.metadata,
    custom: {
      agui: {
        interrupts: [{ id: "gate", reason: "tool_call", toolCallId: "call" }],
      },
    },
  },
};

function deferredHistory(messages: ThreadMessage[] = [storedUser]) {
  let finishLoad!: (
    repo: Awaited<ReturnType<ThreadHistoryAdapter["load"]>>,
  ) => void;
  const load = vi.fn(
    () =>
      new Promise<Awaited<ReturnType<ThreadHistoryAdapter["load"]>>>(
        (resolve) => {
          finishLoad = resolve;
        },
      ),
  );
  const history: ThreadHistoryAdapter = {
    load,
    append: vi.fn().mockResolvedValue(undefined),
  };
  return {
    history,
    finish: (unstableResume = false) =>
      finishLoad({
        headId: messages.at(-1)?.id ?? null,
        ...(unstableResume && { unstable_resume: true }),
        messages: messages.map((message, index) => ({
          parentId: messages[index - 1]?.id ?? null,
          message,
        })),
      }),
  };
}

describe("AgUiThreadRuntimeCore late history loading", () => {
  it("drops a queued send when loading is cancelled", async () => {
    const { history, finish } = deferredHistory();
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const sending = core.append(userMessage("cancelled"));

    await core.cancel();
    finish();
    await Promise.all([loading, sending]);

    expect(core.getMessages().map((message) => message.id)).toEqual([
      "restored",
    ]);
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("sends while the restored stream is still open after cancelling a queued send", async () => {
    const { history, finish } = deferredHistory();
    history.resume = async function* ({ abortSignal }) {
      yield {
        content: [{ type: "text", text: "partial" }],
        status: { type: "running" },
      };
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
    };
    const runAgent = vi.fn(async (_input: unknown) => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const cancelled = core.append({
      ...userMessage("cancelled"),
      startRun: true,
    });
    await core.cancel();
    finish(true);
    await vi.waitFor(() => expect(core.isRunning()).toBe(true));
    expect(core.isLoading).toBe(true);

    const sending = core.append({
      ...userMessage("sent during resume"),
      parentId: core.getMessages().at(-1)?.id ?? null,
      startRun: true,
    });
    await Promise.all([loading, cancelled, sending]);

    expect(
      core
        .getMessages()
        .filter((message) => message.role === "user")
        .map((message) => message.content[0]),
    ).toEqual([
      { type: "text", text: "earlier" },
      { type: "text", text: "sent during resume" },
    ]);
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("waits for history before reloading", async () => {
    const { history, finish } = deferredHistory();
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const reloading = core.reload("restored");

    expect(runAgent).not.toHaveBeenCalled();
    finish();
    await Promise.all([loading, reloading]);
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("waits for history before resuming a run", async () => {
    const { history, finish } = deferredHistory();
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const resuming = core.resume({
      parentId: "restored",
      sourceId: null,
      runConfig: {},
    });

    expect(runAgent).not.toHaveBeenCalled();
    finish();
    await Promise.all([loading, resuming]);
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("waits for history before resuming an in-flight run", async () => {
    const { history, finish } = deferredHistory();
    const resume = vi.fn(async function* () {
      yield {
        content: [{ type: "text" as const, text: "continued" }],
        status: { type: "complete" as const, reason: "unknown" as const },
      };
    });
    history.resume = resume;
    const { core } = createCore(history);
    const loading = core.__internal_load();
    const resuming = core.resumeInFlightRun([storedUser]);

    expect(resume).not.toHaveBeenCalled();
    finish();
    await Promise.all([loading, resuming]);
    expect(resume).toHaveBeenCalledOnce();
  });

  it("waits for history before applying a tool result", async () => {
    const { history, finish } = deferredHistory([storedUser, storedToolCall]);
    const { core } = createCore(history);
    const loading = core.__internal_load();
    core.addToolResult({
      messageId: "assistant",
      toolCallId: "call",
      toolName: "lookup",
      result: "found",
      isError: false,
    });

    finish();
    await loading;
    expect(
      (core.getMessages()[1] as ThreadAssistantMessage).content[0],
    ).toMatchObject({
      result: "found",
    });
  });

  it("waits for history before recording a tool interaction", async () => {
    const { history, finish } = deferredHistory([storedUser, storedToolCall]);
    const { core } = createCore(history);
    const loading = core.__internal_load();
    const recording = core.recordToolInteraction({
      messageId: "assistant",
      toolCallId: "call",
      interaction: {
        type: "action",
        occurredAt: 1,
        payload: { name: "confirm" },
      },
    });

    finish();
    await Promise.all([loading, recording]);
    expect(
      (core.getMessages()[1] as ThreadAssistantMessage).content[0],
    ).toMatchObject({
      unstable_interactions: { entries: [{ payload: { name: "confirm" } }] },
    });
  });

  it("waits for history before submitting interrupt responses", async () => {
    const { history, finish } = deferredHistory([storedUser, storedInterrupt]);
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const responding = core.submitInterruptResponses([
      { interruptId: "gate", status: "resolved" },
    ]);

    finish();
    await Promise.all([loading, responding]);
    expect(runAgent).toHaveBeenCalledOnce();
    expect(core.getPendingInterrupts()).toBeNull();
  });

  it("waits for history before responding to a tool approval", async () => {
    const { history, finish } = deferredHistory([storedUser, storedInterrupt]);
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const responding = core.respondToToolApproval({
      approvalId: "gate",
      approved: true,
    });

    finish();
    await Promise.all([loading, responding]);
    expect(runAgent).toHaveBeenCalledOnce();
    expect(
      (core.getMessages()[1] as ThreadAssistantMessage).content[0],
    ).toMatchObject({
      approval: { id: "gate", approved: true },
    });
  });

  it("waits for history before steering away from an interrupt", async () => {
    const { history, finish } = deferredHistory([storedUser, storedInterrupt]);
    const runAgent = vi.fn(async () => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    const steering = core.steerAway("changed my mind");

    finish();
    await Promise.all([loading, steering]);
    expect(core.getPendingInterrupts()).toBeNull();
    expect(
      core
        .getMessages()
        .some((message) =>
          message.content.some(
            (part) => part.type === "text" && part.text === "changed my mind",
          ),
        ),
    ).toBe(true);
    expect(runAgent).toHaveBeenCalledOnce();
  });

  it("waits for history before sending an A2UI action", async () => {
    const { history, finish } = deferredHistory();
    const runAgent = vi.fn(async (_input: unknown) => {});
    const { core } = createCore(history, {
      runAgent,
      abortRun: vi.fn(),
    } as unknown as AbstractAgent);
    const loading = core.__internal_load();
    core.sendA2uiAction({ type: "a2ui:action", name: "submit" });

    finish();
    await loading;
    expect(runAgent).toHaveBeenCalledOnce();
    expect(runAgent.mock.calls[0]?.[0]).toMatchObject({
      forwardedProps: { a2uiAction: { userAction: { name: "submit" } } },
    });
  });

  it("links a new tail append after initial history imports", async () => {
    const history = createHistory();
    let finishLoad!: (
      repo: Awaited<ReturnType<ThreadHistoryAdapter["load"]>>,
    ) => void;
    history.load.mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoad = resolve;
      }),
    );
    const { core } = createCore(history);
    const loading = core.__internal_load();
    const sending = core.append(userMessage("during load"));

    finishLoad({
      headId: "restored",
      messages: [
        {
          parentId: null,
          message: {
            id: "restored",
            role: "user",
            content: [{ type: "text", text: "earlier" }],
            attachments: [],
            createdAt: new Date(0),
            metadata: { custom: {} },
          },
        },
      ],
    });
    await Promise.all([loading, sending]);

    expect(core.getMessages().map((message) => message.content)).toEqual([
      [{ type: "text", text: "earlier" }],
      [{ type: "text", text: "during load" }],
    ]);
    expect(core.getMessageRepository().messages.at(-1)?.parentId).toBe(
      "restored",
    );
  });

  it("loads history when the adapter arrives after the first load", async () => {
    const { core, update } = createCore();
    const history = createHistory();

    await core.__internal_load();
    expect(history.load).not.toHaveBeenCalled();
    expect(core.getMessages()).toEqual([]);

    update(history);
    await flush();

    expect(history.load).toHaveBeenCalledOnce();
    expect(core.getMessages().map((message) => message.id)).toEqual([
      "restored",
    ]);
    expect(core.isLoading).toBe(false);
  });

  it("does not load late history over a thread that already has messages", async () => {
    const { core, update } = createCore();
    const history = createHistory();

    await core.__internal_load();
    await core.append(userMessage("typed"));
    expect(core.getMessages()).toHaveLength(1);

    update(history);
    await flush();

    expect(history.load).not.toHaveBeenCalled();
    expect(core.getMessages()).toHaveLength(1);
  });

  it("does not reload when the adapter is replaced after a completed load", async () => {
    const history = createHistory();
    const { core, update } = createCore(history);
    const replacement = createHistory();

    await core.__internal_load();
    expect(history.load).toHaveBeenCalledOnce();

    update(replacement);
    await flush();

    expect(replacement.load).not.toHaveBeenCalled();
  });
});

describe("AgUiThreadRuntimeCore steerAway parent selection", () => {
  it("starts a root branch for an explicit null parent", async () => {
    const { core } = createCore();
    await core.append(userMessage("old"));

    await core.steerAway({
      parentId: null,
      content: [{ type: "text", text: "new root" }],
      startRun: false,
    });

    expect(core.getMessages().map((message) => message.content)).toEqual([
      [{ type: "text", text: "new root" }],
    ]);
    expect(core.getMessageRepository().messages.at(-1)?.parentId).toBeNull();
  });
});

describe("AgUiThreadRuntimeCore activity deltas", () => {
  it("applies a delta to the snapshot the run streamed", async () => {
    type Subscriber = Record<string, ((payload?: unknown) => void) | undefined>;
    const runAgent = vi.fn(async (_input: unknown, subscriber: Subscriber) => {
      subscriber.onActivitySnapshotEvent?.({
        event: {
          type: "ACTIVITY_SNAPSHOT",
          messageId: "act-1",
          activityType: "progress",
          content: { step: 1, label: "loading" },
          replace: true,
        },
      });
      subscriber.onActivityDeltaEvent?.({
        event: {
          type: "ACTIVITY_DELTA",
          messageId: "act-1",
          activityType: "progress",
          patch: [{ op: "replace", path: "/step", value: 2 }],
        },
      });
      subscriber.onRunFinalized?.();
    });
    const agent = { runAgent, abortRun: vi.fn() } as unknown as AbstractAgent;
    const core = new AgUiThreadRuntimeCore({
      agent,
      logger: makeLogger(),
      showThinking: true,
    });

    await core.append({ ...userMessage("go"), startRun: true });
    await flush();

    const assistant = core.getMessages().at(-1)!;
    expect(assistant.content.find((part) => part.type === "data")).toEqual({
      type: "data",
      name: "agui-activity/progress",
      data: { step: 2, label: "loading" },
    });
  });
});
