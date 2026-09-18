// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ThreadMessage } from "@assistant-ui/core";
import type { LangChainBaseMessage, UIMessage } from "./types";

const { streamController } = vi.hoisted(() => ({
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", () => ({
  STREAM_CONTROLLER: streamController,
}));

import {
  MAX_SUBAGENT_DEPTH,
  useSubagentTranscripts,
} from "./useSubagentTranscripts";

type FakeStore<T> = {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
  notify(): void;
  setSnapshot(snapshot: T): void;
};

const createFakeStore = <T,>(initial: T): FakeStore<T> => {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      for (const listener of listeners) listener();
    },
    setSnapshot(next) {
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
};

const createStore = (messages: LangChainBaseMessage[] = []) =>
  createFakeStore(messages);

const createUIStore = (events: UIChannelEvent[] = []) =>
  createFakeStore(events);

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const message = (
  id: string,
  type: "human" | "ai",
  content: string,
): LangChainBaseMessage & { id: string } => ({
  id,
  _getType: () => type,
  content,
});

const subagent = (
  id: string,
  namespace: readonly string[],
  status: "running" | "complete" | "error" = "running",
  parentId: string | null = null,
  depth = 1,
  startedAt = new Date(1_000),
  completedAt: Date | null = status === "running" ? null : new Date(4_000),
) => ({
  id,
  namespace,
  status,
  parentId,
  depth,
  startedAt,
  completedAt,
});

const messagesOf = (
  transcripts: ReadonlyMap<string, { messages: readonly ThreadMessage[] }>,
  id: string,
) => transcripts.get(id)?.messages;

const createStream = (
  subagents: ReadonlyMap<string, ReturnType<typeof subagent>>,
  stores: Map<string, FakeStore<LangChainBaseMessage[]>>,
  uiStores = new Map<string, FakeStore<UIChannelEvent[]>>(),
) => {
  const releases = new Map<string, ReturnType<typeof vi.fn>>();
  const uiReleases = new Map<string, ReturnType<typeof vi.fn>>();
  const acquire = vi.fn(
    (spec: { key: string; namespace: readonly string[] }) => {
      const key = spec.namespace.join("/");
      const release = vi.fn();
      if (spec.key.startsWith("channel|")) {
        uiReleases.set(key, release);
        return { store: uiStores.get(key) ?? createUIStore(), release };
      }
      releases.set(key, release);
      return { store: stores.get(key)!, release };
    },
  );
  const resolveSubagentNamespace = vi.fn(async () => {});
  return {
    subagents,
    [streamController]: {
      resolveSubagentNamespace,
      registry: { acquire },
    },
    acquire,
    releases,
    uiReleases,
    resolveSubagentNamespace,
  };
};

const noUIMessages = new Map<string, UIMessage[]>();

const chart = (id: string, messageId: string): UIMessage => ({
  type: "ui",
  id,
  name: "chart",
  props: { points: [1, 2, 3] },
  metadata: { message_id: messageId },
});

type UIChannelEvent = {
  method: "custom";
  params: { namespace: readonly string[]; data: unknown };
};

const uiEvent = (
  namespace: readonly string[],
  data: unknown,
): UIChannelEvent => ({
  method: "custom",
  params: { namespace, data },
});

const nestedSubagents = () =>
  new Map([
    ["task-parent", subagent("task-parent", ["tools:parent"])],
    [
      "task-child",
      subagent(
        "task-child",
        ["tools:parent", "tools:child"],
        "running",
        "task-parent",
        2,
      ),
    ],
  ]);

describe("useSubagentTranscripts", () => {
  it("acquires each namespace once and releases every projection on unmount", async () => {
    const stores = new Map([
      ["tools:one", createStore()],
      ["tools:two", createStore()],
    ]);
    const stream = createStream(
      new Map([
        ["task-one", subagent("task-one", ["tools:one"])],
        ["task-two", subagent("task-two", ["tools:two"])],
      ]),
      stores,
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(stream.acquire).toHaveBeenCalledTimes(2));
    hook.rerender();

    expect(stream.acquire).toHaveBeenCalledTimes(2);
    expect(stream.resolveSubagentNamespace).not.toHaveBeenCalled();
    hook.unmount();
    expect(stream.releases.get("tools:one")).toHaveBeenCalledOnce();
    expect(stream.releases.get("tools:two")).toHaveBeenCalledOnce();
  });

  it("serializes a bounded retry for a later unresolved status", async () => {
    const stores = new Map([["tools:task-one", createStore()]]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:task-one"])]]),
      stores,
    );
    const firstRequest = createDeferred();
    const secondRequest = createDeferred();
    stream.resolveSubagentNamespace
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce(),
    );
    act(() => {
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"])],
      ]);
      hook.rerender();
    });
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();

    act(() => {
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]);
      hook.rerender();
    });
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();

    await act(async () => {
      firstRequest.resolve();
    });

    await waitFor(() =>
      expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2),
    );
    act(() => {
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]);
      hook.rerender();
    });
    secondRequest.resolve();
    await act(() => Promise.resolve());
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2);
  });

  it("retries only after an unresolved namespace changes status", async () => {
    const stores = new Map([["tools:task-one", createStore()]]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:task-one"])]]),
      stores,
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce(),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"])],
      ]);
      hook.rerender();
    });
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();

    await act(async () => {
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]);
      hook.rerender();
    });
    await waitFor(() =>
      expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2),
    );

    act(() => {
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]);
      hook.rerender();
    });
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2);
  });

  it("retries an initially terminal unresolved namespace once", async () => {
    const stores = new Map([["tools:task-one", createStore()]]);
    const stream = createStream(
      new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]),
      stores,
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      await Promise.resolve();
      stream.subagents = new Map([
        ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
      ]);
      hook.rerender();
    });
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2);
  });

  it("does not acquire depth-17 subagents and releases projections that move past the depth cap", async () => {
    const stores = new Map([["tools:task-one", createStore()]]);
    const stream = createStream(
      new Map([
        [
          "task-one",
          subagent("task-one", ["tools:task-one"], "running", null, 16),
        ],
      ]),
      stores,
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(stream.acquire).toHaveBeenCalledOnce());
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:one"], "running", null, 17)],
      ["task-two", subagent("task-two", ["tools:two"], "running", null, 17)],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(stream.releases.get("tools:task-one")).toHaveBeenCalledOnce(),
    );
    expect(stream.acquire).toHaveBeenCalledOnce();
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();
  });

  it("rebinds a transcript projection when a subagent namespace is promoted", async () => {
    const placeholderStore = createStore([
      message("placeholder-ai", "ai", "placeholder"),
    ]);
    const promotedStore = createStore([
      message("promoted-ai", "ai", "promoted"),
    ]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:task-one"])]]),
      new Map([
        ["tools:task-one", placeholderStore],
        ["tools:promoted", promotedStore],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.content,
      ).toMatchObject([{ type: "text", text: "placeholder" }]),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:promoted"])],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.content,
      ).toMatchObject([{ type: "text", text: "promoted" }]),
    );
    expect(stream.releases.get("tools:task-one")).toHaveBeenCalledOnce();
    expect(stream.acquire).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: ["tools:promoted"] }),
    );
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledOnce();
  });

  it("rebuilds after a projection update and preserves identity otherwise", async () => {
    const store = createStore([message("subagent-ai", "ai", "one")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(hook.result.current.has("task-one")).toBe(true));
    const initial = hook.result.current;
    hook.rerender();
    expect(hook.result.current).toBe(initial);

    await act(async () => {
      store.notify();
    });

    expect(hook.result.current).toBe(initial);

    await act(async () => {
      store.setSnapshot([message("subagent-ai", "ai", "two")]);
    });

    expect(hook.result.current).not.toBe(initial);
    expect(
      messagesOf(hook.result.current, "task-one")?.[0]?.content,
    ).toMatchObject([{ type: "text", text: "two" }]);
  });

  it("keeps unchanged transcript messages when a projection update replaces one", async () => {
    const question = message("subagent-human", "human", "question");
    const store = createStore([question, message("subagent-ai", "ai", "par")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(messagesOf(hook.result.current, "task-one")).toHaveLength(2),
    );
    const initial = messagesOf(hook.result.current, "task-one");

    await act(async () => {
      store.setSnapshot([question, message("subagent-ai", "ai", "partial")]);
    });

    const updated = messagesOf(hook.result.current, "task-one");
    expect(updated).toHaveLength(2);
    expect(updated).not.toBe(initial);
    expect(updated?.[0]).toBe(initial?.[0]);
    expect(updated?.[1]).not.toBe(initial?.[1]);
  });

  it("adds UI messages to the nested message they belong to", async () => {
    const store = createStore([message("subagent-ai", "ai", "answer")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    let uiMessagesByParent = noUIMessages;
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, uiMessagesByParent),
    );

    await waitFor(() => expect(hook.result.current.has("task-one")).toBe(true));
    uiMessagesByParent = new Map([
      ["subagent-ai", [chart("ui-1", "subagent-ai")]],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.content,
      ).toMatchObject([
        { type: "text", text: "answer" },
        { type: "data", name: "chart", data: { points: [1, 2, 3] } },
      ]),
    );
  });

  it("rebuilds only the transcripts whose UI messages changed", async () => {
    const oneStore = createStore([message("one-ai", "ai", "one")]);
    const twoStore = createStore([message("two-ai", "ai", "two")]);
    const stream = createStream(
      new Map([
        ["task-one", subagent("task-one", ["tools:one"])],
        ["task-two", subagent("task-two", ["tools:two"])],
      ]),
      new Map([
        ["tools:one", oneStore],
        ["tools:two", twoStore],
      ]),
    );
    let uiMessagesByParent = noUIMessages;
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, uiMessagesByParent),
    );

    await waitFor(() => expect(hook.result.current.size).toBe(2));
    const initial = hook.result.current;

    uiMessagesByParent = new Map([["root-ai", [chart("ui-root", "root-ai")]]]);
    hook.rerender();
    expect(hook.result.current).toBe(initial);

    const ui = chart("ui-1", "one-ai");
    uiMessagesByParent = new Map([["one-ai", [ui]]]);
    hook.rerender();
    await waitFor(() =>
      expect(messagesOf(hook.result.current, "task-one")).not.toBe(
        initial.get("task-one"),
      ),
    );
    const withUI = hook.result.current;
    expect(withUI.get("task-two")).toBe(initial.get("task-two"));

    uiMessagesByParent = new Map([["one-ai", [ui]]]);
    hook.rerender();
    expect(hook.result.current).toBe(withUI);
  });

  it("sets the trailing transcript message status from the subagent status", async () => {
    const store = createStore([message("subagent-ai", "ai", "answer")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.status,
      ).toMatchObject({
        type: "running",
      }),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:one"], "complete")],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.status,
      ).toMatchObject({
        type: "complete",
      }),
    );
  });

  it("keeps unchanged sibling transcript identities after a projection update", async () => {
    const oneStore = createStore([message("one-ai", "ai", "one")]);
    const twoStore = createStore([message("two-ai", "ai", "two")]);
    const stream = createStream(
      new Map([
        ["task-one", subagent("task-one", ["tools:one"])],
        ["task-two", subagent("task-two", ["tools:two"])],
      ]),
      new Map([
        ["tools:one", oneStore],
        ["tools:two", twoStore],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(hook.result.current.size).toBe(2));
    const initial = hook.result.current;
    const initialOne = messagesOf(initial, "task-one");
    const initialTwo = messagesOf(initial, "task-two");

    await act(async () => {
      oneStore.setSnapshot([message("one-ai", "ai", "updated")]);
    });

    expect(hook.result.current).not.toBe(initial);
    expect(messagesOf(hook.result.current, "task-one")).not.toBe(initialOne);
    expect(messagesOf(hook.result.current, "task-two")).toBe(initialTwo);
  });

  it("nests a child discovered at the same depth as its parent", async () => {
    const parentMessage: LangChainBaseMessage = {
      id: "parent-ai",
      _getType: () => "ai",
      content: "delegating",
      tool_calls: [{ id: "task-child", name: "task", args: {} }],
    };
    const childStore = createStore([message("child-ai", "ai", "child answer")]);
    const parentStore = createStore([parentMessage]);
    const stream = createStream(
      new Map([
        ["task-parent", subagent("task-parent", ["tools:parent"])],
        [
          "task-child",
          subagent("task-child", ["tools:child"], "complete", "task-parent", 1),
        ],
      ]),
      new Map([
        ["tools:parent", parentStore],
        ["tools:child", childStore],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(hook.result.current.size).toBe(2));
    const taskCall = messagesOf(
      hook.result.current,
      "task-parent",
    )?.[0]?.content.find((part) => part.type === "tool-call");

    expect(taskCall).toMatchObject({
      messages: messagesOf(hook.result.current, "task-child"),
    });
  });

  it("stops attaching descendants past sixteen levels of actual nesting", async () => {
    const subagents = new Map<string, ReturnType<typeof subagent>>();
    const stores = new Map<string, FakeStore<LangChainBaseMessage[]>>();
    const levels = MAX_SUBAGENT_DEPTH + 2;
    for (let level = 1; level <= levels; level += 1) {
      const id = `task-${level}`;
      const childId = `task-${level + 1}`;
      const namespace = [`tools:${level}`];
      subagents.set(
        id,
        subagent(
          id,
          namespace,
          "complete",
          level === 1 ? null : `task-${level - 1}`,
          1,
        ),
      );
      stores.set(
        namespace.join("/"),
        createStore([
          {
            id: `ai-${level}`,
            _getType: () => "ai",
            content: `level ${level}`,
            tool_calls:
              level < levels ? [{ id: childId, name: "task", args: {} }] : [],
          },
        ]),
      );
    }
    const stream = createStream(subagents, stores);
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(hook.result.current.size).toBe(levels));
    let transcript = messagesOf(hook.result.current, "task-1");
    let nested = 1;
    while (transcript) {
      const taskCall = transcript[0]?.content.find(
        (part) => part.type === "tool-call",
      );
      transcript =
        taskCall && "messages" in taskCall ? taskCall.messages : undefined;
      if (transcript) nested += 1;
    }

    expect(nested).toBe(MAX_SUBAGENT_DEPTH);
    const deepest = messagesOf(
      hook.result.current,
      `task-${MAX_SUBAGENT_DEPTH + 1}`,
    )?.[0]?.content.find((part) => part.type === "tool-call");
    expect(deepest).not.toHaveProperty("messages");
  });

  it("nests child transcripts under the task call in their parent transcript", async () => {
    const parentMessage: LangChainBaseMessage = {
      id: "parent-ai",
      _getType: () => "ai",
      content: "delegating",
      tool_calls: [{ id: "task-child", name: "task", args: {} }],
    };
    const childStore = createStore([message("child-ai", "ai", "child answer")]);
    const parentStore = createStore([parentMessage]);
    const stream = createStream(
      new Map([
        ["task-parent", subagent("task-parent", ["tools:parent"])],
        [
          "task-child",
          subagent(
            "task-child",
            ["tools:parent", "tools:child"],
            "complete",
            "task-parent",
            2,
          ),
        ],
      ]),
      new Map([
        ["tools:parent", parentStore],
        ["tools:parent/tools:child", childStore],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(hook.result.current.size).toBe(2));
    const parentTranscript = messagesOf(hook.result.current, "task-parent");
    const childTranscript = messagesOf(hook.result.current, "task-child");
    const taskCall = parentTranscript?.[0]?.content.find(
      (part) => part.type === "tool-call",
    );

    expect(taskCall).toMatchObject({ messages: childTranscript });
  });
  it("renders live UI a subagent pushed from its own nested namespace", async () => {
    const childStore = createStore([message("child-ai", "ai", "child answer")]);
    const childUIStore = createUIStore([
      uiEvent(["tools:parent", "tools:child"], chart("ui-child", "child-ai")),
      uiEvent(
        ["tools:parent", "tools:child", "tools:grandchild"],
        chart("ui-grandchild", "grandchild-ai"),
      ),
    ]);
    const stream = createStream(
      nestedSubagents(),
      new Map([
        [
          "tools:parent",
          createStore([message("parent-ai", "ai", "delegating")]),
        ],
        ["tools:parent/tools:child", childStore],
      ]),
      new Map([["tools:parent/tools:child", childUIStore]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-child")?.[0]?.content,
      ).toMatchObject([
        { type: "text", text: "child answer" },
        { type: "data", name: "chart", data: { points: [1, 2, 3] } },
      ]),
    );

    await act(async () => {
      childUIStore.setSnapshot([
        uiEvent(["tools:parent", "tools:child"], chart("ui-child", "child-ai")),
        uiEvent(["tools:parent", "tools:child"], {
          type: "remove-ui",
          id: "ui-child",
        }),
      ]);
    });

    expect(
      messagesOf(hook.result.current, "task-child")?.[0]?.content.some(
        (part) => part.type === "data",
      ),
    ).toBe(false);
  });

  it("opens a custom projection only for subagents the root channel cannot reach", async () => {
    const stream = createStream(
      nestedSubagents(),
      new Map([
        ["tools:parent", createStore()],
        ["tools:parent/tools:child", createStore()],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() => expect(stream.acquire).toHaveBeenCalledTimes(3));
    const channelSpecs = stream.acquire.mock.calls
      .map(([spec]) => spec)
      .filter((spec) => spec.key.startsWith("channel|"));
    expect(channelSpecs).toHaveLength(1);
    expect(channelSpecs[0]?.namespace).toEqual(["tools:parent", "tools:child"]);

    hook.unmount();
    expect(
      stream.uiReleases.get("tools:parent/tools:child"),
    ).toHaveBeenCalledOnce();
  });

  it("ignores live UI whose message is absent from this transcript", async () => {
    const childUI = uiEvent(
      ["tools:parent", "tools:child"],
      chart("ui-child", "child-ai"),
    );
    const childUIStore = createUIStore([childUI]);
    const stream = createStream(
      nestedSubagents(),
      new Map([
        ["tools:parent", createStore()],
        [
          "tools:parent/tools:child",
          createStore([message("child-ai", "ai", "child answer")]),
        ],
      ]),
      new Map([["tools:parent/tools:child", childUIStore]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-child")?.[0]?.content.some(
          (part) => part.type === "data",
        ),
      ).toBe(true),
    );
    const transcript = messagesOf(hook.result.current, "task-child");

    await act(async () => {
      childUIStore.setSnapshot([
        childUI,
        uiEvent(
          ["tools:parent", "tools:child", "tools:grandchild"],
          chart("ui-grandchild", "grandchild-ai"),
        ),
      ]);
    });

    expect(messagesOf(hook.result.current, "task-child")).toBe(transcript);
  });

  it("keeps a nested transcript stable while a streamed UI update repeats", async () => {
    const streamedChart = (props: Record<string, unknown>): UIMessage => ({
      type: "ui",
      id: "ui-child",
      name: "chart",
      props,
      metadata: { message_id: "child-ai", merge: true },
    });
    const parentStore = createStore([message("parent-ai", "ai", "delegating")]);
    const childUIStore = createUIStore([
      uiEvent(["tools:parent", "tools:child"], streamedChart({ points: [1] })),
      uiEvent(["tools:parent", "tools:child"], streamedChart({ label: "a" })),
    ]);
    const stream = createStream(
      nestedSubagents(),
      new Map([
        ["tools:parent", parentStore],
        [
          "tools:parent/tools:child",
          createStore([message("child-ai", "ai", "child answer")]),
        ],
      ]),
      new Map([["tools:parent/tools:child", childUIStore]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-child")?.[0]?.content.some(
          (part) => part.type === "data",
        ),
      ).toBe(true),
    );
    const transcript = messagesOf(hook.result.current, "task-child");

    await act(async () => {
      parentStore.notify();
    });

    expect(messagesOf(hook.result.current, "task-child")).toBe(transcript);
  });

  it("keeps graph state authoritative over a live nested update", async () => {
    const childUIStore = createUIStore([
      uiEvent(["tools:parent", "tools:child"], chart("ui-child", "child-ai")),
    ]);
    const stream = createStream(
      nestedSubagents(),
      new Map([
        ["tools:parent", createStore()],
        [
          "tools:parent/tools:child",
          createStore([message("child-ai", "ai", "child answer")]),
        ],
      ]),
      new Map([["tools:parent/tools:child", childUIStore]]),
    );
    const stateUiMessages = new Map<string, UIMessage[]>([
      [
        "child-ai",
        [
          {
            type: "ui",
            id: "ui-child",
            name: "chart",
            props: { points: [9] },
            metadata: { message_id: "child-ai" },
          },
        ],
      ],
    ]);
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, stateUiMessages),
    );

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-child")?.[0]?.content,
      ).toMatchObject([
        { type: "text", text: "child answer" },
        { type: "data", name: "chart", data: { points: [9] } },
      ]),
    );
  });

  it("carries the subagent's wall clock onto its task call", async () => {
    const parentMessage: LangChainBaseMessage = {
      id: "parent-ai",
      _getType: () => "ai",
      content: "delegating",
      tool_calls: [{ id: "task-child", name: "task", args: {} }],
    };
    const stream = createStream(
      new Map([
        ["task-parent", subagent("task-parent", ["tools:parent"])],
        [
          "task-child",
          subagent(
            "task-child",
            ["tools:parent", "tools:child"],
            "running",
            "task-parent",
            2,
            new Date(1_000),
            null,
          ),
        ],
      ]),
      new Map([
        ["tools:parent", createStore([parentMessage])],
        [
          "tools:parent/tools:child",
          createStore([message("child-ai", "ai", "child answer")]),
        ],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    const taskCall = () =>
      messagesOf(hook.result.current, "task-parent")?.[0]?.content.find(
        (part) => part.type === "tool-call",
      );

    await waitFor(() =>
      expect(taskCall()).toMatchObject({ timing: { startedAt: 1_000 } }),
    );
    expect(taskCall()).not.toHaveProperty("timing.completedAt");

    stream.subagents = new Map([
      ["task-parent", subagent("task-parent", ["tools:parent"])],
      [
        "task-child",
        subagent(
          "task-child",
          ["tools:parent", "tools:child"],
          "complete",
          "task-parent",
          2,
          new Date(1_000),
          new Date(4_500),
        ),
      ],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(taskCall()).toMatchObject({
        timing: { startedAt: 1_000, completedAt: 4_500 },
      }),
    );
  });

  it("records streaming timing for a nested message once its subagent finishes", async () => {
    const store = createStore([message("child-ai", "ai", "partial")]);
    const stream = createStream(
      new Map([
        [
          "task-child",
          subagent(
            "task-child",
            ["tools:parent", "tools:child"],
            "running",
            null,
            2,
          ),
        ],
      ]),
      new Map([["tools:parent/tools:child", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(messagesOf(hook.result.current, "task-child")).toHaveLength(1),
    );
    expect(
      messagesOf(hook.result.current, "task-child")?.[0]?.metadata,
    ).not.toHaveProperty("timing");

    await act(async () => {
      store.setSnapshot([message("child-ai", "ai", "partial answer")]);
    });

    stream.subagents = new Map([
      [
        "task-child",
        subagent(
          "task-child",
          ["tools:parent", "tools:child"],
          "complete",
          null,
          2,
        ),
      ],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-child")?.[0]?.metadata?.timing,
      ).toMatchObject({ totalChunks: 2, toolCallCount: 0 }),
    );
    const timing = messagesOf(hook.result.current, "task-child")?.[0]?.metadata
      ?.timing;
    expect(timing?.tokenCount).toBeGreaterThan(0);
    expect(timing?.totalStreamTime).toBeGreaterThanOrEqual(0);
  });

  it("gives a task seeded from a checkpoint no wall clock", async () => {
    const parentMessage: LangChainBaseMessage = {
      id: "parent-ai",
      _getType: () => "ai",
      content: "delegating",
      tool_calls: [{ id: "task-child", name: "task", args: {} }],
    };
    const seeded = new Date(2_000);
    const stream = createStream(
      new Map([
        ["task-parent", subagent("task-parent", ["tools:parent"])],
        [
          "task-child",
          subagent(
            "task-child",
            ["tools:parent", "tools:child"],
            "complete",
            "task-parent",
            2,
            seeded,
            seeded,
          ),
        ],
      ]),
      new Map([
        ["tools:parent", createStore([parentMessage])],
        [
          "tools:parent/tools:child",
          createStore([message("child-ai", "ai", "child answer")]),
        ],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(hook.result.current.has("task-child")).toBe(true),
    );
    const taskCall = messagesOf(
      hook.result.current,
      "task-parent",
    )?.[0]?.content.find((part) => part.type === "tool-call");

    expect(taskCall).toMatchObject({ toolCallId: "task-child" });
    expect(taskCall).not.toHaveProperty("timing");
  });

  it("keeps the wall clock of a task whose namespace resolves after it finished", async () => {
    const stream = createStream(
      new Map([
        [
          "task-one",
          subagent(
            "task-one",
            ["tools:task-one"],
            "running",
            null,
            1,
            new Date(1_000),
            null,
          ),
        ],
      ]),
      new Map([
        ["tools:task-one", createStore([message("one-ai", "ai", "partial")])],
        ["tools:promoted", createStore([message("one-ai", "ai", "answer")])],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(hook.result.current.get("task-one")?.timing).toMatchObject({
        startedAt: 1_000,
      }),
    );

    stream.subagents = new Map([
      [
        "task-one",
        subagent(
          "task-one",
          ["tools:promoted"],
          "complete",
          null,
          1,
          new Date(1_000),
          new Date(6_000),
        ),
      ],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(hook.result.current.get("task-one")?.timing).toMatchObject({
        startedAt: 1_000,
        completedAt: 6_000,
      }),
    );
  });

  it("keeps finalized nested timing when the namespace resolves after completion", async () => {
    const placeholderStore = createStore([message("one-ai", "ai", "partial")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:task-one"])]]),
      new Map([
        ["tools:task-one", placeholderStore],
        ["tools:promoted", createStore([message("one-ai", "ai", "answer")])],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(messagesOf(hook.result.current, "task-one")).toHaveLength(1),
    );
    await act(async () => {
      placeholderStore.setSnapshot([message("one-ai", "ai", "partial answer")]);
    });

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:task-one"], "complete")],
    ]);
    hook.rerender();
    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.metadata?.timing,
      ).toBeDefined(),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:promoted"], "complete")],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.content,
      ).toMatchObject([{ type: "text", text: "answer" }]),
    );
    expect(
      messagesOf(hook.result.current, "task-one")?.[0]?.metadata?.timing,
    ).toBeDefined();
  });

  it("keeps counting a streaming message across a namespace rebind", async () => {
    const placeholderStore = createStore([message("one-ai", "ai", "partial")]);
    const promotedStore = createStore([
      message("one-ai", "ai", "partial answer"),
    ]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:task-one"])]]),
      new Map([
        ["tools:task-one", placeholderStore],
        ["tools:promoted", promotedStore],
      ]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, noUIMessages),
    );

    await waitFor(() =>
      expect(messagesOf(hook.result.current, "task-one")).toHaveLength(1),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:promoted"])],
    ]);
    hook.rerender();
    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.content,
      ).toMatchObject([{ type: "text", text: "partial answer" }]),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:promoted"], "complete")],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(
        messagesOf(hook.result.current, "task-one")?.[0]?.metadata?.timing,
      ).toMatchObject({ totalChunks: 2 }),
    );
  });
});
