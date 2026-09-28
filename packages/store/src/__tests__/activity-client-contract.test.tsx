// @vitest-environment jsdom

import { Activity, useEffect, useLayoutEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { resource, withKey } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import { RenderChildrenWithAccessor } from "../RenderChildrenWithAccessor";
import { useAui } from "../useAui";
import { useClientLookup } from "../useClientLookup";

const calls = vi.hoisted(() => ({ send: vi.fn(() => "dispatched") }));
const initialItemState = { value: 1 };

type ItemClient = {
  getState: () => { value: number };
  send: () => string;
};
type TestClient = {
  thread: {
    item: (lookup: { index: number }) => ItemClient;
  };
  message: ItemClient;
};

const useItem = ({
  onEffect,
  onRender,
}: {
  onEffect?: () => void | (() => void);
  onRender?: () => void;
}) => {
  onRender?.();
  useEffect(() => onEffect?.(), [onEffect]);
  return { getState: () => initialItemState, send: calls.send };
};
const Item = resource(useItem);

const useThread = (props: Parameters<typeof useItem>[0]) => {
  const items = useClientLookup([withKey("selected", Item(props))]);
  return {
    getState: () => ({ items: items.state }),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const Thread = resource(useThread);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  calls.send.mockClear();
});

it("dispatches from a wrapped tap resource effect and descendant layout and passive effects on reveal", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const results: { phase: string; result: string }[] = [];
  let client!: TestClient;
  const send = (phase: string) =>
    results.push({ phase, result: client.thread.item({ index: 0 }).send() });
  const props = {
    onEffect: () => {
      send("tap");
    },
  };
  const Child = () => {
    client = useAui() as unknown as TestClient;
    useLayoutEffect(() => {
      send("layout");
    }, []);
    useEffect(() => {
      send("passive");
    }, []);
    return null;
  };
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <AuiProvider config={AuiConfig({ thread: Thread(props) } as never)}>
        <Child />
      </AuiProvider>
    </Activity>
  );

  const view = render(tree("visible"));
  expect(results.map(({ phase }) => phase).sort()).toEqual([
    "layout",
    "passive",
    "tap",
  ]);
  view.rerender(tree("hidden"));
  await act(async () => {});
  results.length = 0;
  view.rerender(tree("visible"));
  await act(async () => {});

  expect(results.map(({ phase }) => phase).sort()).toEqual([
    "layout",
    "passive",
    "tap",
  ]);
  expect(results.every(({ result }) => result === "dispatched")).toBe(true);
  expect(calls.send).toHaveBeenCalledTimes(6);
  expect(warn).not.toHaveBeenCalled();
});

it("keeps a captured method connected through real hide and reveal commits in one task", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const lifecycle: string[] = [];
  let client!: TestClient;
  const props = {
    onEffect: () => {
      lifecycle.push("setup");
      return () => lifecycle.push("cleanup");
    },
  };
  const Child = () => {
    client = useAui() as unknown as TestClient;
    return null;
  };
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <AuiProvider config={AuiConfig({ thread: Thread(props) } as never)}>
        <Child />
      </AuiProvider>
    </Activity>
  );
  const view = render(tree("visible"));
  const item = client.thread.item({ index: 0 });
  const send = item.send;

  view.rerender(tree("hidden"));
  expect(lifecycle).toEqual(["setup", "cleanup"]);
  expect(item.send).toBe(send);
  view.rerender(tree("visible"));
  expect(lifecycle).toEqual(["setup", "cleanup", "setup"]);
  await act(async () => {});

  expect(item.send).toBe(send);
  expect(send()).toBe("dispatched");
  expect(calls.send).toHaveBeenCalledTimes(1);
  expect(warn).not.toHaveBeenCalled();
});

it("reconnects a captured method under nested Activity boundaries", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const lifecycle: string[] = [];
  let client!: TestClient;
  const props = {
    onEffect: () => {
      lifecycle.push("setup");
      return () => lifecycle.push("cleanup");
    },
  };
  const Child = () => {
    client = useAui() as unknown as TestClient;
    return null;
  };
  const tree = (outer: "visible" | "hidden", inner: "visible" | "hidden") => (
    <Activity mode={outer}>
      <Activity mode={inner}>
        <AuiProvider config={AuiConfig({ thread: Thread(props) } as never)}>
          <Child />
        </AuiProvider>
      </Activity>
    </Activity>
  );
  const view = render(tree("visible", "visible"));
  const item = client.thread.item({ index: 0 });
  const send = item.send;

  view.rerender(tree("visible", "hidden"));
  await act(async () => {});
  view.rerender(tree("visible", "visible"));
  await act(async () => {});
  expect(send()).toBe("dispatched");
  view.rerender(tree("hidden", "visible"));
  await act(async () => {});
  view.rerender(tree("visible", "visible"));
  await act(async () => {});

  expect(lifecycle).toEqual(["setup", "cleanup", "setup", "cleanup", "setup"]);
  expect(item.send).toBe(send);
  expect(send()).toBe("dispatched");
  expect(warn).not.toHaveBeenCalled();
});

it("reconnects on reveal without a fresh resource render", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const onRender = vi.fn();
  let client!: TestClient;
  const props = { onRender };
  const Child = () => {
    client = useAui() as unknown as TestClient;
    return null;
  };
  const provider = (
    <AuiProvider config={AuiConfig({ thread: Thread(props) } as never)}>
      <Child />
    </AuiProvider>
  );
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>{provider}</Activity>
  );
  const view = render(tree("visible"));
  const item = client.thread.item({ index: 0 });
  const send = item.send;
  const renders = onRender.mock.calls.length;

  view.rerender(tree("hidden"));
  await act(async () => {});
  view.rerender(tree("visible"));
  await act(async () => {});

  expect(onRender).toHaveBeenCalledTimes(renders);
  expect(item.send).toBe(send);
  expect(send()).toBe("dispatched");
  expect(warn).not.toHaveBeenCalled();
});

it("reads Derived and list item state during a hidden re-render and after a hidden item update", async () => {
  const derivedReads: number[] = [];
  const listReads: number[] = [];
  let client!: TestClient;
  let itemState = { value: 1 };
  let getItem!: () => { value: number };
  let readDuringRender = true;
  let hiddenRenders = 0;
  const useMutableItem = () => ({
    getState: () => itemState,
    send: calls.send,
  });
  const MutableItem = resource(useMutableItem);
  const useMutableThread = () => {
    const items = useClientLookup([withKey("selected", MutableItem())]);
    return {
      getState: () => ({ items: items.state }),
      item: (lookup: { index: number }) => items.get(lookup),
    };
  };
  const MutableThread = resource(useMutableThread);
  const Root = ({ revision }: { revision: number }) => {
    const config = AuiConfig({ thread: MutableThread() } as never);
    return (
      <AuiProvider config={config}>
        <Selected revision={revision} />
      </AuiProvider>
    );
  };
  const Selected = ({ revision }: { revision: number }) => {
    const parent = useAui();
    const config = AuiConfig({
      message: Derived<"message">({
        source: "thread",
        query: { index: 0 },
        get: (aui) => {
          const item = (aui as unknown as TestClient).thread.item({ index: 0 });
          derivedReads.push(item.getState().value);
          return item as never;
        },
      }),
    } as never);
    if (revision > 0) hiddenRenders++;
    return (
      <AuiProvider extends={parent} config={config}>
        <Reader />
      </AuiProvider>
    );
  };
  const Reader = () => {
    client = useAui() as unknown as TestClient;
    return (
      <RenderChildrenWithAccessor
        getItemState={(aui) => {
          const value = (aui as unknown as TestClient).message.getState();
          listReads.push(value.value);
          return value;
        }}
      >
        {(getter) => {
          getItem = getter;
          if (readDuringRender) getter();
          return <span />;
        }}
      </RenderChildrenWithAccessor>
    );
  };
  const tree = (mode: "visible" | "hidden", revision: number) => (
    <Activity mode={mode}>
      <Root revision={revision} />
    </Activity>
  );
  const view = render(tree("visible", 0));
  expect(client.message.getState().value).toBe(1);
  expect(listReads.length).toBeGreaterThanOrEqual(2);
  expect(listReads[0]).toBe(1);
  readDuringRender = false;
  view.rerender(tree("hidden", 0));
  await act(async () => {});
  view.rerender(tree("hidden", 1));
  await act(async () => {});
  expect(hiddenRenders).toBeGreaterThan(0);
  expect(derivedReads.at(-1)).toBe(1);
  expect(listReads.at(-1)).toBe(1);
  expect(getItem().value).toBe(1);

  itemState = { value: 2 };
  view.rerender(tree("hidden", 2));
  await act(async () => {});

  expect(hiddenRenders).toBeGreaterThan(1);
  expect(derivedReads.at(-1)).toBe(2);
  expect(listReads.at(-1)).toBe(2);
  const readsBeforeGetter = listReads.length;
  expect(getItem().value).toBe(2);
  expect(listReads).toHaveLength(readsBeforeGetter + 1);
  expect(client.message.getState().value).toBe(2);
});
