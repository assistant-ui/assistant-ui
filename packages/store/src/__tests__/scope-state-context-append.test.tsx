// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { AuiConfig } from "../AuiConfig";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientList } from "../useClientList";

const useItemClient = ({ key }: { key: string }) => ({
  getState: () => ({ key }),
});
const ItemClient = resource(useItemClient);

const useListClient = () => {
  const items = useClientList({
    initialValues: [{ key: "a" }],
    getKey: (d) => d.key,
    resource: ItemClient,
  });
  return {
    getState: () => ({ items: items.state }),
    item: (lookup: { index: number }) => items.get(lookup),
    add: (key: string) => items.add({ key }),
  };
};
const ListClient = resource(useListClient);

const ItemProvider = ({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) => {
  const aui = useAui();
  const config = AuiConfig({
    item: Derived({
      source: "list",
      query: { index },
      get: (aui: any) => aui.list.item({ index }),
    } as never),
  } as never);
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};

const Item = () => {
  const key = (useAuiState("item" as never) as any).key;
  return <span data-testid="item">{key}</span>;
};

const Items = () => {
  const length = (useAuiState("list" as never) as any).items.length;
  return Array.from({ length }, (_, i) => (
    <ItemProvider key={i} index={i}>
      <Item />
    </ItemProvider>
  ));
};

describe("derived-by-index provider mounted from render-phase length", () => {
  it("renders an item appended in the same update", () => {
    let aui!: any;
    const Capture = () => ((aui = useAui()), null);
    render(
      <AuiProvider config={AuiConfig({ list: ListClient() } as never)}>
        <Capture />
        <Items />
      </AuiProvider>,
    );
    expect(screen.getAllByTestId("item").map((e) => e.textContent)).toEqual([
      "a",
    ]);
    act(() => aui.list.add("b"));
    expect(screen.getAllByTestId("item").map((e) => e.textContent)).toEqual([
      "a",
      "b",
    ]);
  });
});
