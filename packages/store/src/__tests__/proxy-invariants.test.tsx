// @vitest-environment jsdom

import { Activity, type FC, type ReactNode, useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";

const actionCalls: string[] = [];

const useItem = ({ id }: { id: string }) => ({
  getState: () => ({ id }),
  subscribe: (callback: () => void) => {
    callback();
    return () => {};
  },
  echo: (text: string) => text,
  send: () => actionCalls.push("send"),
  remove: () => actionCalls.push("remove"),
  delete: () => actionCalls.push("delete"),
});
const Item = resource(useItem);

const useThread = () => {
  const items = useClientLookup([withKey("a", Item({ id: "a" }))]);
  return {
    getState: () => ({ count: 1 }),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const Thread = resource(useThread);

const useAccessorChild = () => ({
  getState: () => ({ id: "child" }),
});
const AccessorChild = resource(useAccessorChild);

const useAccessorClient = () => {
  const child = useClientLookup([withKey("child", AccessorChild())]);
  const getChild = () => child.get({ key: "child" });
  return {
    getState: () => ({ id: "parent" }),
    composer: getChild,
    message: getChild,
    part: getChild,
    attachment: getChild,
    item: getChild,
    queueItem: getChild,
  };
};
const AccessorClient = resource(useAccessorClient);

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
  actionCalls.length = 0;
  vi.restoreAllMocks();
});

describe("proxy invariants", () => {
  it("supports Object.keys and spread on a client", () => {
    render(<App />);
    const client = probe.aui.thread().item({ index: 0 });

    expect(Object.keys(client)).toEqual([
      "getState",
      "subscribe",
      "echo",
      "send",
      "remove",
      "delete",
    ]);
    const spread = { ...client };
    expect(Object.keys(spread)).toEqual([
      "getState",
      "subscribe",
      "echo",
      "send",
      "remove",
      "delete",
    ]);
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

  it("denies stale actions while preserving state and subscriptions", async () => {
    let lookup!: { get: (lookup: { key: string }) => Record<string, any> };
    const List: FC<{ visible: boolean }> = ({ visible }) => {
      lookup = useClientLookup(
        visible ? [withKey("a", Item({ id: "a" }))] : [],
      );
      return null;
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = render(<List visible />);
    const client = lookup.get({ key: "a" });
    const send = client.send;
    const remove = client.remove;
    const deleteAction = client.delete;
    const descriptorSend = Object.getOwnPropertyDescriptor(
      client,
      "send",
    )!.value;

    await act(async () => {
      view.rerender(<List visible={false} />);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });

    expect(client.getState()).toEqual({ id: "a" });
    const subscriber = vi.fn();
    const unsubscribe = client.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(unsubscribe()).toBeUndefined();
    expect(send()).toBeUndefined();
    expect(remove()).toBeUndefined();
    expect(deleteAction()).toBeUndefined();
    expect(descriptorSend()).toBeUndefined();
    expect(actionCalls).toEqual([]);
    expect(warning).toHaveBeenCalledTimes(4);
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "send" on a disconnected AuiClient. This call was ignored.',
    );
  });

  it("keeps child-client accessors traversable after disconnect", async () => {
    let lookup!: { get: (lookup: { key: string }) => Record<string, any> };
    const List: FC<{ visible: boolean }> = ({ visible }) => {
      lookup = useClientLookup(
        visible ? [withKey("parent", AccessorClient())] : [],
      );
      return null;
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = render(<List visible />);
    const client = lookup.get({ key: "parent" });

    await act(async () => {
      view.rerender(<List visible={false} />);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });

    for (const accessor of [
      "composer",
      "message",
      "part",
      "attachment",
      "item",
      "queueItem",
    ]) {
      expect(client[accessor]().getState()).toEqual({ id: "child" });
    }
    expect(warning).not.toHaveBeenCalled();
  });

  it("allows cancelRun during cleanup but not after disconnection", async () => {
    const cancelRun = vi.fn();
    const cancel = vi.fn();
    const send = vi.fn();
    const useCancelableThread = () => ({
      getState: () => null,
      cancelRun,
      cancel,
      send,
    });
    const CancelableThread = resource(useCancelableThread);
    let staleCancelRun!: () => void;
    let staleCancel!: () => void;
    let staleSend!: () => void;
    const Consumer: FC = () => {
      const aui = useAui() as any;
      staleCancelRun = aui.thread.cancelRun;
      staleCancel = aui.thread.cancel;
      staleSend = aui.thread.send;
      useEffect(() => () => aui.thread.cancelRun(), [aui]);
      return null;
    };
    const AppWithCancelableThread: FC = () => {
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
    const view = render(<AppWithCancelableThread />);

    view.unmount();
    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(staleCancel()).toBeUndefined();
    expect(staleSend()).toBeUndefined();
    expect(cancel).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();

    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(staleCancelRun()).toBeUndefined();
    expect(cancelRun).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "cancelRun" on a disconnected AuiClient. This call was ignored.',
    );
  });

  it("reconnects a hidden client before allowing actions again", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = <App />;
    const view = render(<Activity mode="visible">{app}</Activity>);
    const client = probe.aui.thread().item({ index: 0 });
    const echo = client.echo;

    await act(async () => {
      view.rerender(<Activity mode="hidden">{app}</Activity>);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    expect(echo("hidden")).toBeUndefined();

    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));
    expect(echo("visible")).toBe("visible");
    expect(warning).toHaveBeenCalledTimes(1);
  });
});
