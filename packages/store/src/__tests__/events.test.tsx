// @vitest-environment jsdom

import type { ReactNode } from "react";
import { Suspense, startTransition, useLayoutEffect, useState } from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { AuiConfig } from "../AuiConfig";
import { useAui } from "../useAui";
import { useAuiEvent } from "../useAuiEvent";
import { useAuiState } from "../useAuiState";
import { Derived } from "../Derived";
import { useAssistantEmit } from "../utils/tap-assistant-context";
import { useClientResource } from "../useClientResource";

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

  it("logs a rejecting async listener registered through aui.on", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { getAui } = setup();
      const aui = getAui();
      const failure = new Error("async listener failed");
      const later = vi.fn();
      aui.on({ scope: "thread", event: "thread.pinged" }, async () => {
        throw failure;
      });
      aui.on({ scope: "thread", event: "thread.pinged" }, later);

      act(() => {
        aui.thread.ping("boom");
      });
      await flushEvents();

      expect(later).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "NotificationManager: event listener error",
        failure,
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("on throws for a scope that is not available", () => {
    const { getAui } = setup();
    expect(() => getAui().on("composer.pinged" as never, vi.fn())).toThrow(
      'Scope "composer" is not available',
    );
  });

  it("on forwards to a hand-built parent when the scope is absent from the chain", () => {
    const parentUnsub = vi.fn();
    const parentOn = vi.fn(() => parentUnsub);
    const handBuilt = {
      subscribe: () => () => {},
      on: parentOn,
    };

    let child!: AnyClient;
    const Child = () => {
      child = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
      return null;
    };
    render(
      <AuiProvider value={handBuilt as never}>
        <Child />
      </AuiProvider>,
    );

    const cb = vi.fn();
    const unsub = child.on("composer.pinged", cb);
    expect(parentOn).toHaveBeenCalledExactlyOnceWith("composer.pinged", cb);

    unsub();
    expect(parentUnsub).toHaveBeenCalledOnce();
  });

  it("scoped listeners follow the scope's binding at delivery time", async () => {
    const { getAui } = setup();
    const early = vi.fn();
    getAui().on("message.pinged", early);

    act(() => flushTapSync(() => getAui().thread.setSelected(1)));

    const late = vi.fn();
    getAui().on("message.pinged", late);

    getAui().thread.message({ index: 0 }).ping("a");
    getAui().thread.message({ index: 1 }).ping("b");
    await flushEvents();

    expect(early).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "b" });
    expect(late).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "b" });
  });

  it("an in-flight scoped emission is dropped when the scope is removed before delivery", async () => {
    let aui!: AnyClient;
    const Harness = ({ hasMessage }: { hasMessage: boolean }) => {
      aui = useAui(
        (hasMessage
          ? { thread: ThreadClient(), message: messageDerived() }
          : { thread: ThreadClient() }) as unknown as useAui.Props,
      );
      return <AuiProvider value={aui as never} />;
    };
    const view = render(<Harness hasMessage />);
    const cb = vi.fn();
    aui.on("message.pinged", cb);

    aui.thread.message({ index: 0 }).ping("x");
    view.rerender(<Harness hasMessage={false} />);
    await flushEvents();

    expect(cb).not.toHaveBeenCalled();
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

  it("a listener that unsubscribes and resubscribes between emit and flush is invoked", async () => {
    const { getAui } = setup();
    const aui = getAui();
    const removed = vi.fn();
    const unsub = aui.on("thread.pinged", removed);

    aui.thread.ping("x");
    unsub();
    const resubscribed = vi.fn();
    aui.on("thread.pinged", resubscribed);
    await flushEvents();

    expect(removed).not.toHaveBeenCalled();
    expect(resubscribed).toHaveBeenCalledExactlyOnceWith({ value: "x" });
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
  it("delivers a layout-effect event after a derived rebind", () => {
    const cb = vi.fn();
    const queued: VoidFunction[] = [];
    const queueMicrotaskSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));

    const Consumer = ({ index }: { index: number }) => {
      const client = useAui();
      const message = client.message as AnyClient;
      useAuiEvent("message.pinged" as never, cb as never);
      useLayoutEffect(() => {
        if (index === 1 && message.getState().id === "m1") {
          message.ping("layout");
          for (const callback of queued.splice(0)) callback();
        }
      }, [index, message]);
      return null;
    };
    const Harness = ({ index }: { index: number }) => {
      return (
        <AuiProvider
          config={AuiConfig({
            thread: ThreadClient(),
            message: Derived({
              source: "thread",
              query: { index },
              get: (root: AnyClient) => root.thread.message({ index }),
            } as never),
          } as never)}
        >
          <Consumer index={index} />
        </AuiProvider>
      );
    };

    try {
      const view = render(<Harness index={0} />);
      view.rerender(<Harness index={1} />);

      expect(cb).toHaveBeenCalledExactlyOnceWith({
        id: "m1",
        value: "layout",
      });
    } finally {
      queueMicrotaskSpy.mockRestore();
    }
  });

  it("does not publish a speculative binding during an interrupted render", async () => {
    let resolveGate!: () => void;
    let gateOpen = false;
    const gate = new Promise<void>((resolve) => {
      resolveGate = resolve;
    });
    let setIndex!: (index: number) => void;
    let committed!: AnyClient;
    let attempted = false;
    const cb = vi.fn();

    const Consumer = ({ index }: { index: number }) => {
      const client = useAui();
      useAuiEvent("message.pinged" as never, cb as never);
      useLayoutEffect(() => {
        if (index === 0) committed = client;
      }, [client, index]);
      if (index === 1) {
        attempted = true;
        if (!gateOpen) throw gate;
      }
      return null;
    };
    const App = () => {
      const [index, updateIndex] = useState(0);
      setIndex = updateIndex;
      return (
        <Suspense fallback={null}>
          <AuiProvider
            config={AuiConfig({
              thread: ThreadClient(),
              message: Derived({
                source: "thread",
                query: { index },
                get: (root: AnyClient) => root.thread.message({ index }),
              } as never),
            } as never)}
          >
            <Consumer index={index} />
          </AuiProvider>
        </Suspense>
      );
    };

    render(<App />);
    expect(committed.message.getState().id).toBe("m0");

    act(() => {
      startTransition(() => setIndex(1));
    });
    expect(attempted).toBe(true);

    committed.thread.message({ index: 0 }).ping("committed");
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m0",
      value: "committed",
    });

    gateOpen = true;
    await act(async () => {
      resolveGate();
      await gate;
    });
  });

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

describe("derived-only providers", () => {
  const useAnchorClient = () => ({ getState: () => ({}) });
  const AnchorClient = resource(useAnchorClient);

  const messageByIndex = (index: number) =>
    Derived({
      source: "thread",
      query: { index },
      get: (aui: AnyClient) => aui.thread.message({ index }),
    } as never);

  const Listener = ({ cb }: { cb: (payload: unknown) => void }) => {
    useAuiEvent("message.pinged" as never, cb as never);
    return null;
  };

  const DerivedChild = ({
    index,
    children,
    capture,
  }: {
    index: number;
    children?: ReactNode;
    capture?: (aui: AnyClient) => void;
  }) => {
    const aui = useAui({ message: messageByIndex(index) } as never);
    capture?.(aui);
    return <AuiProvider value={aui as never}>{children}</AuiProvider>;
  };

  const mountRoot = (
    rootConfig: Record<string, unknown>,
    children: ReactNode,
  ) => {
    let root!: AnyClient;
    const Root = () => {
      root = useAui(rootConfig as never);
      return <AuiProvider value={root as never}>{children}</AuiProvider>;
    };
    render(<Root />);
    return { root: () => root };
  };

  it("delivers the child binding's event when the parent lacks the scope", async () => {
    const cb = vi.fn();
    const { root } = mountRoot(
      { thread: ThreadClient() },
      <DerivedChild index={1}>
        <Listener cb={cb} />
      </DerivedChild>,
    );

    root().thread.message({ index: 1 }).ping("hit");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "hit" });
  });

  it("filters both directions when the parent holds a different instance", async () => {
    const cb = vi.fn();
    const { root } = mountRoot(
      { thread: ThreadClient(), message: messageByIndex(0) },
      <DerivedChild index={1}>
        <Listener cb={cb} />
      </DerivedChild>,
    );

    root().thread.message({ index: 0 }).ping("parent");
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    root().thread.message({ index: 1 }).ping("child");
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "child" });
  });

  it("reaches the child listener through a scope-less intermediate host", async () => {
    const cb = vi.fn();
    let intermediate!: AnyClient;
    const Intermediate = ({ children }: { children: ReactNode }) => {
      intermediate = useAui({} as never);
      return (
        <AuiProvider value={intermediate as never}>{children}</AuiProvider>
      );
    };
    const { root } = mountRoot(
      { thread: ThreadClient() },
      <Intermediate>
        <DerivedChild index={1}>
          <Listener cb={cb} />
        </DerivedChild>
      </Intermediate>,
    );

    root().thread.message({ index: 1 }).ping("deep");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "deep" });
  });

  it("follows the committed selection across a structural swap", async () => {
    const cb = vi.fn();
    let setIndex!: (index: number) => void;
    const Swapping = () => {
      const [index, updateIndex] = useState(0);
      setIndex = updateIndex;
      return (
        <DerivedChild index={index}>
          <Listener cb={cb} />
        </DerivedChild>
      );
    };
    const { root } = mountRoot({ thread: ThreadClient() }, <Swapping />);

    act(() => setIndex(1));

    root().thread.message({ index: 0 }).ping("stale");
    await flushEvents();
    expect(cb).not.toHaveBeenCalled();

    root().thread.message({ index: 1 }).ping("fresh");
    await flushEvents();
    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "fresh" });
  });

  it("delivers to a hosted child inheriting the scope from a derived-only provider", async () => {
    const cb = vi.fn();
    const HostedChild = ({ children }: { children?: ReactNode }) => {
      const aui = useAui({ anchor: AnchorClient() } as never);
      return <AuiProvider value={aui as never}>{children}</AuiProvider>;
    };
    const { root } = mountRoot(
      { thread: ThreadClient() },
      <DerivedChild index={1}>
        <HostedChild>
          <Listener cb={cb} />
        </HostedChild>
      </DerivedChild>,
    );

    root().thread.message({ index: 1 }).ping("inherited");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
      value: "inherited",
    });
  });

  it("routes a shadowing hosted descendant through the derived-only ancestor's binding", async () => {
    const cb = vi.fn();
    const ShadowingChild = ({ children }: { children?: ReactNode }) => {
      const aui = useAui({
        anchor: AnchorClient(),
        message: messageByIndex(0),
      } as never);
      return <AuiProvider value={aui as never}>{children}</AuiProvider>;
    };
    const { root } = mountRoot(
      { thread: ThreadClient() },
      <DerivedChild index={1}>
        <ShadowingChild>
          <Listener cb={cb} />
        </ShadowingChild>
      </DerivedChild>,
    );

    // A forwarded subscription crossing a derived-only level filters with
    // that level's ref above it, so the leaking ancestor is now the
    // derived-only level (previously the root, and only when it bound the
    // scope); the descendant's own shadowed binding stays unreachable above
    // its own notification manager.
    root().thread.message({ index: 0 }).ping("shadowed");
    root().thread.message({ index: 1 }).ping("ancestor");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({
      id: "m1",
      value: "ancestor",
    });
  });

  it("filters a direct aui.on subscription by the child binding", async () => {
    const cb = vi.fn();
    let child!: AnyClient;
    const { root } = mountRoot(
      { thread: ThreadClient(), message: messageByIndex(0) },
      <DerivedChild
        index={1}
        capture={(aui) => {
          child = aui;
        }}
      />,
    );

    act(() => {
      child.on("message.pinged", cb);
    });

    root().thread.message({ index: 0 }).ping("parent");
    root().thread.message({ index: 1 }).ping("child");
    await flushEvents();

    expect(cb).toHaveBeenCalledExactlyOnceWith({ id: "m1", value: "child" });
  });
});
