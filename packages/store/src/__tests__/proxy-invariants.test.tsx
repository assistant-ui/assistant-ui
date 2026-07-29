// @vitest-environment jsdom

import type { FC } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
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

const App: FC = () => {
  const aui = useAui({ thread: Thread() } as unknown as useAui.Props);
  probe.aui = aui;
  return (
    <AuiProvider value={aui}>
      <Leaf />
    </AuiProvider>
  );
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
});
