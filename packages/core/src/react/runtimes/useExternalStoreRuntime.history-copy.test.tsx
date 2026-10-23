// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { CompleteAttachment } from "../../types/attachment";
import type { ThreadMessage, ThreadUserMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

const user = (id: string): ThreadUserMessage => ({
  id,
  role: "user",
  content: [{ type: "text", text: id }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
});

const assistant = (id: string): ThreadMessage => ({
  id,
  role: "assistant",
  content: [{ type: "text", text: id }],
  status: { type: "complete", reason: "stop" },
  createdAt: new Date(0),
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const historyAdapter = () => {
  const unstable_copy = vi.fn(
    async (_branch: readonly ThreadMessage[], _ids: readonly string[]) => {},
  );
  const history: ThreadHistoryAdapter = {
    load: async () => ExportedMessageRepository.fromArray([]),
    append: async () => {},
    unstable_copy,
  };
  return { history, unstable_copy };
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
};

const setup = (
  history?: ThreadHistoryAdapter,
  initial: ExternalStoreAdapter = {
    messages: [],
    isRunning: false,
    onNew: async () => {},
  },
) => {
  let store = initial;
  let runtime: AssistantRuntime | undefined;
  const App = () => {
    runtime = useExternalStoreRuntime(store);
    return null;
  };
  const tree = () =>
    history ? (
      <RuntimeAdapterProvider adapters={{ history }}>
        <App />
      </RuntimeAdapterProvider>
    ) : (
      <App />
    );
  const view = render(tree());
  const update = (next: Partial<ExternalStoreAdapter>) => {
    store = { ...store, ...next };
    act(() => view.rerender(tree()));
  };
  return {
    get runtime() {
      return runtime!;
    },
    update,
    replaceHistory: (next: ThreadHistoryAdapter) => {
      history = next;
      act(() => view.rerender(tree()));
    },
    view,
  };
};

describe("useExternalStoreRuntime history copy", () => {
  it("copies the settled branch in order with new message ids", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history);
    app.update({ isRunning: true });
    app.update({
      isRunning: false,
      messages: [user("user-1"), assistant("assistant-1")],
    });
    await settle();

    expect(unstable_copy).toHaveBeenCalledOnce();
    expect(
      unstable_copy.mock.calls[0]![0].map((message) => message.id),
    ).toEqual(["user-1", "assistant-1"]);
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["user-1", "assistant-1"]);
    app.view.unmount();
  });

  it("does not copy while running", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history);
    app.update({ isRunning: true, messages: [user("user-1")] });
    await settle();
    expect(unstable_copy).not.toHaveBeenCalled();
    app.view.unmount();
  });

  it("does not copy a loaded branch until a run adds a message", async () => {
    const { history, unstable_copy } = historyAdapter();
    const loaded = user("loaded");
    const app = setup(history, {
      messages: [loaded],
      isRunning: false,
      onNew: async () => {},
    });
    await settle();
    expect(unstable_copy).not.toHaveBeenCalled();

    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [loaded, assistant("answer")] });
    await settle();
    expect(
      unstable_copy.mock.calls[0]![0].map((message) => message.id),
    ).toEqual(["loaded", "answer"]);
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["answer"]);
    app.view.unmount();
  });

  it("leaves unchanged messages out of the next run's ids", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history);
    const first = user("user-1");
    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [first] });
    await settle();
    app.update({ isRunning: true });
    app.update({
      isRunning: false,
      messages: [first, assistant("assistant-2")],
    });
    await settle();
    expect(unstable_copy.mock.calls[1]![1]).toEqual(["assistant-2"]);
    app.view.unmount();
  });

  describe("attachment changes", () => {
    const attachment: CompleteAttachment = {
      id: "file-1",
      type: "document",
      name: "report.pdf",
      status: { type: "complete" },
      content: [{ type: "file", data: "cGRm", mimeType: "application/pdf" }],
    };

    it.each([
      { change: "added", before: [], after: [attachment], changed: true },
      { change: "removed", before: [attachment], after: [], changed: true },
      {
        change: "replaced under the same attachment id",
        before: [attachment],
        after: [
          {
            ...attachment,
            content: [
              {
                type: "file" as const,
                data: "bmV3",
                mimeType: "application/pdf",
              },
            ],
          },
        ],
        changed: true,
      },
      {
        change: "recreated with identical values",
        before: [attachment],
        after: [
          {
            ...attachment,
            status: { ...attachment.status },
            content: attachment.content.map((part) => ({ ...part })),
          },
        ],
        changed: false,
      },
    ])(
      "copies only changed messages when attachments are $change",
      async ({ before, after, changed }) => {
        const { history, unstable_copy } = historyAdapter();
        const app = setup(history);
        const first: ThreadUserMessage = {
          ...user("user-1"),
          attachments: before,
        };
        const next: ThreadUserMessage = { ...first, attachments: after };

        app.update({ isRunning: true });
        app.update({ isRunning: false, messages: [first] });
        await settle();
        app.update({ isRunning: true });
        app.update({ isRunning: false, messages: [next, assistant("answer")] });
        await settle();
        app.view.unmount();

        expect(unstable_copy).toHaveBeenCalledTimes(2);
        expect(unstable_copy.mock.calls[1]![1]).toEqual(
          changed ? ["user-1", "answer"] : ["answer"],
        );
        expect(unstable_copy.mock.calls[1]![0][0]).toMatchObject({
          attachments: after,
        });
      },
    );
  });

  it("skips stores that persist their own history", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history, {
      messages: [],
      isRunning: false,
      unstable_persistsHistory: true,
      onNew: async () => {},
    });
    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [user("user-1")] });
    await settle();
    expect(unstable_copy).not.toHaveBeenCalled();
    app.view.unmount();
  });

  it("skips stores that run their own thread list", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history, {
      messages: [],
      isRunning: false,
      adapters: { threadList: { threadId: "backend-thread" } },
      onNew: async () => {},
    });
    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [user("user-1")] });
    await settle();
    expect(unstable_copy).not.toHaveBeenCalled();
    app.view.unmount();
  });

  it("rejects a pending interaction when the runtime unmounts before its copy", async () => {
    const { history, unstable_copy } = historyAdapter();
    const toolMessage = {
      ...assistant("assistant-1"),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
        },
      ],
    } as ThreadMessage;
    const app = setup(history, {
      messages: [toolMessage],
      isRunning: false,
      onNew: async () => {},
    });
    const pending = app.runtime.thread
      .getMessageById("assistant-1")
      .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
      type: "action",
      payload: {},
    });
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
    app.view.unmount();
    await expect(pending).rejects.toThrow("History copy was detached.");
    await settle();
    expect(unstable_copy).not.toHaveBeenCalled();
  });

  it("omits optimistic, fallback, running, and synthetic error messages", async () => {
    const { history, unstable_copy } = historyAdapter();
    const app = setup(history);
    const optimistic = {
      ...assistant("optimistic"),
      metadata: { ...assistant("optimistic").metadata, isOptimistic: true },
    } as ThreadMessage;
    const running = {
      ...assistant("running"),
      status: { type: "running" },
    } as ThreadMessage;
    app.update({ isRunning: true });
    app.update({
      isRunning: false,
      messages: [
        user("user-1"),
        optimistic,
        user("__external_store_fallback_1"),
        user("__error__1"),
        running,
        assistant("assistant-1"),
      ],
    });
    await settle();
    expect(
      unstable_copy.mock.calls[0]![0].map((message) => message.id),
    ).toEqual(["user-1", "assistant-1"]);
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["user-1", "assistant-1"]);
    app.view.unmount();
  });

  it("records an interaction in the copy without changing the runtime message", async () => {
    const { history, unstable_copy } = historyAdapter();
    const toolMessage = {
      ...assistant("assistant-1"),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
        },
      ],
    } as ThreadMessage;
    const app = setup(history, {
      messages: [toolMessage],
      isRunning: false,
      onNew: async () => {},
    });
    await act(async () => {
      await app.runtime.thread
        .getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: { choice: "yes" },
      });
    });

    const copied = unstable_copy.mock.calls[0]![0][0]!;
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["assistant-1"]);
    expect(copied.content[0]).toMatchObject({
      unstable_interactions: {
        entries: [{ type: "action", payload: { choice: "yes" } }],
      },
    });
    expect(toolMessage.content[0]).not.toHaveProperty("unstable_interactions");
    expect(
      app.runtime.thread.getMessageById("assistant-1").getState().content[0],
    ).not.toHaveProperty("unstable_interactions");
    app.view.unmount();
  });

  it("records during a run and copies the interaction with other new messages at run end", async () => {
    const { history, unstable_copy } = historyAdapter();
    const toolMessage = {
      ...assistant("assistant-1"),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
        },
      ],
    } as ThreadMessage;
    const app = setup(history, {
      messages: [toolMessage],
      isRunning: false,
      onNew: async () => {},
    });
    app.update({ isRunning: true });
    app.update({ messages: [toolMessage, user("user-2")] });
    await act(async () => {
      await app.runtime.thread
        .getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: {},
      });
    });
    expect(unstable_copy).not.toHaveBeenCalled();
    app.update({ isRunning: false });
    await settle();
    expect(unstable_copy.mock.calls[0]![1]).toEqual(["assistant-1", "user-2"]);
    app.view.unmount();
  });

  it("keeps a store's own interaction handler", async () => {
    const { history, unstable_copy } = historyAdapter();
    const onRecord = vi.fn(async () => {});
    const toolMessage = {
      ...assistant("assistant-1"),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
        },
      ],
    } as ThreadMessage;
    const app = setup(history, {
      messages: [toolMessage],
      isRunning: false,
      onNew: async () => {},
      unstable_onRecordToolInteraction: onRecord,
    });
    await act(async () => {
      await app.runtime.thread
        .getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: {},
      });
    });
    expect(onRecord).toHaveBeenCalledOnce();
    expect(unstable_copy).not.toHaveBeenCalled();
    app.view.unmount();
  });

  it("rejects an idle interaction when its copy fails", async () => {
    const { history, unstable_copy } = historyAdapter();
    unstable_copy.mockRejectedValueOnce(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const toolMessage = {
      ...assistant("assistant-1"),
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "choose",
          args: {},
          argsText: "{}",
        },
      ],
    } as ThreadMessage;
    const app = setup(history, {
      messages: [toolMessage],
      isRunning: false,
      onNew: async () => {},
    });
    await expect(
      app.runtime.thread
        .getMessageById("assistant-1")
        .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
        type: "action",
        payload: {},
      }),
    ).rejects.toThrow("offline");
    expect(unstable_copy).toHaveBeenCalledOnce();
    warn.mockRestore();
    app.view.unmount();
  });

  it("retries a failed copy with the same ids on the next run end", async () => {
    const { history, unstable_copy } = historyAdapter();
    unstable_copy.mockRejectedValueOnce(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = setup(history);
    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [user("user-1")] });
    await settle();
    app.update({ isRunning: true });
    app.update({ isRunning: false });
    await settle();
    expect(unstable_copy.mock.calls.map((call) => call[1])).toEqual([
      ["user-1"],
      ["user-1"],
    ]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
    app.view.unmount();
  });

  it("queues one more copy when a run ends during an in-flight copy", async () => {
    const { history, unstable_copy } = historyAdapter();
    let finishFirst!: () => void;
    unstable_copy.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    );
    const app = setup(history);
    const first = user("user-1");
    app.update({ isRunning: true });
    app.update({ isRunning: false, messages: [first] });
    await settle();
    app.update({ isRunning: true });
    app.update({
      isRunning: false,
      messages: [first, assistant("assistant-2")],
    });
    await settle();
    expect(unstable_copy).toHaveBeenCalledOnce();
    finishFirst();
    await settle();
    expect(unstable_copy).toHaveBeenCalledTimes(2);
    expect(unstable_copy.mock.calls[1]![1]).toEqual(["assistant-2"]);
    app.view.unmount();
  });

  it("copies through a replacement adapter without letting the old write release its pending copy", async () => {
    vi.useFakeTimers();
    const first = historyAdapter();
    const replacement = historyAdapter();
    const oldWrite = Promise.withResolvers<void>();
    const replacementWrite = Promise.withResolvers<void>();
    first.unstable_copy.mockImplementationOnce(() => oldWrite.promise);
    replacement.unstable_copy.mockImplementationOnce(
      () => replacementWrite.promise,
    );
    const app = setup(first.history);
    const flushCopy = () =>
      act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
    const firstMessage = user("user-1");
    const secondMessage = assistant("assistant-2");

    try {
      app.update({ isRunning: true });
      app.update({ isRunning: false, messages: [firstMessage] });
      await flushCopy();
      expect(first.unstable_copy.mock.calls[0]![1]).toEqual(["user-1"]);

      app.replaceHistory(replacement.history);
      app.update({ isRunning: true });
      app.update({
        isRunning: false,
        messages: [firstMessage, secondMessage],
      });
      await flushCopy();
      expect(
        replacement.unstable_copy.mock.calls.map((call) => call[1]),
      ).toEqual([["assistant-2"]]);

      app.update({ isRunning: true });
      app.update({
        isRunning: false,
        messages: [firstMessage, secondMessage, user("user-3")],
      });
      oldWrite.resolve();
      await flushCopy();
      expect(replacement.unstable_copy).toHaveBeenCalledOnce();

      replacementWrite.resolve();
      await flushCopy();
      expect(
        replacement.unstable_copy.mock.calls.map((call) => call[1]),
      ).toEqual([["assistant-2"], ["user-3"]]);
      expect(
        replacement.unstable_copy.mock.calls[1]![0].map(
          (message) => message.id,
        ),
      ).toEqual(["user-1", "assistant-2", "user-3"]);
    } finally {
      app.view.unmount();
      oldWrite.resolve();
      replacementWrite.resolve();
      await flushCopy();
      vi.useRealTimers();
    }
  });

  it.each(["no history", "history without copy"])(
    "keeps unsupported recording behavior with %s",
    async (caseName) => {
      const { history, unstable_copy } = historyAdapter();
      const toolMessage = {
        ...assistant("assistant-1"),
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "choose",
            args: {},
            argsText: "{}",
          },
        ],
      } as ThreadMessage;
      const app = setup(
        caseName === "no history"
          ? undefined
          : (({ unstable_copy: _, ...rest }) => rest)(history),
        { messages: [toolMessage], isRunning: false, onNew: async () => {} },
      );
      await expect(
        app.runtime.thread
          .getMessageById("assistant-1")
          .getMessagePartByToolCallId("call-1").unstable_recordInteraction!({
          type: "action",
          payload: {},
        }),
      ).rejects.toThrow(
        "Runtime does not support recording tool interactions.",
      );
      app.update({ isRunning: true });
      app.update({ isRunning: false, messages: [toolMessage, user("user-2")] });
      await settle();
      expect(unstable_copy).not.toHaveBeenCalled();
      app.view.unmount();
    },
  );
});
