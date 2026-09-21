import { describe, expect, it, vi } from "vitest";
import type { BaseMessage } from "@langchain/core/messages";
import { SubscriptionHandle } from "@langchain/langgraph-sdk/client";
import {
  type Event,
  type ProjectionSpec,
  StreamStore,
} from "@langchain/langgraph-sdk/stream";
import { subagentMessagesProjection } from "./subagentMessagesProjection";

const PARENT = ["tools:parent"];
const CHILD = ["tools:parent", "tools:child"];

const human = (id: string, content: string) => ({
  id,
  type: "human",
  content,
});
const ai = (id: string, content: string, tool_calls: unknown[] = []) => ({
  id,
  type: "ai",
  content,
  tool_calls,
});
const tool = (id: string, content: string, tool_call_id: string) => ({
  id,
  type: "tool",
  content,
  tool_call_id,
});

const values = (namespace: string[], messages: unknown[]) =>
  ({
    method: "values",
    params: { namespace, data: { messages } },
  }) as unknown as Event;

const messagesEvent = (namespace: string[], data: Record<string, unknown>) =>
  ({
    method: "messages",
    params: { namespace, node: "model", data },
  }) as unknown as Event;

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 10));

const openProjection = (spec: ProjectionSpec<BaseMessage[]>) => {
  const handle = new SubscriptionHandle<Event>(
    "subscription",
    { channels: ["messages", "values"], namespaces: [[...PARENT]], depth: 1 },
    vi.fn(async () => {}),
  );
  const unsubscribe = vi.spyOn(handle, "unsubscribe");
  const subscribe = vi.fn(async () => handle);
  const store = new StreamStore<BaseMessage[]>(spec.initial);
  const runtime = spec.open({
    thread: { subscribe } as never,
    store,
    rootBus: {
      channels: [
        "values",
        "checkpoints",
        "lifecycle",
        "input",
        "messages",
        "tools",
      ],
      subscribe: () => () => {},
    },
  });
  const ids = () => store.getSnapshot().map((message) => message.id);
  return { handle, subscribe, unsubscribe, runtime, ids };
};

describe("subagentMessagesProjection", () => {
  it("keeps the wrapped projection's identity and subscription", async () => {
    const spec = subagentMessagesProjection(PARENT);
    expect(spec.namespace).toEqual(PARENT);
    expect(spec.initial).toEqual([]);

    const { subscribe, runtime } = openProjection(spec);
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());
    expect(subscribe).toHaveBeenCalledWith({
      channels: ["messages", "values"],
      namespaces: [PARENT],
      depth: 1,
    });
    await runtime.dispose();
  });

  it("ignores a nested subagent's events while the parent's tool call runs", async () => {
    const parentTurn = [
      human("parent-human", "research"),
      ai("parent-ai", "", [
        { id: "call-child", name: "task", args: { subagent_type: "worker" } },
      ]),
    ];
    const { handle, subscribe, runtime, ids } = openProjection(
      subagentMessagesProjection(PARENT),
    );
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());

    handle.push(values(PARENT, parentTurn));
    await vi.waitFor(() =>
      expect(ids()).toEqual(["parent-human", "parent-ai"]),
    );

    handle.push(values(CHILD, [human("child-human", "sub task")]));
    handle.push(
      messagesEvent(CHILD, {
        event: "message-start",
        id: "child-ai",
        role: "ai",
      }),
    );
    handle.push(
      messagesEvent(CHILD, {
        event: "content-block-start",
        index: 0,
        content: { type: "text", text: "hello from the child" },
      }),
    );
    handle.push(messagesEvent(CHILD, { event: "message-finish" }));
    handle.push(
      values(CHILD, [
        human("child-human", "sub task"),
        ai("child-ai", "hello from the child"),
      ]),
    );
    await settle();
    expect(ids()).toEqual(["parent-human", "parent-ai"]);

    handle.push(
      values(PARENT, [
        ...parentTurn,
        tool("parent-tool", "done", "call-child"),
      ]),
    );
    await vi.waitFor(() =>
      expect(ids()).toEqual(["parent-human", "parent-ai", "parent-tool"]),
    );
    await runtime.dispose();
  });

  it("still applies the parent's own streamed messages", async () => {
    const { handle, subscribe, runtime, ids } = openProjection(
      subagentMessagesProjection(PARENT),
    );
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());

    handle.push(
      messagesEvent(PARENT, {
        event: "message-start",
        id: "parent-ai",
        role: "ai",
      }),
    );
    handle.push(
      messagesEvent(PARENT, {
        event: "content-block-start",
        index: 0,
        content: { type: "text", text: "hello from the parent" },
      }),
    );
    handle.push(messagesEvent(PARENT, { event: "message-finish" }));
    await vi.waitFor(() => expect(ids()).toEqual(["parent-ai"]));
    await runtime.dispose();
  });

  it("unsubscribes the underlying subscription on dispose", async () => {
    const { subscribe, unsubscribe, runtime } = openProjection(
      subagentMessagesProjection(PARENT),
    );
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());
    await runtime.dispose();
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledOnce());
  });
});
