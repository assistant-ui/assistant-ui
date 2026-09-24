// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { ThreadMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

const user = (id: string): ThreadMessage => ({
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
