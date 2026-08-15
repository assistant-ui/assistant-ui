// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientList } from "../useClientList";

type AnyClient = Record<string, any>;

type ItemData = { id: string; label: string };

const useItemClient = ({
  getInitialData,
  remove,
}: useClientList.ResourceProps<ItemData>) => {
  const [data] = useState(getInitialData);
  return {
    getState: () => data,
    remove,
  };
};
const ItemClient = resource(useItemClient);

const useThreadClient = () => {
  const list = useClientList({
    initialValues: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    getKey: (data: ItemData) => data.id,
    resource: ItemClient,
  });
  return {
    getState: () => ({ items: list.state }),
    item: (lookup: { index: number } | { key: string }) => list.get(lookup),
    add: list.add,
  };
};
const ThreadClient = resource(useThreadClient);

const setup = () => {
  let aui!: AnyClient;
  const Harness = ({ children }: { children: ReactNode }) => {
    aui = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
    return <AuiProvider value={aui as never}>{children}</AuiProvider>;
  };
  const hook = renderHook(() => useAuiState((s: AnyClient) => s.thread.items), {
    wrapper: Harness,
  });
  return { getAui: () => aui, hook };
};

afterEach(() => {
  cleanup();
});

describe("useClientList", () => {
  it("exposes initial values as client states, in order", () => {
    const { hook } = setup();
    expect(hook.result.current).toEqual([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ]);
  });

  it("add mounts a new client and notifies subscribers", () => {
    const { getAui, hook } = setup();
    const subscriber = vi.fn();
    getAui().subscribe(subscriber);

    act(() => flushTapSync(() => getAui().thread.add({ id: "c", label: "C" })));

    expect(subscriber).toHaveBeenCalled();
    expect(hook.result.current).toEqual([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ]);
    expect(getAui().thread.item({ key: "c" }).getState()).toEqual({
      id: "c",
      label: "C",
    });
  });

  it("remove unmounts the client and notifies subscribers", () => {
    const { getAui, hook } = setup();
    const subscriber = vi.fn();
    getAui().subscribe(subscriber);

    act(() => flushTapSync(() => getAui().thread.item({ key: "a" }).remove()));

    expect(subscriber).toHaveBeenCalled();
    expect(hook.result.current).toEqual([{ id: "b", label: "B" }]);
    expect(() => getAui().thread.item({ key: "a" })).toThrow(
      'key "a" not found',
    );
  });

  it("lookup works by index and by key", () => {
    const { getAui } = setup();
    expect(getAui().thread.item({ index: 1 }).getState()).toEqual({
      id: "b",
      label: "B",
    });
    expect(() => getAui().thread.item({ index: 2 })).toThrow("out of bounds");
  });

  it("adding a duplicate key throws", () => {
    const { getAui } = setup();
    expect(() =>
      act(() =>
        flushTapSync(() => getAui().thread.add({ id: "a", label: "A2" })),
      ),
    ).toThrow("key a that already exists");
  });
});
