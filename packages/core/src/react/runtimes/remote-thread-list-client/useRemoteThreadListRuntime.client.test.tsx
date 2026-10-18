// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import type { ChatModelAdapter } from "../../../index";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../../types/message";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";
import {
  actSettled,
  deferred,
  makeAdapter,
} from "../../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import {
  RuntimeAdapterProvider,
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "../RuntimeAdapterProvider";
import { useExternalStoreRuntime } from "../useExternalStoreRuntime";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { RemoteThreadListHookInstanceManager } from "../RemoteThreadListHookInstanceManager";

const { legacyConstructed } = vi.hoisted(() => ({
  legacyConstructed: vi.fn(),
}));

vi.mock("../RemoteThreadListThreadListRuntimeCore", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("../RemoteThreadListThreadListRuntimeCore")
    >();
  return {
    ...original,
    RemoteThreadListThreadListRuntimeCore: class
      extends original.RemoteThreadListThreadListRuntimeCore
    {
      constructor(
        ...args: ConstructorParameters<
          typeof original.RemoteThreadListThreadListRuntimeCore
        >
      ) {
        super(...args);
        legacyConstructed();
      }
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  legacyConstructed.mockClear();
});

const useEmptyThreadRuntime = () =>
  useExternalStoreRuntime({ messages: [], onNew: async () => {} } as never);

describe.each(["class", "client"] as const)(
  "%s selection contracts",
  (path) => {
    it("waits for hosted history to finish loading before claiming an automatic title", async () => {
      const adapter = makeAdapter({
        ...(path === "class" ? { unstable_Provider: Fragment } : {}),
      });
      const partialMessages: readonly ThreadMessage[] = [
        {
          id: "partial",
          role: "user",
          content: [{ type: "text", text: "Partial history" }],
          attachments: [],
          createdAt: new Date(0),
          metadata: { custom: {} },
        },
      ];
      const loadedMessages: readonly ThreadMessage[] = [
        ...partialMessages,
        {
          id: "loaded",
          role: "user",
          content: [{ type: "text", text: "Loaded history" }],
          attachments: [],
          createdAt: new Date(1),
          metadata: { custom: {} },
        },
      ];
      let runtime!: AssistantRuntime;
      const App = ({
        isLoading,
        messages,
      }: {
        isLoading: boolean;
        messages: readonly ThreadMessage[];
      }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            return useExternalStoreRuntime({
              isLoading,
              messages,
              onNew: async () => {},
            });
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      const view = render(<App isLoading messages={partialMessages} />);
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      await actSettled(() => runtime.threads.mainItem.initialize());
      const remoteId = runtime.threads.mainItem.getState().remoteId;
      expect(runtime.thread.getState().isLoading).toBe(true);
      expect(adapter.generateTitle).not.toHaveBeenCalled();

      view.rerender(<App isLoading messages={loadedMessages} />);
      await act(async () => {});
      expect(adapter.generateTitle).not.toHaveBeenCalled();

      view.rerender(<App isLoading={false} messages={loadedMessages} />);
      await waitFor(() =>
        expect(adapter.generateTitle).toHaveBeenCalledExactlyOnceWith(
          remoteId,
          loadedMessages.map((message) => expect.objectContaining(message)),
        ),
      );
      view.rerender(<App isLoading={false} messages={partialMessages} />);
      await act(async () => {});
      expect(adapter.generateTitle).toHaveBeenCalledTimes(1);
    });

    it.each([
      { origin: "listed", outcome: "retained" },
      { origin: "promoted", outcome: "retained" },
      { origin: "listed", outcome: "removed" },
      { origin: "listed", outcome: "failed" },
    ] as const)(
      "reconciles a replacement adapter with a $outcome $origin active runtime",
      async ({ origin, outcome }) => {
        const error = new Error("replacement offline");
        if (outcome === "failed") {
          vi.spyOn(console, "error").mockImplementation(() => {});
        }
        const adapter = makeAdapter({
          list: vi.fn(async () => ({
            threads: [
              { status: "regular" as const, remoteId: "one" },
              { status: "regular" as const, remoteId: "removed" },
            ],
          })),
          initialize: vi.fn(async () => ({ remoteId: "promoted" })),
          ...(path === "class" ? { unstable_Provider: Fragment } : {}),
        });
        const listed =
          deferred<Awaited<ReturnType<RemoteThreadListAdapter["list"]>>>();
        const replacement = makeAdapter({
          list: vi.fn(() => listed.promise),
          ...(path === "class" ? { unstable_Provider: Fragment } : {}),
        });
        const model = { run: vi.fn(async () => ({ content: [] })) };
        const mounted = vi.fn();
        const retired = vi.fn();
        let runtime!: AssistantRuntime;
        const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
          runtime = useRemoteThreadListRuntime({
            adapter,
            runtimeHook: function useThreadRuntime() {
              const id = useAui().threadListItem.getState().id;
              useEffect(() => {
                mounted(id);
                return () => {
                  retired(id);
                };
              }, [id]);
              return useLocalRuntime(model);
            },
          });
          return (
            <AssistantRuntimeProvider runtime={runtime}>
              {null}
            </AssistantRuntimeProvider>
          );
        };
        const view = render(<App adapter={adapter} />);
        await actSettled(() => runtime.threads.getLoadThreadsPromise());
        const activeId =
          origin === "listed" ? "one" : runtime.threads.getState().mainThreadId;
        if (origin === "promoted") {
          await actSettled(() => runtime.threads.mainItem.initialize());
        }
        await actSettled(() => runtime.threads.switchToThread("removed"));
        await actSettled(() => runtime.threads.switchToThread(activeId));
        act(() => runtime.thread.composer.setText("keep composing"));
        mounted.mockClear();
        retired.mockClear();

        view.rerender(<App adapter={replacement} />);
        await waitFor(() => expect(replacement.list).toHaveBeenCalledTimes(1));
        expect(runtime.threads.getState().mainThreadId).toBe(activeId);
        expect(runtime.thread.composer.getState().text).toBe("keep composing");
        expect(retired).not.toHaveBeenCalled();

        await act(async () => {
          if (outcome === "failed") listed.reject(error);
          else
            listed.resolve({
              threads:
                outcome === "removed"
                  ? []
                  : [
                      {
                        status: "regular",
                        remoteId: origin === "listed" ? "one" : "promoted",
                        title: "replacement title",
                      },
                    ],
            });
        });
        await waitFor(() =>
          expect(runtime.threads.getState().isLoading).toBe(false),
        );

        expect(retired).toHaveBeenCalledWith("removed");
        expect(mounted).not.toHaveBeenCalledWith(activeId);
        if (outcome === "retained") {
          expect(runtime.threads.getState().mainThreadId).toBe(activeId);
          expect(runtime.thread.getState().threadId).toBe(activeId);
          expect(runtime.thread.composer.getState().text).toBe(
            "keep composing",
          );
          expect(runtime.threads.mainItem.getState().title).toBe(
            "replacement title",
          );
          expect(retired).not.toHaveBeenCalledWith(activeId);
          expect(runtime.threads.getState().threadIds).toEqual([activeId]);
        } else {
          expect(runtime.threads.getState().mainThreadId).not.toBe(activeId);
          expect(runtime.threads.mainItem.getState().status).toBe("new");
          expect(runtime.thread.composer.getState().text).toBe("");
          expect(retired).toHaveBeenCalledWith(activeId);
          expect(runtime.threads.getState().threadIds).toEqual([]);
          expect(runtime.threads.getState().loadError).toBe(
            outcome === "failed" ? error : undefined,
          );
        }
      },
    );

    it("keeps replacing the list when a reload supersedes the replacement load", async () => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "one" },
            { status: "regular" as const, remoteId: "removed" },
          ],
        })),
        ...(path === "class" ? { unstable_Provider: Fragment } : {}),
      });
      const firstPage =
        deferred<Awaited<ReturnType<RemoteThreadListAdapter["list"]>>>();
      const secondPage =
        deferred<Awaited<ReturnType<RemoteThreadListAdapter["list"]>>>();
      const replacement = makeAdapter({
        list: vi
          .fn()
          .mockReturnValueOnce(firstPage.promise)
          .mockReturnValueOnce(secondPage.promise),
        ...(path === "class" ? { unstable_Provider: Fragment } : {}),
      });
      const model = { run: vi.fn(async () => ({ content: [] })) };
      const retired = vi.fn();
      let runtime!: AssistantRuntime;
      const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            const id = useAui().threadListItem.getState().id;
            useEffect(
              () => () => {
                retired(id);
              },
              [id],
            );
            return useLocalRuntime(model);
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      const view = render(<App adapter={adapter} />);
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      await actSettled(() => runtime.threads.switchToThread("removed"));
      await actSettled(() => runtime.threads.switchToThread("one"));
      retired.mockClear();

      view.rerender(<App adapter={replacement} />);
      await waitFor(() => expect(replacement.list).toHaveBeenCalledTimes(1));
      let reloaded!: Promise<void>;
      act(() => {
        reloaded = runtime.threads.reload();
      });
      await waitFor(() => expect(replacement.list).toHaveBeenCalledTimes(2));

      await act(async () => {
        firstPage.resolve({ threads: [] });
        secondPage.resolve({
          threads: [{ status: "regular", remoteId: "one" }],
        });
        await reloaded;
      });
      await waitFor(() =>
        expect(runtime.threads.getState().isLoading).toBe(false),
      );

      expect(retired).toHaveBeenCalledWith("removed");
      expect(retired).not.toHaveBeenCalledWith("one");
      expect(runtime.threads.getState().mainThreadId).toBe("one");
      expect(runtime.threads.getState().threadIds).toEqual(["one"]);
    });

    it.each(["existing", "fresh"] as const)(
      "publishes the attached %s draft before switchToNewThread resolves",
      async (draft) => {
        const adapter = makeAdapter({
          list: vi.fn(async () => ({
            threads: [{ status: "regular" as const, remoteId: "one" }],
          })),
          ...(path === "class" ? { unstable_Provider: Fragment } : {}),
        });
        const model = { run: vi.fn(async () => ({ content: [] })) };
        let runtime!: AssistantRuntime;
        const App = () => {
          runtime = useRemoteThreadListRuntime({
            adapter,
            runtimeHook: function useThreadRuntime() {
              return useLocalRuntime(model);
            },
          });
          return (
            <AssistantRuntimeProvider runtime={runtime}>
              {null}
            </AssistantRuntimeProvider>
          );
        };
        render(<App />);
        await actSettled(() => runtime.threads.getLoadThreadsPromise());
        if (draft === "fresh") {
          await actSettled(() => runtime.threads.mainItem.initialize());
        }
        await actSettled(() => runtime.threads.switchToThread("one"));
        act(() => runtime.thread.composer.setText("keep one"));

        let selectedId!: string;
        let runtimeId!: string;
        await actSettled(() =>
          runtime.threads.switchToNewThread().then(() => {
            selectedId = runtime.threads.getState().mainThreadId;
            runtimeId = runtime.thread.getState().threadId;
            runtime.thread.composer.setText("draft text");
          }),
        );

        expect(selectedId).not.toBe("one");
        expect(runtimeId).toBe(selectedId);
        expect(runtime.threads.mainItem.getState().status).toBe("new");
        expect(runtime.thread.composer.getState().text).toBe("draft text");
        expect(runtime.threads.getById("one").composer.getState().text).toBe(
          "keep one",
        );
      },
    );
  },
);

describe("useRemoteThreadListRuntime client bridge", () => {
  it.each(["no provider", "useAdapters"] as const)(
    "warns once per provider-only interval and rearms after %s",
    async (exit) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let runtime!: AssistantRuntime;
      const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: useEmptyThreadRuntime,
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      const view = render(<App adapter={makeAdapter()} />);
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      expect(warn).not.toHaveBeenCalled();

      for (let render = 0; render < 3; render++) {
        view.rerender(
          <App adapter={makeAdapter({ unstable_Provider: Fragment })} />,
        );
        await actSettled(() => runtime.threads.getLoadThreadsPromise());
        expect(warn).toHaveBeenCalledTimes(1);
      }
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unstable_useAdapters"),
      );

      view.rerender(
        <App
          adapter={makeAdapter(
            exit === "useAdapters"
              ? {
                  unstable_Provider: Fragment,
                  unstable_useAdapters: () => ({}),
                }
              : {},
          )}
        />,
      );
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      expect(warn).toHaveBeenCalledTimes(1);

      view.rerender(
        <App adapter={makeAdapter({ unstable_Provider: Fragment })} />,
      );
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      expect(warn).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["supersede", "dispose"] as const)(
    "settles an unattached draft switch on %s",
    async (action) => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [{ status: "regular" as const, remoteId: "one" }],
        })),
      });
      const model = { run: vi.fn(async () => ({ content: [] })) };
      let runtime!: AssistantRuntime;
      const App = ({ hosted }: { hosted: boolean }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            return useLocalRuntime(model);
          },
        });
        return hosted ? (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        ) : null;
      };
      const view = render(<App hosted />);
      await actSettled(() => runtime.threads.getLoadThreadsPromise());
      await actSettled(() => runtime.threads.mainItem.initialize());
      await actSettled(() => runtime.threads.switchToThread("one"));
      view.rerender(<App hosted={false} />);

      const settled = vi.fn();
      let task!: Promise<void>;
      await act(async () => {
        task = runtime.threads.switchToNewThread();
        void task.then(settled, settled);
      });
      expect(settled).not.toHaveBeenCalled();
      expect(runtime.threads.getState().mainThreadId).toBe("one");

      if (action === "supersede") {
        await actSettled(() => runtime.threads.switchToThread("one"));
      } else {
        view.unmount();
      }
      await waitFor(() => expect(settled).toHaveBeenCalledTimes(1));
      await task;
      if (action === "supersede") {
        view.rerender(<App hosted />);
        await act(async () => {});
        expect(runtime.threads.getState().mainThreadId).toBe("one");
      }
    },
  );

  it("waits for reload after a failed list when the controlled ID changes", async () => {
    const error = new Error("offline");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "one" }],
      });
    const updateCustom = vi.fn(async () => {});
    const adapter = makeAdapter({ list, updateCustom });
    let runtime: AssistantRuntime | undefined;
    const App = ({ threadId }: { threadId: string }) => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        threadId,
        runtimeHook: useEmptyThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App threadId="one" />);
    await waitFor(() =>
      expect(runtime!.threads.getState().loadError).toBe(error),
    );
    expect(list).toHaveBeenCalledTimes(1);

    rerender(<App threadId="two" />);
    await act(async () => {});
    expect(list).toHaveBeenCalledTimes(1);

    await actSettled(() => runtime!.threads.reload());
    expect(list).toHaveBeenCalledTimes(2);
    expect(runtime!.threads.getState().loadError).toBeUndefined();
    await act(async () =>
      runtime!.threads.getItemById("one").updateCustom({ recovered: true }),
    );
    expect(updateCustom).toHaveBeenCalledWith("one", { recovered: true });
  });

  it("forwards item custom updates to the adapter", async () => {
    const custom = { color: "blue" };
    const updateCustom = vi.fn(async () => {});
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "one", custom: {} }],
      })),
      updateCustom,
    });
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useEmptyThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain("one"),
    );
    await act(async () =>
      runtime!.threads.getItemById("one").updateCustom(custom),
    );
    expect(updateCustom).toHaveBeenCalledWith("one", custom);
    expect(runtime!.threads.getItemById("one").getState().custom).toEqual(
      custom,
    );
  });

  it("generates an item title from its hosted messages", async () => {
    const messages: readonly ThreadMessage[] = [
      {
        id: "message-one",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        attachments: [],
        createdAt: new Date(0),
        metadata: { custom: {} },
      },
    ];
    const generateTitle = vi.fn(
      async () =>
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
    );
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "one" }],
      })),
      generateTitle,
    });
    let runtime: AssistantRuntime | undefined;
    const useThreadRuntime = () =>
      useExternalStoreRuntime({ messages, onNew: async () => {} });
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        threadId: "one",
        runtimeHook: useThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain("one"),
    );
    await waitFor(() =>
      expect(runtime!.thread.getState().messages).toHaveLength(1),
    );
    generateTitle.mockClear();
    await act(async () => runtime!.threads.getItemById("one").generateTitle());
    expect(generateTitle).toHaveBeenCalledWith(
      "one",
      expect.arrayContaining([
        expect.objectContaining({ id: "message-one", role: "user" }),
      ]),
    );
  });

  it("lists threads, initializes a sent draft, and keeps the main runtime bound across switches", async () => {
    const adapter = new InMemoryThreadListAdapter();
    const initialize = vi.spyOn(adapter, "initialize");
    const model = {
      run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
        content: [],
      })),
    };
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime(model),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    expect(legacyConstructed).not.toHaveBeenCalled();
    expect(runtime!.threads.getState().threadIds).toEqual([]);
    expect(runtime!.thread).toBe(runtime!.threads.main);
    const firstId = runtime!.threads.getState().mainThreadId;

    await act(async () => {
      runtime!.thread.composer.setText("first");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(firstId));
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain(firstId),
    );

    await actSettled(() => runtime!.threads.switchToNewThread());
    const nextId = runtime!.threads.getState().mainThreadId;
    expect(nextId).not.toBe(firstId);
    await act(async () => {
      runtime!.thread.composer.setText("hello");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(nextId));
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain(nextId),
    );
    await waitFor(() => expect(model.run).toHaveBeenCalled());
    expect(model.run.mock.calls[0]?.[0].unstable_threadId).toBeDefined();

    await actSettled(() => runtime!.threads.switchToThread(firstId));
    await waitFor(() =>
      expect(runtime!.threads.getState().mainThreadId).toBe(firstId),
    );
    expect(runtime!.thread.getState().threadId).toBe(firstId);
    expect(runtime!.thread).toBe(runtime!.threads.main);
  });

  it("provides inherited and thread list adapters to each hosted runtime hook", async () => {
    const attachments = {
      accept: "image/*",
      add: vi.fn(),
      remove: vi.fn(),
      send: vi.fn(),
    };
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const adapter = Object.assign(new InMemoryThreadListAdapter(), {
      unstable_useAdapters: () => ({ history }),
    });
    const model = { run: vi.fn(async () => ({ content: [] })) };
    const seen = new Map<string, RuntimeAdapters | null>();
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: function useThreadRuntime() {
          const id = useAui().threadListItem.getState().id;
          seen.set(id, useRuntimeAdapters());
          return useLocalRuntime(model);
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(
      <RuntimeAdapterProvider adapters={{ attachments }}>
        <App />
      </RuntimeAdapterProvider>,
    );
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    expect(legacyConstructed).not.toHaveBeenCalled();
    const firstId = runtime!.threads.getState().mainThreadId;
    await waitFor(() => expect(seen.get(firstId)?.history).toBe(history));
    expect(seen.get(firstId)?.attachments).toBe(attachments);

    await act(async () => {
      runtime!.thread.composer.setText("first");
      runtime!.thread.composer.send();
    });
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain(firstId),
    );
    await actSettled(() => runtime!.threads.switchToNewThread());
    const nextId = runtime!.threads.getState().mainThreadId;
    expect(nextId).not.toBe(firstId);
    await waitFor(() => expect(seen.get(nextId)?.history).toBe(history));
    expect(seen.get(nextId)?.attachments).toBe(attachments);
  });

  it.each(["adds", "removes", "replaces"] as const)(
    "preserves the hosted runtime when an adapter swap %s unstable_useAdapters",
    async (change) => {
      const errors = vi.spyOn(console, "error");
      const inheritedHistory = {
        load: vi.fn(async () => ({ messages: [] })),
        append: vi.fn(async () => {}),
      };
      const suppliedHistory = {
        load: vi.fn(async () => ({ messages: [] })),
        append: vi.fn(async () => {}),
      };
      const plain = new InMemoryThreadListAdapter();
      const hooked = Object.assign(new InMemoryThreadListAdapter(), {
        unstable_useAdapters: function useAdapters() {
          const [history] = useState(suppliedHistory);
          return { history };
        },
      });
      const replacement = Object.assign(new InMemoryThreadListAdapter(), {
        unstable_useAdapters: function useAdapters() {
          const [history] = useState(inheritedHistory);
          useEffect(() => {}, []);
          return { history };
        },
      });
      const initial = change === "adds" ? plain : hooked;
      const next =
        change === "adds" ? hooked : change === "removes" ? plain : replacement;
      const model = { run: vi.fn(async () => ({ content: [] })) };
      let seen: RuntimeAdapters | null = null;
      let runtime!: AssistantRuntime;
      const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            seen = useRuntimeAdapters();
            return useLocalRuntime(model);
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      const view = render(<App adapter={initial} />, {
        wrapper: ({ children }) => (
          <RuntimeAdapterProvider adapters={{ history: inheritedHistory }}>
            {children}
          </RuntimeAdapterProvider>
        ),
      });
      await waitFor(() => {
        expect(runtime.threads.getState().isLoading).toBe(false);
        expect(seen?.history).toBe(
          change === "adds" ? inheritedHistory : suppliedHistory,
        );
      });
      const threadId = runtime.threads.getState().mainThreadId;
      act(() => runtime.thread.composer.setText("keep composing"));

      expect(() => view.rerender(<App adapter={next} />)).not.toThrow();
      await waitFor(() => {
        expect(runtime.threads.getState().isLoading).toBe(false);
        expect(seen?.history).toBe(
          change === "adds" ? suppliedHistory : inheritedHistory,
        );
      });
      expect(runtime.threads.getState().mainThreadId).toBe(threadId);
      expect(runtime.thread.composer.getState().text).toBe("keep composing");
      expect(errors).not.toHaveBeenCalled();
      expect(legacyConstructed).not.toHaveBeenCalled();
    },
  );

  it("resolves a promoted draft by remote ID and switches back to its hosted runtime", async () => {
    const initialize = vi.fn(async (id: string) => ({
      remoteId: `remote-${id}`,
    }));
    const adapter = makeAdapter({ initialize });
    const model = {
      run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
        content: [],
      })),
    };
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime(model),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    expect(legacyConstructed).not.toHaveBeenCalled();
    const localId = runtime!.threads.getState().mainThreadId;
    const remoteId = `remote-${localId}`;

    await act(async () => {
      runtime!.thread.composer.setText("first");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(localId));
    await waitFor(() =>
      expect(runtime!.threads.getItemById(localId).getState().remoteId).toBe(
        remoteId,
      ),
    );
    expect(runtime!.threads.getItemById(remoteId).getState()).toEqual(
      runtime!.threads.getItemById(localId).getState(),
    );
    expect(runtime!.threads.getItemById(remoteId).getState().id).toBe(localId);
    await waitFor(() => expect(model.run).toHaveBeenCalledTimes(1));
    const firstRunThreadId = model.run.mock.calls[0]?.[0].unstable_threadId;
    expect(firstRunThreadId).toBe(remoteId);

    await actSettled(() => runtime!.threads.switchToNewThread());
    expect(runtime!.threads.getState().mainThreadId).not.toBe(localId);
    await actSettled(() => runtime!.threads.switchToThread(remoteId));
    expect(runtime!.threads.getState().mainThreadId).toBe(localId);
    expect(runtime!.thread.getState().threadId).toBe(localId);
    model.run.mockClear();
    await act(async () => {
      runtime!.thread.composer.setText("again");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(model.run).toHaveBeenCalledTimes(1));
    expect(model.run.mock.calls[0]?.[0].unstable_threadId).toBe(
      firstRunThreadId,
    );
  });

  it("hands the remote ID to a runtime the hook swaps in while the thread initializes", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: string | undefined;
    }>();
    const initialize = vi.fn(() => initialization.promise);
    const adapter = makeAdapter({ initialize });
    const makeModel = () => ({
      run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
        content: [],
      })),
    });
    const firstModel = makeModel();
    const secondModel = makeModel();
    let swap!: () => void;
    const useSwappingRuntime = () => {
      const first = useLocalRuntime(firstModel);
      const second = useLocalRuntime(secondModel);
      const [swapped, setSwapped] = useState(false);
      swap = () => setSwapped(true);
      return swapped ? second : first;
    };
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useSwappingRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    const localId = runtime!.threads.getState().mainThreadId;

    await act(async () => {
      runtime!.thread.composer.setText("first");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    await act(async () => swap());
    await act(async () => {
      runtime!.thread.composer.setText("second");
      runtime!.thread.composer.send();
    });
    await act(async () =>
      initialization.resolve({
        remoteId: `remote-${localId}`,
        externalId: undefined,
      }),
    );

    await waitFor(() => expect(secondModel.run).toHaveBeenCalledTimes(1));
    expect(secondModel.run.mock.calls[0]?.[0].unstable_threadId).toBe(
      `remote-${localId}`,
    );
  });

  it.each(["delete", "archive"] as const)(
    "hosts the fallback draft after the main thread is %sd",
    async (action) => {
      const adapter = new InMemoryThreadListAdapter();
      const initialize = vi.spyOn(adapter, "initialize");
      const model = {
        run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
          content: [],
        })),
      };
      let runtime: AssistantRuntime | undefined;
      const App = () => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: () => useLocalRuntime(model),
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      render(<App />);
      await waitFor(() =>
        expect(runtime!.threads.getState().isLoading).toBe(false),
      );
      expect(legacyConstructed).not.toHaveBeenCalled();
      const firstId = runtime!.threads.getState().mainThreadId;

      await act(async () => {
        runtime!.thread.composer.setText("first");
        runtime!.thread.composer.send();
      });
      await waitFor(() => expect(initialize).toHaveBeenCalledWith(firstId));
      await waitFor(() => expect(model.run).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(runtime!.threads.getState().threadIds).toContain(firstId),
      );

      await actSettled(() => runtime!.threads.getItemById(firstId)[action]());
      const nextId = runtime!.threads.getState().mainThreadId;
      expect(nextId).not.toBe(firstId);
      expect(runtime!.threads.mainItem.getState().status).toBe("new");
      expect(runtime!.thread).toBe(runtime!.threads.main);

      await act(async () => {
        runtime!.thread.composer.setText("next");
        runtime!.thread.composer.send();
      });
      await waitFor(() => expect(initialize).toHaveBeenCalledWith(nextId));
      await waitFor(() => expect(model.run).toHaveBeenCalledTimes(2));
      expect(runtime!.thread.getState().threadId).toBe(nextId);
    },
  );

  it.each(["delete", "detach"] as const)(
    "tears down a thread's hosted runtime on %s without unmounting the main thread",
    async (action) => {
      const adapter = new InMemoryThreadListAdapter();
      const model = {
        run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
          content: [],
        })),
      };
      const mounts: string[] = [];
      const cleanups: string[] = [];
      let runtime: AssistantRuntime | undefined;
      const App = () => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            const id = useAui().threadListItem.getState().id;
            useEffect(() => {
              mounts.push(id);
              return () => {
                cleanups.push(id);
              };
            }, [id]);
            return useLocalRuntime(model);
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      render(<App />);
      await waitFor(() =>
        expect(runtime!.threads.getState().isLoading).toBe(false),
      );
      expect(legacyConstructed).not.toHaveBeenCalled();
      const firstId = runtime!.threads.getState().mainThreadId;

      await act(async () => {
        runtime!.thread.composer.setText("first");
        runtime!.thread.composer.send();
      });
      await waitFor(() => expect(model.run).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(runtime!.threads.getState().threadIds).toContain(firstId),
      );

      await actSettled(() => runtime!.threads.switchToNewThread());
      const mainId = runtime!.threads.getState().mainThreadId;
      expect(mainId).not.toBe(firstId);
      await act(async () => {
        runtime!.thread.composer.setText("second");
        runtime!.thread.composer.send();
      });
      await waitFor(() => expect(model.run).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(runtime!.threads.getState().threadIds).toContain(mainId),
      );
      await waitFor(() => expect(mounts).toContain(mainId));
      const firstCleanups = cleanups.filter((id) => id === firstId).length;
      const mainCleanups = cleanups.filter((id) => id === mainId).length;
      expect(mounts.filter((id) => id === firstId).length).toBeGreaterThan(
        firstCleanups,
      );

      await act(async () => {
        await runtime!.threads.getItemById(firstId)[action]();
      });
      await waitFor(() =>
        expect(cleanups.filter((id) => id === firstId).length).toBeGreaterThan(
          firstCleanups,
        ),
      );
      expect(cleanups.filter((id) => id === mainId)).toHaveLength(mainCleanups);
      expect(runtime!.threads.getState().mainThreadId).toBe(mainId);
    },
  );

  describe("reloadMainThread", () => {
    const mountListedThread = async () => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [{ status: "regular" as const, remoteId: "thread-a" }],
        })),
      });
      const model = { run: vi.fn(async () => ({ content: [] })) };
      let runtime: AssistantRuntime | undefined;
      const App = () => {
        runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: function useThreadRuntime() {
            return useLocalRuntime(model);
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };
      render(<App />);
      await actSettled(() => runtime!.threads.getLoadThreadsPromise());
      await actSettled(() => runtime!.threads.switchToThread("thread-a"));
      expect(runtime!.threads.getState().mainThreadId).toBe("thread-a");
      return runtime!;
    };

    it.each(["delete", "detach"] as const)(
      "resolves quietly when %s moves the main thread away mid-reload",
      async (action) => {
        const runtime = await mountListedThread();
        vi.spyOn(
          RemoteThreadListHookInstanceManager.prototype,
          "__internal_restartThreadRuntime",
        ).mockImplementationOnce(async () => {
          const item = runtime.threads.getItemById("thread-a");
          if (action === "delete") await item.delete();
          else item.detach();
          await waitFor(() =>
            expect(runtime.threads.getState().mainThreadId).not.toBe(
              "thread-a",
            ),
          );
          throw new Error("Thread was deleted before runtime was started");
        });

        await actSettled(() =>
          expect(runtime.threads.reloadMainThread()).resolves.toBeUndefined(),
        );
      },
    );

    it("surfaces a restart failure while the thread is still main", async () => {
      const runtime = await mountListedThread();
      vi.spyOn(
        RemoteThreadListHookInstanceManager.prototype,
        "__internal_restartThreadRuntime",
      ).mockRejectedValueOnce(new Error("boom"));

      await actSettled(() =>
        expect(runtime.threads.reloadMainThread()).rejects.toThrow("boom"),
      );
    });
  });

  it("serves a replacement adapter through unstable_useAdapters and warns when it only has unstable_Provider", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const makeHistory = () => ({
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    });
    const providedHistory = makeHistory();
    const suppliedHistory = makeHistory();
    const ProvidedHistory = ({ children }: { children?: ReactNode }) => (
      <RuntimeAdapterProvider adapters={{ history: providedHistory }}>
        {children}
      </RuntimeAdapterProvider>
    );
    const withBothFaces = Object.assign(new InMemoryThreadListAdapter(), {
      unstable_useAdapters: () => ({ history: suppliedHistory }),
      unstable_Provider: ProvidedHistory,
    });
    const providerOnly = Object.assign(new InMemoryThreadListAdapter(), {
      unstable_Provider: ProvidedHistory,
    });
    const model = { run: vi.fn(async () => ({ content: [] })) };
    const seen = new Map<string, RuntimeAdapters | null>();
    let runtime: AssistantRuntime | undefined;
    const App = ({ adapter }: { adapter: RemoteThreadListAdapter }) => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: function useThreadRuntime() {
          const id = useAui().threadListItem.getState().id;
          seen.set(id, useRuntimeAdapters());
          return useLocalRuntime(model);
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    const { rerender } = render(
      <App adapter={new InMemoryThreadListAdapter()} />,
    );
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    const mainId = () => runtime!.threads.getState().mainThreadId;

    rerender(<App adapter={withBothFaces} />);
    await waitFor(() =>
      expect(seen.get(mainId())?.history).toBe(suppliedHistory),
    );

    rerender(<App adapter={providerOnly} />);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "[assistant-ui] useRemoteThreadListRuntime mounted with an adapter without unstable_Provider, so it ignores RemoteThreadListAdapter.unstable_Provider on this adapter. Expose unstable_useAdapters so per-thread history loads.",
      ),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(seen.get(mainId())?.history).not.toBe(providedHistory);
    expect(legacyConstructed).not.toHaveBeenCalled();
  });

  it("uses the frozen class path when unstable_Provider is present", async () => {
    const adapter = Object.assign(new InMemoryThreadListAdapter(), {
      unstable_Provider: ({ children }: { children?: ReactNode }) => children,
    });
    const model = { run: vi.fn(async () => ({ content: [] })) };
    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime(model),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() => expect(legacyConstructed).toHaveBeenCalledTimes(1));
  });
});
