// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import { Derived } from "../Derived";
import { useAssistantEmit } from "../utils/tap-assistant-context";
import { useClientResource } from "../useClientResource";
import { createAssistantClient } from "../createAssistantClient";
import { onWithBinding } from "../utils/event-binding";

type AnyClient = Record<string, any>;

const flushEvents = () => act(async () => {});

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
  const emit = useAssistantEmit();
  const [selected, setSelected] = useState(0);
  const m0 = useClientResource(MessageClient({ id: "m0" }));
  const m1 = useClientResource(MessageClient({ id: "m1" }));
  const messages = [m0, m1];
  return {
    getState: () => ({ selected }),
    setSelected,
    message: ({ index }: { index: number }) => messages[index]!.methods,
    ping: (value: string) => emit("thread.pinged" as never, { value } as never),
  };
};
const ThreadClient = resource(useThreadClient);

// Mirrors a thread list item: the client emits when it observes that it became
// the selected one, from inside the flush that performs the selection swap
const useSwitchingMessageClient = ({
  id,
  isSelected,
}: {
  id: string;
  isSelected: boolean;
}) => {
  const emit = useAssistantEmit();
  const wasSelected = useRef(isSelected);
  useEffect(() => {
    if (wasSelected.current === isSelected) return;
    wasSelected.current = isSelected;
    if (isSelected) emit("message.switchedTo" as never, { id } as never);
    else
      emit("message.pinged" as never, { id, value: "switched-away" } as never);
  }, [id, isSelected, emit]);
  return {
    getState: () => ({ id, text: "" }),
    ping: (value: string) =>
      emit("message.pinged" as never, { id, value } as never),
  };
};
const SwitchingMessageClient = resource(useSwitchingMessageClient);

const useSwitchingThreadClient = () => {
  const [selected, setSelected] = useState(0);
  const m0 = useClientResource(
    SwitchingMessageClient({ id: "m0", isSelected: selected === 0 }),
  );
  const m1 = useClientResource(
    SwitchingMessageClient({ id: "m1", isSelected: selected === 1 }),
  );
  const messages = [m0, m1];
  return {
    getState: () => ({ selected }),
    setSelected,
    message: ({ index }: { index: number }) => messages[index]!.methods,
  };
};
const SwitchingThreadClient = resource(useSwitchingThreadClient);

const messageDerived = () =>
  Derived({
    source: "thread",
    query: {},
    get: (aui: AnyClient) =>
      aui.thread.message({ index: aui.thread.getState().selected }),
  } as never);

const setup = (children?: ReactNode) => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui({
      thread: ThreadClient(),
      message: messageDerived(),
    } as unknown as useAui.Props);
    return <AuiProvider value={aui as never}>{children}</AuiProvider>;
  };
  render(<Harness />);
  return { getAui: () => aui };
};

afterEach(() => {
  cleanup();
});

describe("scope-filtered on", () => {
  it("a message-scoped listener only fires for the bound message instance", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    aui.on("message.pinged", cb);

    aui.thread.message({ index: 1 }).ping("other");
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    aui.thread.message({ index: 0 }).ping("mine");
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m0", value: "mine" });
  });

  it("a thread-scoped listener receives events emitted by descendant clients", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    aui.on({ scope: "thread", event: "message.pinged" }, cb);

    aui.thread.message({ index: 0 }).ping("a");
    aui.thread.message({ index: 1 }).ping("b");
    await flushEvents();

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith({ id: "m0", value: "a" });
    expect(cb).toHaveBeenCalledWith({ id: "m1", value: "b" });
  });

  it('scope "*" receives unwrapped payloads from every instance', async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    aui.on({ scope: "*", event: "message.pinged" }, cb);

    aui.thread.message({ index: 1 }).ping("b");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "b" });
  });

  it('event "*" receives { event, payload } envelopes for all events', async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    aui.on("*", cb);

    aui.thread.ping("t");
    aui.thread.message({ index: 0 }).ping("m");
    await flushEvents();

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith({
      event: "thread.pinged",
      payload: { value: "t" },
    });
    expect(cb).toHaveBeenCalledWith({
      event: "message.pinged",
      payload: { id: "m0", value: "m" },
    });
  });

  it("on throws for a scope that is not available", () => {
    const { getAui } = setup();
    expect(() => getAui().on("composer.pinged" as never, vi.fn())).toThrow(
      'Scope "composer" is not available',
    );
  });

  it("listeners bind to the instance resolved at subscription time", async () => {
    const { getAui } = setup();
    const boundToM0 = vi.fn();
    getAui().on("message.pinged", boundToM0);

    act(() => flushTapSync(() => getAui().thread.setSelected(1)));

    const boundToM1 = vi.fn();
    getAui().on("message.pinged", boundToM1);

    getAui().thread.message({ index: 0 }).ping("a");
    getAui().thread.message({ index: 1 }).ping("b");
    await flushEvents();

    expect(boundToM0).toHaveBeenCalledExactlyOnceWith({ id: "m0", value: "a" });
    expect(boundToM1).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "b" });
  });

  it("unsubscribe stops delivery", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    const unsub = aui.on({ scope: "thread", event: "thread.pinged" }, cb);

    aui.thread.ping("first");
    await flushEvents();
    unsub();

    aui.thread.ping("second");
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({ value: "first" });
  });
});

describe("parent chaining", () => {
  const useOtherClient = () => {
    const emit = useAssistantEmit();
    return {
      getState: () => ({}),
      ping: (value: string) =>
        emit("other.pinged" as never, { value } as never),
    };
  };
  const OtherClient = resource(useOtherClient);

  const setupChild = () => {
    let child!: AnyClient;
    const Child = () => {
      child = useAui({ other: OtherClient() } as unknown as useAui.Props);
      return null;
    };
    const { getAui } = setup(<Child />);
    return { getAui, getChild: () => child };
  };

  it("a child client's listener receives events emitted in the parent's tree", async () => {
    const { getAui, getChild } = setupChild();
    const cb = vi.fn();
    getChild().on("thread.pinged", cb);

    getAui().thread.ping("from-parent");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ value: "from-parent" });
  });

  it("parent-tree events reaching a child listener keep the parent's scope filter", async () => {
    const { getAui, getChild } = setupChild();
    const cb = vi.fn();
    getChild().on("message.pinged", cb);

    getAui().thread.message({ index: 1 }).ping("filtered");
    getAui().thread.message({ index: 0 }).ping("selected");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m0", value: "selected" });
  });

  it("scopes defined on the child deliver locally without a parent registration", async () => {
    const { getChild } = setupChild();
    const cb = vi.fn();
    getChild().on("other.pinged" as never, cb);

    getChild().other.ping("local");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ value: "local" });
  });

  it("unsubscribe tears down the chained parent registration too", async () => {
    const { getAui, getChild } = setupChild();
    const cb = vi.fn();
    const unsub = getChild().on("thread.pinged", cb);
    unsub();

    getAui().thread.ping("late");
    await flushEvents();

    expect(cb).not.toHaveBeenCalled();
  });
});

describe("microtask delivery (live-set semantics)", () => {
  it("delivery is deferred to a microtask", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const cb = vi.fn();
    aui.on("thread.pinged", cb);

    aui.thread.ping("x");
    expect(cb).not.toHaveBeenCalled();

    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({ value: "x" });
  });

  it("an emission with no listeners at emit time is dropped", async () => {
    const { getAui } = setup();
    const aui = getAui();

    aui.thread.ping("dropped");
    const cb = vi.fn();
    aui.on("thread.pinged", cb);
    await flushEvents();

    expect(cb).not.toHaveBeenCalled();
  });

  it("listeners added between emit and flush are invoked", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const first = vi.fn();
    aui.on("thread.pinged", first);

    aui.thread.ping("x");
    const late = vi.fn();
    aui.on("thread.pinged", late);
    await flushEvents();

    expect(first).toHaveBeenCalledExactlyOnceWith({ value: "x" });
    expect(late).toHaveBeenCalledExactlyOnceWith({ value: "x" });
  });

  it("listeners removed between emit and flush are skipped", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const kept = vi.fn();
    const removed = vi.fn();
    aui.on("thread.pinged", kept);
    const unsub = aui.on("thread.pinged", removed);

    aui.thread.ping("x");
    unsub();
    await flushEvents();

    expect(kept).toHaveBeenCalledExactlyOnceWith({ value: "x" });
    expect(removed).not.toHaveBeenCalled();
  });

  it("a listener may remove a not-yet-visited listener during the flush", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const second = vi.fn();
    let unsubSecond!: () => void;
    aui.on("thread.pinged", () => unsubSecond());
    unsubSecond = aui.on("thread.pinged", second);

    aui.thread.ping("x");
    await flushEvents();

    expect(second).not.toHaveBeenCalled();
  });

  it("a listener added during the flush runs within the same flush", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const added = vi.fn();
    aui.on("thread.pinged", () => {
      if (!added.mock.calls.length) aui.on("thread.pinged", added);
    });

    aui.thread.ping("x");
    await flushEvents();

    expect(added).toHaveBeenCalledExactlyOnceWith({ value: "x" });
  });
});

describe("Derived scopes", () => {
  it("useAuiEvent tracks the derived selection across structural swaps", async () => {
    let aui!: AnyClient;
    const cb = vi.fn();
    const Harness = () => {
      aui = useAui({
        thread: ThreadClient(),
        message: messageDerived(),
      } as unknown as useAui.Props);
      return (
        <AuiProvider value={aui as never}>
          <Consumer />
        </AuiProvider>
      );
    };
    const Consumer = () => {
      useAuiEvent("message.pinged" as never, cb as never);
      return null;
    };
    render(<Harness />);

    aui.thread.message({ index: 1 }).ping("before-swap");
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    act(() => flushTapSync(() => aui.thread.setSelected(1)));

    aui.thread.message({ index: 1 }).ping("after-swap");
    aui.thread.message({ index: 0 }).ping("deselected");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
      value: "after-swap",
    });
  });

  const setupSwitching = () => {
    let aui!: AnyClient;
    const listeners = {
      switchedTo: vi.fn(),
      switchedToStar: vi.fn(),
      pinged: vi.fn(),
      pingedStar: vi.fn(),
    };
    const Consumer = () => {
      useAuiEvent("message.switchedTo" as never, listeners.switchedTo as never);
      useAuiEvent(
        { scope: "*", event: "message.switchedTo" } as never,
        listeners.switchedToStar as never,
      );
      useAuiEvent("message.pinged" as never, listeners.pinged as never);
      useAuiEvent(
        { scope: "*", event: "message.pinged" } as never,
        listeners.pingedStar as never,
      );
      return null;
    };
    const Harness = () => {
      aui = useAui({
        thread: SwitchingThreadClient(),
        message: messageDerived(),
      } as unknown as useAui.Props);
      return (
        <AuiProvider value={aui as never}>
          <Consumer />
        </AuiProvider>
      );
    };
    render(<Harness />);
    return { getAui: () => aui, listeners };
  };

  it("a default-scope listener receives an event emitted by the swap itself", async () => {
    const { getAui, listeners } = setupSwitching();

    act(() => flushTapSync(() => getAui().thread.setSelected(1)));
    await flushEvents();

    expect(listeners.switchedTo).toHaveBeenCalledExactlyOnceWith({ id: "m1" });
    expect(listeners.switchedToStar).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
    });

    // the deselected item emits in the same flush; it is no longer the derived
    // selection, so only the wildcard listener hears it
    expect(listeners.pingedStar).toHaveBeenCalledExactlyOnceWith({
      id: "m0",
      value: "switched-away",
    });
    expect(listeners.pinged).not.toHaveBeenCalled();
  });

  it("the swap's event reaches a default-scope listener before React re-renders", async () => {
    const { getAui, listeners } = setupSwitching();

    // outside act: the emission is delivered while the subscriber still holds
    // the pre-swap client, the window the derived binding has to cover
    flushTapSync(() => getAui().thread.setSelected(1));
    await Promise.resolve();

    expect(listeners.switchedTo).toHaveBeenCalledExactlyOnceWith({ id: "m1" });
    expect(listeners.pinged).not.toHaveBeenCalled();

    await flushEvents();
  });

  it("a live-bound listener resolves its scope at delivery time, a snapshot one at subscription time", async () => {
    // No React commit is involved here, so nothing re-subscribes between the
    // emit and its delivery: the binding mode alone decides the outcome
    const handle = createAssistantClient({
      thread: SwitchingThreadClient(),
      message: messageDerived(),
    } as never);
    const client = () => handle.getClient() as AnyClient;

    const live = vi.fn();
    const snapshot = vi.fn();
    onWithBinding(
      client() as never,
      { scope: "message", event: "message.switchedTo" } as never,
      live as never,
      "live",
    );
    client().on("message.switchedTo" as never, snapshot as never);

    flushTapSync(() => client().thread.setSelected(1));
    await Promise.resolve();

    expect(live).toHaveBeenCalledExactlyOnceWith({ id: "m1" });
    expect(snapshot).not.toHaveBeenCalled();

    handle.destroy();
  });

  it("state subscriptions flow through a derived scope", () => {
    let aui!: AnyClient;
    const Harness = ({ children }: { children: ReactNode }) => {
      aui = useAui({
        thread: ThreadClient(),
        message: messageDerived(),
      } as unknown as useAui.Props);
      return <AuiProvider value={aui as never}>{children}</AuiProvider>;
    };
    const { result } = renderHook(
      () => useAuiState((s: AnyClient) => s.message.text),
      { wrapper: Harness },
    );
    expect(result.current).toBe("");

    act(() => flushTapSync(() => aui.message.setText("hello")));
    expect(result.current).toBe("hello");

    act(() => flushTapSync(() => aui.thread.setSelected(1)));
    expect(result.current).toBe("");
  });
});
