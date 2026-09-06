// @vitest-environment jsdom

import type { FC, ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";

const useItem = ({ id }: { id: string }) => ({
  getState: () => ({ id }),
  echo: (text: string) => text,
});
const Item = resource(useItem);

const useThread = () => {
  const items = useClientLookup([
    withKey("a", Item({ id: "a" })),
    withKey("__proto__", Item({ id: "proto" })),
  ]);
  return {
    getState: () => ({ count: 2 }),
    item: (lookup: { index: number } | { key: string }) => items.get(lookup),
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
});

describe("proxy invariants", () => {
  it("retrieves prototype-named keys without inherited matches", () => {
    render(<App />);
    expect(probe.aui.thread().item({ key: "__proto__" }).getState()).toEqual({
      id: "proto",
    });
    expect(() => probe.aui.thread().item({ key: "constructor" })).toThrow(
      /not found/,
    );
  });

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
    expect(spread.thread).toEqual({ count: 2 });
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
    expect(spread.thread).toEqual({ count: 2 });
    expect(spread.item).toEqual({ id: "x" });
  });
});
