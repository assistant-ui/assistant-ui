// @vitest-environment jsdom

import { Activity, type FC, type ReactNode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";

const useItem = ({ id }: { id: string }) => ({
  getState: () => ({ id }),
  echo: (text: string) => text,
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

    expect(Object.keys(client)).toEqual(["getState", "echo"]);
    const spread = { ...client };
    expect(Object.keys(spread)).toEqual(["getState", "echo"]);
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

  it("keeps getState readable but denies actions after disconnect", () => {
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

    expect(client.getState()).toEqual({ id: "a" });
    expect(echo("late")).toBeUndefined();
    expect(descriptorEcho("late descriptor")).toBeUndefined();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledWith(
      'Cannot call "echo" on a disconnected AuiClient. This call was ignored.',
    );
  });

  it("re-enables actions when an Activity reconnects the client", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = <App />;
    const view = render(<Activity mode="visible">{app}</Activity>);
    const client = probe.aui.thread().item({ index: 0 });
    const echo = client.echo;

    act(() => view.rerender(<Activity mode="hidden">{app}</Activity>));
    expect(client.getState()).toEqual({ id: "a" });
    expect(echo("hidden")).toBeUndefined();

    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));
    expect(client.echo).toBe(echo);
    expect(echo("visible")).toBe("visible");
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("keeps internal derived reads working across an Activity reconnect", () => {
    const DerivedApp: FC = () => {
      const aui = useAui({
        thread: Thread(),
        item: Derived({
          source: "thread",
          query: { index: 0 },
          get: (aui) => aui.thread.item({ index: 0 }),
        }),
      } as unknown as useAui.Props);
      probe.aui = aui;
      return <AuiProvider value={aui} />;
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = <DerivedApp />;
    const view = render(<Activity mode="visible">{app}</Activity>);

    expect(probe.aui.item().getState()).toEqual({ id: "a" });
    act(() => view.rerender(<Activity mode="hidden">{app}</Activity>));
    act(() => view.rerender(<Activity mode="visible">{app}</Activity>));

    expect(probe.aui.item().getState()).toEqual({ id: "a" });
    expect(warning).not.toHaveBeenCalled();
  });
});
