// @vitest-environment jsdom

import { Activity, type FC, type ReactNode, useEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import { RenderChildrenWithAccessor } from "../RenderChildrenWithAccessor";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";
import { unstable_allowClientMethodDuringCleanup } from "../useClientResource";

const useItem = ({ id }: { id: string }) => {
  const state = { id };
  return {
    getState: () => state,
    subscribe: (callback: () => void) => {
      callback();
      return () => {};
    },
    echo: (text: string) => text,
  };
};
const Item = resource(useItem);

const useThread = () => {
  const items = useClientLookup([withKey("a", Item({ id: "a" }))]);
  return {
    getState: () => ({ count: 1 }),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const Thread = resource(useThread);

const probe: { aui: any; state: any } = { aui: null, state: null };

const App: FC<{ children?: ReactNode }> = ({ children }) => {
  const aui = useAui({ thread: Thread() } as unknown as useAui.Props);
  probe.aui = aui;
  return <AuiProvider value={aui}>{children ?? <Leaf />}</AuiProvider>;
};

const Leaf: FC = () => {
  useAuiState((s) => {
    probe.state = s;
    return null;
  });
  return null;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("proxy invariants", () => {
  it("supports Object.keys and spread on a client", () => {
    render(<App />);
    const client = probe.aui.thread().item({ index: 0 });

    expect(Object.keys(client)).toEqual(["getState", "subscribe", "echo"]);
    const spread = { ...client };
    expect(Object.keys(spread)).toEqual(["getState", "subscribe", "echo"]);
    expect(spread.echo("hi")).toBe("hi");
    expect(
      Object.getOwnPropertyDescriptor(client, "getState")?.configurable,
    ).toBe(true);
  });

  it("keeps method identity and a callable descriptor value across descriptor reads", () => {
    render(<App />);
    const client = probe.aui.thread().item({ index: 0 });

    const echo = client.echo;
    const descriptor = Object.getOwnPropertyDescriptor(client, "echo");
    expect(descriptor!.value("hi")).toBe("hi");
    expect(client.echo).toBe(echo);
  });

  it("supports Object.keys and spread on the proxied state", () => {
    render(<App />);

    expect(Object.keys(probe.state)).toEqual(["thread", "optional"]);
    const spread = { ...probe.state };
    expect(spread.thread).toEqual({ count: 1 });
    expect(
      Object.getOwnPropertyDescriptor(probe.state, "thread")?.configurable,
    ).toBe(true);
  });

  it("enumerates inherited scopes on the proxied state at a nested scope", () => {
    const NestedBuilder: FC<{ children?: ReactNode }> = ({ children }) => {
      const inner = useAui({
        item: Item({ id: "x" }),
      } as unknown as useAui.Props);
      return <AuiProvider value={inner}>{children}</AuiProvider>;
    };
    render(
      <App>
        <NestedBuilder>
          <Leaf />
        </NestedBuilder>
      </App>,
    );

    expect(Object.keys(probe.state).sort()).toEqual([
      "item",
      "optional",
      "thread",
    ]);
    const spread = { ...probe.state };
    expect(spread.thread).toEqual({ count: 1 });
    expect(spread.item).toEqual({ id: "x" });
  });

  it("keeps reads available but denies actions after disconnect", async () => {
    let lookup!: ReturnType<typeof useClientLookup<ReturnType<typeof useItem>>>;
    const List: FC<{ visible: boolean }> = ({ visible }) => {
      lookup = useClientLookup(
        visible ? [withKey("a", Item({ id: "a" }))] : [],
      );
      return null;
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = render(<List visible />);
    const client = lookup.get({ key: "a" });
    const echo = client.echo;
    const descriptorEcho = Object.getOwnPropertyDescriptor(client, "echo")!
      .value as typeof client.echo;

    view.rerender(<List visible={false} />);
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(client.getState()).toEqual({ id: "a" });
    const subscriber = vi.fn();
    const unsubscribe = client.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(unsubscribe()).toBeUndefined();
    expect(echo("late")).toBeUndefined();
    expect(descriptorEcho("late descriptor")).toBeUndefined();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "echo" on a disconnected AuiClient. This call was ignored.',
    );
  });

  it("allows cleanup cancellation while denying other stale actions", async () => {
    const cancelRun = vi.fn();
    const cancel = vi.fn();
    const send = vi.fn();
    let cancelThreadRun!: () => void;
    let cancelComposer!: () => void;
    let sendMessage!: () => void;
    const useCancelableThread = () => ({
      getState: () => null,
      cancelRun: unstable_allowClientMethodDuringCleanup(cancelRun),
      cancel,
      send,
    });
    const CancelableThread = resource(useCancelableThread);
    const Consumer: FC = () => {
      const aui = useAui();
      cancelThreadRun = aui.thread.cancelRun;
      cancelComposer = aui.thread.cancel;
      sendMessage = aui.thread.send;
      useEffect(() => () => aui.thread.cancelRun(), [aui]);
      return null;
    };
    const CancelableApp: FC = () => {
      const aui = useAui({
        thread: CancelableThread(),
      } as unknown as useAui.Props);
      return (
        <AuiProvider value={aui}>
          <Consumer />
        </AuiProvider>
      );
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = render(<CancelableApp />);

    view.unmount();
    expect(cancelRun).toHaveBeenCalledTimes(1);

    cancelComposer();
    sendMessage();
    expect(cancel).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "cancel" on a disconnected AuiClient. This call was ignored.',
    );
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "send" on a disconnected AuiClient. This call was ignored.',
    );

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    cancelThreadRun();
    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "cancelRun" on a disconnected AuiClient. This call was ignored.',
    );
  });

  it("re-enables actions when an Activity reconnects the client", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = <App />;
    const view = render(<Activity mode="visible">{app}</Activity>);
    const client = probe.aui.thread().item({ index: 0 });
    const echo = client.echo;

    await act(async () => {
      view.rerender(<Activity mode="hidden">{app}</Activity>);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    expect(client.getState()).toEqual({ id: "a" });
    expect(echo("hidden")).toBeUndefined();

    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));
    expect(client.echo).toBe(echo);
    expect(echo("visible")).toBe("visible");
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("keeps a same-turn Activity reconnect connected", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = <App />;
    const view = render(<Activity mode="visible">{app}</Activity>);
    const client = probe.aui.thread().item({ index: 0 });

    act(() => view.rerender(<Activity mode="hidden">{app}</Activity>));
    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(client.echo("visible")).toBe("visible");
    expect(warning).not.toHaveBeenCalled();
  });

  it("reconnects before descendant effects run", async () => {
    const calls: string[] = [];
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Consumer: FC = () => {
      const aui = useAui();
      const [client] = useState(() => aui.thread().item({ index: 0 }));
      useEffect(() => {
        calls.push(client.echo("effect"));
      }, [client]);
      return null;
    };
    const app = (
      <App>
        <Consumer />
      </App>
    );
    const view = render(<Activity mode="visible">{app}</Activity>);

    expect(calls).toEqual(["effect"]);
    await act(async () => {
      view.rerender(<Activity mode="hidden">{app}</Activity>);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));

    expect(calls).toEqual(["effect", "effect"]);
    expect(warning).not.toHaveBeenCalled();
  });

  it("keeps internal derived reads working across an Activity reconnect", async () => {
    const DerivedApp: FC<{ renderId: number }> = ({ renderId }) => {
      const aui = useAui({
        thread: Thread(),
        item: Derived({
          source: "thread",
          query: { index: 0 },
          get: (aui) => aui.thread.item({ index: 0 }),
        }),
      } as unknown as useAui.Props);
      probe.aui = aui;
      return <AuiProvider value={aui}>{renderId}</AuiProvider>;
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = (renderId: number) => <DerivedApp renderId={renderId} />;
    const view = render(<Activity mode="visible">{app(0)}</Activity>);

    expect(probe.aui.item().getState()).toEqual({ id: "a" });
    await act(async () => {
      view.rerender(<Activity mode="hidden">{app(0)}</Activity>);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    act(() => view.rerender(<Activity mode="hidden">{app(1)}</Activity>));
    act(() => view.rerender(<Activity mode="visible">{app(2)}</Activity>));

    expect(probe.aui.item().getState()).toEqual({ id: "a" });
    expect(warning).not.toHaveBeenCalled();
  });

  it("keeps list item reads working while an Activity is disconnected", async () => {
    const ItemReader: FC<{ renderId: number }> = ({ renderId }) => (
      <RenderChildrenWithAccessor
        getItemState={(aui) =>
          aui.thread().item({ index: 0 }).getState() as { id: string }
        }
      >
        {(getItem) => <div data-render-id={renderId}>{getItem().id}</div>}
      </RenderChildrenWithAccessor>
    );
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = (renderId: number) => (
      <App>
        <ItemReader renderId={renderId} />
      </App>
    );
    const view = render(<Activity mode="visible">{app(0)}</Activity>);

    expect(view.container.textContent).toBe("a");
    await act(async () => {
      view.rerender(<Activity mode="hidden">{app(0)}</Activity>);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    act(() => view.rerender(<Activity mode="hidden">{app(1)}</Activity>));

    expect(view.container.textContent).toBe("a");
    expect(warning).not.toHaveBeenCalled();
  });
});
