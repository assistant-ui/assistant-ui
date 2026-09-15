// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

type FakeStore = {
  getSnapshot(): LangChainBaseMessage[];
  subscribe(listener: () => void): () => void;
  notify(): void;
  setSnapshot(messages: LangChainBaseMessage[]): void;
};

const createStore = (messages: LangChainBaseMessage[] = []): FakeStore => {
  let snapshot = messages;
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
    setSnapshot(messages) {
      snapshot = messages;
      for (const listener of listeners) listener();
    },
  };
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
) => ({
  id,
  namespace,
  status,
  parentId,
  depth,
});

const createStream = (
  subagents: ReadonlyMap<string, ReturnType<typeof subagent>>,
  stores: Map<string, FakeStore>,
) => {
  const releases = new Map<string, ReturnType<typeof vi.fn>>();
  const acquire = vi.fn((spec: { namespace: readonly string[] }) => {
    const key = spec.namespace.join("/");
    const release = vi.fn();
    releases.set(key, release);
    return { store: stores.get(key)!, release };
  });
  const resolveSubagentNamespace = vi.fn(async () => {});
  return {
    subagents,
    [streamController]: {
      resolveSubagentNamespace,
      registry: { acquire },
    },
    acquire,
    releases,
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

  it("retries unresolved namespace resolution after its status changes", async () => {
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
      expect(hook.result.current.get("task-one")?.[0]?.content).toMatchObject([
        { type: "text", text: "placeholder" },
      ]),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:promoted"])],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(hook.result.current.get("task-one")?.[0]?.content).toMatchObject([
        { type: "text", text: "promoted" },
      ]),
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
    expect(hook.result.current.get("task-one")?.[0]?.content).toMatchObject([
      { type: "text", text: "two" },
    ]);
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
      expect(hook.result.current.get("task-one")).toHaveLength(2),
    );
    const initial = hook.result.current.get("task-one");

    await act(async () => {
      store.setSnapshot([question, message("subagent-ai", "ai", "partial")]);
    });

    const updated = hook.result.current.get("task-one");
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
      expect(hook.result.current.get("task-one")?.[0]?.content).toMatchObject([
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
      expect(hook.result.current.get("task-one")).not.toBe(
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
      expect(hook.result.current.get("task-one")?.[0]?.status).toMatchObject({
        type: "running",
      }),
    );

    stream.subagents = new Map([
      ["task-one", subagent("task-one", ["tools:one"], "complete")],
    ]);
    hook.rerender();

    await waitFor(() =>
      expect(hook.result.current.get("task-one")?.[0]?.status).toMatchObject({
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
    const initialOne = initial.get("task-one");
    const initialTwo = initial.get("task-two");

    await act(async () => {
      oneStore.setSnapshot([message("one-ai", "ai", "updated")]);
    });

    expect(hook.result.current).not.toBe(initial);
    expect(hook.result.current.get("task-one")).not.toBe(initialOne);
    expect(hook.result.current.get("task-two")).toBe(initialTwo);
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
    const taskCall = hook.result.current
      .get("task-parent")?.[0]
      ?.content.find((part) => part.type === "tool-call");

    expect(taskCall).toMatchObject({
      messages: hook.result.current.get("task-child"),
    });
  });

  it("stops attaching descendants past sixteen levels of actual nesting", async () => {
    const subagents = new Map<string, ReturnType<typeof subagent>>();
    const stores = new Map<string, FakeStore>();
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
    let transcript = hook.result.current.get("task-1");
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
    const deepest = hook.result.current
      .get(`task-${MAX_SUBAGENT_DEPTH + 1}`)?.[0]
      ?.content.find((part) => part.type === "tool-call");
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
    const parentTranscript = hook.result.current.get("task-parent");
    const childTranscript = hook.result.current.get("task-child");
    const taskCall = parentTranscript?.[0]?.content.find(
      (part) => part.type === "tool-call",
    );

    expect(taskCall).toMatchObject({ messages: childTranscript });
  });
});
