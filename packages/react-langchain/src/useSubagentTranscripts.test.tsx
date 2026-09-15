// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { useExternalMessageConverter } from "@assistant-ui/core/react";
import type { LangChainBaseMessage } from "./types";

const { streamController } = vi.hoisted(() => ({
  streamController: Symbol("STREAM_CONTROLLER"),
}));

vi.mock("@langchain/react", () => ({
  STREAM_CONTROLLER: streamController,
}));

import { convertLangChainBaseMessage } from "./convertMessages";
import { useSubagentTranscripts } from "./useSubagentTranscripts";

type FakeStore = {
  getSnapshot(): LangChainBaseMessage[];
  subscribe(listener: () => void): () => void;
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

const convert: useExternalMessageConverter.Callback<LangChainBaseMessage> = (
  message,
  metadata,
) => convertLangChainBaseMessage(message, metadata);

const options = {};

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
      useSubagentTranscripts(stream as never, convert, options),
    );

    await waitFor(() => expect(stream.acquire).toHaveBeenCalledTimes(2));
    hook.rerender();

    expect(stream.acquire).toHaveBeenCalledTimes(2);
    expect(stream.resolveSubagentNamespace).toHaveBeenCalledTimes(2);
    hook.unmount();
    expect(stream.releases.get("tools:one")).toHaveBeenCalledOnce();
    expect(stream.releases.get("tools:two")).toHaveBeenCalledOnce();
  });

  it("rebuilds after a projection update and preserves identity otherwise", async () => {
    const store = createStore([message("subagent-ai", "ai", "one")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, convert, options),
    );

    await waitFor(() => expect(hook.result.current.has("task-one")).toBe(true));
    const initial = hook.result.current;
    hook.rerender();
    expect(hook.result.current).toBe(initial);

    await act(async () => {
      store.setSnapshot([message("subagent-ai", "ai", "two")]);
    });

    expect(hook.result.current).not.toBe(initial);
    expect(hook.result.current.get("task-one")?.[0]?.content).toMatchObject([
      { type: "text", text: "two" },
    ]);
  });

  it("sets the trailing transcript message status from the subagent status", async () => {
    const store = createStore([message("subagent-ai", "ai", "answer")]);
    const stream = createStream(
      new Map([["task-one", subagent("task-one", ["tools:one"])]]),
      new Map([["tools:one", store]]),
    );
    const hook = renderHook(() =>
      useSubagentTranscripts(stream as never, convert, options),
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
      useSubagentTranscripts(stream as never, convert, options),
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
