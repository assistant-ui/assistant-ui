import { describe, expect, it, vi } from "vitest";
import type { BaseMessage } from "@langchain/core/messages";
import {
  matchesSubscription,
  SubscriptionHandle,
} from "@langchain/langgraph-sdk/client";
import {
  type Event,
  messagesProjection,
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

/**
 * Feeds the projection through the per-subscription matcher the SDK client
 * applies before it hands an event to a subscription.
 */
const openProjection = (spec: ProjectionSpec<BaseMessage[]>) => {
  let handle: SubscriptionHandle<Event> | undefined;
  const unsubscribe = vi.fn(async () => {});
  const subscribe = vi.fn(
    async (params: SubscriptionHandle<Event>["params"]) => {
      handle = new SubscriptionHandle<Event>(
        "subscription",
        params,
        unsubscribe,
      );
      return handle;
    },
  );
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
  const push = (event: Event) => {
    if (matchesSubscription(event, handle!.params)) handle!.push(event);
  };
  const ids = () => store.getSnapshot().map((message) => message.id);
  return { subscribe, unsubscribe, runtime, push, ids };
};

const parentTurn = [
  human("parent-human", "research"),
  ai("parent-ai", "", [
    { id: "call-child", name: "task", args: { subagent_type: "worker" } },
  ]),
];

const childRun = [
  values(CHILD, [human("child-human", "sub task")]),
  messagesEvent(CHILD, { event: "message-start", id: "child-ai", role: "ai" }),
  messagesEvent(CHILD, {
    event: "content-block-start",
    index: 0,
    content: { type: "text", text: "hello from the child" },
  }),
  messagesEvent(CHILD, { event: "message-finish" }),
  values(CHILD, [
    human("child-human", "sub task"),
    ai("child-ai", "hello from the child"),
  ]),
];

describe("subagentMessagesProjection", () => {
  it("keeps the SDK projection's identity and pins its subscription to depth 0", async () => {
    const spec = subagentMessagesProjection(PARENT);
    expect(spec.namespace).toEqual(PARENT);
    expect(spec.initial).toEqual([]);
    expect(spec.key).not.toBe(messagesProjection(PARENT).key);

    const { subscribe, runtime } = openProjection(spec);
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());
    expect(subscribe).toHaveBeenCalledWith({
      channels: ["messages", "values"],
      namespaces: [PARENT],
      depth: 0,
    });
    await runtime.dispose();
  });

  it("ignores a nested subagent's events while the parent's tool call runs", async () => {
    const { subscribe, runtime, push, ids } = openProjection(
      subagentMessagesProjection(PARENT),
    );
    await vi.waitFor(() => expect(subscribe).toHaveBeenCalledOnce());

    push(values(PARENT, parentTurn));
    await vi.waitFor(() =>
      expect(ids()).toEqual(["parent-human", "parent-ai"]),
    );

    for (const event of childRun) push(event);
    push(
      messagesEvent(PARENT, {
        event: "message-start",
        id: "parent-sentinel",
        role: "ai",
      }),
    );
    push(messagesEvent(PARENT, { event: "message-finish" }));
    await vi.waitFor(() => expect(ids()).toContain("parent-sentinel"));
    expect(ids()).toEqual(["parent-human", "parent-ai", "parent-sentinel"]);

    push(
      values(PARENT, [
        ...parentTurn,
        tool("parent-tool", "done", "call-child"),
      ]),
    );
    await vi.waitFor(() =>
      expect(ids()).toEqual([
        "parent-human",
        "parent-ai",
        "parent-tool",
        "parent-sentinel",
      ]),
    );
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
