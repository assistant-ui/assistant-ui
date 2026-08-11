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
