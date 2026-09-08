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
      { id: "10", label: "A" },
      { id: "2", label: "B" },
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
  it("preserves insertion order for integer-like keys", () => {
    const { hook } = setup();
    expect(hook.result.current).toEqual([
      { id: "10", label: "A" },
      { id: "2", label: "B" },
    ]);
  });

  it("appends integer-like keys and notifies subscribers", () => {
    const { getAui, hook } = setup();
    const subscriber = vi.fn();
    getAui().subscribe(subscriber);

    act(() => flushTapSync(() => getAui().thread.add({ id: "1", label: "C" })));

    expect(subscriber).toHaveBeenCalled();
    expect(hook.result.current).toEqual([
      { id: "10", label: "A" },
      { id: "2", label: "B" },
      { id: "1", label: "C" },
    ]);
    expect(getAui().thread.item({ key: "1" }).getState()).toEqual({
      id: "1",
      label: "C",
    });
  });

  it("adds, removes, and re-adds an inherited key without losing plain keys", () => {
    const { getAui, hook } = setup();
    const data = { id: "constructor", label: "Added" };

    act(() => flushTapSync(() => getAui().thread.add(data)));

    expect(hook.result.current).toEqual([
      { id: "10", label: "A" },
      { id: "2", label: "B" },
      { id: "constructor", label: "Added" },
    ]);
    expect(getAui().thread.item({ key: "constructor" }).getState()).toEqual(
      data,
    );
    expect(getAui().thread.item({ key: "10" }).getState()).toEqual({
      id: "10",
      label: "A",
    });

    act(() =>
      flushTapSync(() => getAui().thread.item({ key: "constructor" }).remove()),
    );
    expect(() => getAui().thread.item({ key: "constructor" })).toThrow(
      /not found/,
    );

    act(() => flushTapSync(() => getAui().thread.add(data)));
    expect(getAui().thread.item({ key: "constructor" }).getState()).toEqual(
      data,
    );
    expect(() =>
      act(() => flushTapSync(() => getAui().thread.add(data))),
    ).toThrow(/already exists/);
  });

  it("preserves integer-like key order after removal and notifies subscribers", () => {
    const { getAui, hook } = setup();
    act(() => flushTapSync(() => getAui().thread.add({ id: "1", label: "C" })));
    const subscriber = vi.fn();
    getAui().subscribe(subscriber);

    act(() => flushTapSync(() => getAui().thread.item({ key: "2" }).remove()));

    expect(subscriber).toHaveBeenCalled();
    expect(hook.result.current).toEqual([
      { id: "10", label: "A" },
      { id: "1", label: "C" },
    ]);
    expect(() => getAui().thread.item({ key: "2" })).toThrow(/not found/);
  });

  it("lookup works by index and by key", () => {
    const { getAui } = setup();
    expect(getAui().thread.item({ index: 1 }).getState()).toEqual({
      id: "2",
      label: "B",
    });
    expect(() => getAui().thread.item({ index: 2 })).toThrow("out of bounds");
  });

  it("adding a duplicate key throws", () => {
    const { getAui } = setup();
    expect(() =>
      act(() =>
        flushTapSync(() => getAui().thread.add({ id: "10", label: "A2" })),
      ),
    ).toThrow("key 10 that already exists");
  });
});
