import { describe, expect, it, vi } from "vitest";
import { useEffect, useState } from "react";
import { flushTapSync, resource } from "@assistant-ui/tap";
import {
  createAssistantClient,
  type AssistantClientHandle,
} from "./createAssistantClient";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";
import { useAssistantEmit } from "./utils/tap-assistant-context";
import { useClientResource } from "./useClientResource";
import { Derived } from "./Derived";
import type { AssistantClient } from "./types/client";
import { EVENT_CLIENT_INTERNALS } from "./utils/event-client-internals";

type AnyClient = Record<string, any>;

const flushEvents = () => new Promise((resolve) => setTimeout(resolve));

const useMessageClient = ({ id }: { id: string }) => {
  const emit = useAssistantEmit();
  const [text, setText] = useState("");
  return {
    getState: () => ({ id, text }),
    setText,
    ping: (value: string) =>
      emit("message.pinged" as never, { id, value } as never),
  };
};
const MessageClient = resource(useMessageClient);

const useThreadClient = () => {
  const [selected, setSelected] = useState(0);
  const m0 = useClientResource(MessageClient({ id: "m0" }));
  const m1 = useClientResource(MessageClient({ id: "m1" }));
  const messages = [m0, m1];
  return {
    getState: () => ({ selected }),
    setSelected,
    message: ({ index }: { index: number }) => messages[index]!.methods,
  };
};
const ThreadClient = resource(useThreadClient);

const messageDerived = () =>
  Derived({
    source: "thread",
    query: {},
    get: (aui: AnyClient) =>
      aui.thread.message({ index: aui.thread.getState().selected }),
  } as never);

const createTestClient = (
  config: Record<string, unknown>,
  options?: { parent?: AssistantClient | AssistantClientHandle },
) =>
  createAssistantClient(config as never, options as never) as Omit<
    AssistantClientHandle,
    "getClient"
  > & { getClient(): AnyClient };

describe("createAssistantClient", () => {
  it("re-reads a config source, updating args in place and reconciling scopes", () => {
    let config: Record<string, unknown> = {
      message: MessageClient({ id: "m0" }),
    };
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const handle = createAssistantClient({
      getConfig: () => config as never,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });

    const aui = handle.getClient() as AnyClient;
    flushTapSync(() => aui.message.setText("draft"));
    expect(aui.message.getState()).toEqual({ id: "m0", text: "draft" });

    config = { message: MessageClient({ id: "m1" }), thread: ThreadClient() };
    flushTapSync(notify);

    const extended = handle.getClient() as AnyClient;
    expect(extended.message.getState()).toEqual({ id: "m1", text: "draft" });
    expect(extended.thread.getState()).toEqual({ selected: 0 });

    config = {};
    flushTapSync(notify);
    expect(() =>
      (handle.getClient() as AnyClient).message.getState(),
    ).toThrow();

    handle.destroy();
  });

  it("hosts scopes without any React renderer", () => {
    const handle = createTestClient({ thread: ThreadClient() });
    const aui = handle.getClient();

    expect(aui.thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => aui.thread.setSelected(1));
    expect(handle.getClient().thread.getState()).toEqual({ selected: 1 });

    handle.destroy();
  });

  it("notifies subscribers on value updates and keeps client identity", () => {
    const handle = createTestClient({ thread: ThreadClient() });
    const listener = vi.fn();
    handle.subscribe(listener);

    const before = handle.getClient();
    flushTapSync(() => before.thread.setSelected(1));

    expect(listener).toHaveBeenCalled();
    expect(handle.getClient()).toBe(before);

    handle.destroy();
  });

  it("re-binds derived scopes on structural changes with a new client identity", () => {
    const handle = createTestClient({
      thread: ThreadClient(),
      message: messageDerived(),
    });

    const before = handle.getClient();
    expect(before.message.getState().id).toBe("m0");

    flushTapSync(() => before.thread.setSelected(1));

    const after = handle.getClient();
    expect(after.message.getState().id).toBe("m1");
    expect(after).not.toBe(before);

    handle.destroy();
  });

  it("reads state through the proxied assistant state", () => {
    const handle = createTestClient({ thread: ThreadClient() });
    const state = getProxiedAssistantState(handle.getClient());

    expect((state as AnyClient).thread.selected).toBe(0);
    expect((state as AnyClient).optional.missing).toBeUndefined();

    handle.destroy();
  });

  it("delivers scope-filtered events on a microtask", async () => {
    const handle = createTestClient({
      thread: ThreadClient(),
      message: messageDerived(),
    });
    const aui = handle.getClient();
    const cb = vi.fn();
    aui.on("message.pinged", cb);

    flushTapSync(() => aui.thread.message({ index: 1 }).ping("other"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    flushTapSync(() => aui.message.ping("bound"));
    await flushEvents();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ id: "m0", value: "bound" });

    handle.destroy();
  });

  it("keeps scope-filtered event subscriptions across structural rebinds", async () => {
    const handle = createTestClient({
      thread: ThreadClient(),
      message: messageDerived(),
    });
    const subscribed = handle.getClient();
    const cb = vi.fn();
    subscribed.on("message.pinged", cb);

    flushTapSync(() => subscribed.thread.setSelected(1));
    flushTapSync(() => handle.getClient().message.ping("after"));
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
      value: "after",
    });

    handle.destroy();
  });

  it("recomputes inherited scope ownership after config changes", async () => {
    const parent = createTestClient({
      message: MessageClient({ id: "parent" }),
    });
    let config: Record<string, unknown> = {};
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const child = createTestClient(
      {
        getConfig: () => config,
        subscribe: (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      { parent: parent as never },
    );
    const subscribed = child.getClient();
    const cb = vi.fn();
    subscribed.on("message.pinged", cb);

    config = { message: MessageClient({ id: "child" }) };
    flushTapSync(notify);

    flushTapSync(() => parent.getClient().message.ping("inherited"));
    flushTapSync(() => child.getClient().message.ping("local"));
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "child",
      value: "local",
    });

    child.destroy();
    parent.destroy();
  });

  it("falls back to an ancestor after the current owner removes a scope", async () => {
    const grandparent = createTestClient({
      message: MessageClient({ id: "grandparent" }),
    });
    let config: Record<string, unknown> = {
      message: MessageClient({ id: "parent" }),
    };
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const parent = createAssistantClient(
      {
        getConfig: () => config as never,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      { parent: grandparent as never },
    );
    const child = createTestClient({}, { parent });
    const cb = vi.fn();
    child.getClient().on("message.pinged", cb);

    config = {};
    flushTapSync(notify);
    flushTapSync(() => grandparent.getClient().message.ping("fallback"));
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "grandparent",
      value: "fallback",
    });

    child.destroy();
    parent.destroy();
    grandparent.destroy();
  });

  it("cleans local registration when an ancestor rejects a missing scope", async () => {
    const root = createTestClient({});
    let config: Record<string, unknown> = {};
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const child = createAssistantClient(
      {
        getConfig: () => config as never,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      { parent: root as never },
    );
    const cb = vi.fn();

    expect(() => child.getClient().on("message.pinged" as never, cb)).toThrow(
      'Scope "message" is not available',
    );

    config = { message: MessageClient({ id: "child" }) };
    flushTapSync(notify);
    flushTapSync(() =>
      (child.getClient() as AnyClient).message.ping("after-error"),
    );
    await flushEvents();

    expect(cb).not.toHaveBeenCalled();

    child.destroy();
    root.destroy();
  });

  it("keeps local listeners when a custom parent rejects the scope", async () => {
    const emptyParentHandle = createTestClient({});
    const parentOn = vi.fn(() => {
      throw new Error("unsupported scope");
    });
    const parent = {
      subscribe: () => () => {},
      on: parentOn,
      message: emptyParentHandle.getClient().message,
    } as unknown as AssistantClient;
    const child = createTestClient(
      { message: MessageClient({ id: "child" }) },
      { parent },
    );
    const cb = vi.fn();

    expect(() => child.getClient().on("message.pinged", cb)).not.toThrow();
    expect(parentOn).not.toHaveBeenCalled();

    flushTapSync(() => child.getClient().message.ping("local"));
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "child",
      value: "local",
    });

    child.destroy();
    emptyParentHandle.destroy();
  });

  it("preserves the receiver for a custom parent on method", () => {
    const parentHandle = createTestClient({ thread: ThreadClient() });
    const parent = Object.create(parentHandle.getClient()) as AnyClient;
    const parentOn = vi.fn(function () {
      return () => {};
    });
    Object.defineProperty(parent, "on", {
      value: parentOn,
      writable: true,
      configurable: true,
    });
    const child = createTestClient(
      { message: MessageClient({ id: "child" }) },
      { parent: parent as AssistantClient },
    );

    const unsubscribe = child.getClient().on("thread.pinged" as never, vi.fn());

    expect(parentOn).toHaveBeenCalledOnce();
    expect(parentOn.mock.contexts[0]).toBe(parent);

    unsubscribe();
    child.destroy();
    parentHandle.destroy();
  });

  it("preserves subscriber scope through a transparent parent wrapper", async () => {
    const parentHandle = createTestClient({
      thread: ThreadClient(),
      message: MessageClient({ id: "parent" }),
    });
    const parent = Object.create(parentHandle.getClient()) as AssistantClient;
    const child = createTestClient(
      {
        message: Derived({
          source: "thread",
          query: { index: 1 },
          get: (aui: AnyClient) => aui.thread.message({ index: 1 }),
        } as never),
      },
      { parent },
    );
    const cb = vi.fn();
    child.getClient().on("message.pinged", cb);

    flushTapSync(() => parentHandle.getClient().message.ping("parent"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    flushTapSync(() =>
      parentHandle.getClient().thread.message({ index: 1 }).ping("derived"),
    );
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
      value: "derived",
    });

    child.destroy();
    parentHandle.destroy();
  });

  it("preserves the receiver when a generated parent's on is overridden", () => {
    const parentHandle = createTestClient({ thread: ThreadClient() });
    const parent = parentHandle.getClient() as AssistantClient;
    const parentOn = vi.fn(function () {
      return () => {};
    });
    Object.defineProperty(parent, "on", {
      value: parentOn,
      writable: true,
      configurable: true,
    });
    const child = createTestClient(
      { message: MessageClient({ id: "child" }) },
      { parent },
    );

    const unsubscribe = child.getClient().on("thread.pinged" as never, vi.fn());

    expect(parentOn).toHaveBeenCalledOnce();
    expect(parentOn.mock.contexts[0]).toBe(parent);

    unsubscribe();
    child.destroy();
    parentHandle.destroy();
  });

  it("preserves subscriber scope through a generated parent from another module instance", async () => {
    const parentHandle = createTestClient({
      message: MessageClient({ id: "parent" }),
    });
    const parent = parentHandle.getClient() as AssistantClient;
    const eventInternalsKey = Symbol.for(
      Symbol.keyFor(EVENT_CLIENT_INTERNALS)!,
    );
    const parentInternals = (
      parent as unknown as Record<
        PropertyKey,
        {
          ref: { current: AssistantClient | null };
          on: AssistantClient["on"];
        }
      >
    )[eventInternalsKey]!;

    // A second installed copy creates a different function identity but uses
    // the shared global-symbol protocol on its generated client object.
    const foreignOn: AssistantClient["on"] = function (
      this: AssistantClient,
      selector: never,
      callback: never,
    ) {
      return parentInternals.on.call(this, selector, callback);
    };
    const foreignParent = Object.create(parent) as AssistantClient;
    const foreignRef = { current: foreignParent };
    Object.defineProperties(foreignParent, {
      on: { value: foreignOn, writable: true, configurable: true },
      [eventInternalsKey]: {
        value: { ref: foreignRef, on: foreignOn },
      },
    });

    const child = createTestClient(
      { message: MessageClient({ id: "child" }) },
      { parent: foreignParent },
    );
    const cb = vi.fn();
    child.getClient().on("message.pinged", cb);

    flushTapSync(() => parentHandle.getClient().message.ping("parent"));
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    flushTapSync(() => child.getClient().message.ping("child"));
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "child",
      value: "child",
    });

    child.destroy();
    parentHandle.destroy();
  });

  it("allows a scope named after the event internals registry key", async () => {
    const scope = Symbol.keyFor(EVENT_CLIENT_INTERNALS)!;
    const handle = createTestClient({
      [scope]: MessageClient({ id: "collision" }),
    });
    const client = handle.getClient();
    const cb = vi.fn();
    client.on({ scope, event: "message.pinged" } as never, cb);

    flushTapSync(() => client[scope].ping("value"));
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "collision",
      value: "value",
    });

    handle.destroy();
  });

  it("drops queued events when a scope falls back to an unavailable accessor", async () => {
    const emptyParentHandle = createTestClient({});
    const parent = {
      subscribe: () => () => {},
      on: () => () => {},
      message: emptyParentHandle.getClient().message,
    } as unknown as AssistantClient;
    let config: Record<string, unknown> = {
      message: MessageClient({ id: "child" }),
    };
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((listener) => listener());
    const child = createTestClient(
      {
        getConfig: () => config,
        subscribe: (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      { parent },
    );
    const subscribed = child.getClient();
    const cb = vi.fn();
    subscribed.on("message.pinged", cb);

    flushTapSync(() => subscribed.message.ping("queued"));
    config = {};
    flushTapSync(notify);
    await flushEvents();

    expect(cb).not.toHaveBeenCalled();

    child.destroy();
    emptyParentHandle.destroy();
  });

  it.each([
    "constructor",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "__proto__",
  ])("rejects an unavailable scope named %s", (scope) => {
    const handle = createTestClient({ thread: ThreadClient() });

    expect(() =>
      handle.getClient().on(`${scope}.pinged` as never, vi.fn()),
    ).toThrow(`Scope "${scope}" is not available`);

    handle.destroy();
  });

  it("extends a parent handle and re-binds across the parent's structural changes", () => {
    const parent = createTestClient({ thread: ThreadClient() });
    const child = createTestClient(
      { message: messageDerived() },
      { parent: parent as never },
    );

    expect(child.getClient().message.getState().id).toBe("m0");
    expect(child.getClient().thread.getState()).toEqual({ selected: 0 });

    flushTapSync(() => parent.getClient().thread.setSelected(1));

    expect(child.getClient().message.getState().id).toBe("m1");

    child.destroy();
    parent.destroy();
  });

  it("throws the root scope error for scopes the client does not have", () => {
    const handle = createTestClient({ thread: ThreadClient() });

    expect(() => handle.getClient().missing.getState()).toThrow(
      'The current scope does not have a "missing" property.',
    );

    handle.destroy();
  });

  it("runs scope effect cleanup on destroy", () => {
    let cleanups = 0;
    const useTrackedClient = () => {
      useEffect(() => {
        return () => {
          cleanups++;
        };
      }, []);
      return { getState: () => ({}) };
    };
    const TrackedClient = resource(useTrackedClient);

    const handle = createTestClient({ thread: TrackedClient() });
    handle.getClient();

    const afterCreate = cleanups;
    handle.destroy();
    expect(cleanups).toBe(afterCreate + 1);
  });
});
