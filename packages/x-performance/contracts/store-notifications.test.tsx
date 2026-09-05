import { describe, expect, it } from "vitest";
import { createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { resource, flushTapSync } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  useAui,
  useAuiState,
} from "@assistant-ui/store";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

const Slice = resource(() => {
  const [count, setCount] = useState(0);
  return { getState: () => ({ count }), setCount };
});

const items = [1];
const Snapshot = resource(() => {
  const [state, setState] = useState<{ items: number[] }>(() => ({ items }));
  return {
    getState: () => state,
    reuseItems: () => setState({ items }),
    replaceItems: () => setState({ items: [...items] }),
  };
});

describe("store notification granularity", () => {
  it("one slice write re-renders only that slice's subscriber", () => {
    const counter = createRenderCounter();
    let aui!: ReturnType<typeof useAui>;

    const SubscriberA = () => {
      counter.useRender("subscriber-a");
      const value = useAuiState(
        (s) => (s as unknown as { a: { count: number } }).a.count,
      );
      return createElement("span", null, value);
    };
    const SubscriberB = () => {
      counter.useRender("subscriber-b");
      const value = useAuiState(
        (s) => (s as unknown as { b: { count: number } }).b.count,
      );
      return createElement("span", null, value);
    };
    const Grab = () => {
      aui = useAui();
      return null;
    };

    const config = AuiConfig({
      a: Slice(),
      b: Slice(),
    } as unknown as AuiConfig.Input);

    const App = (): ReactNode => (
      <AuiProvider config={config}>
        <Grab />
        <SubscriberA />
        <SubscriberB />
      </AuiProvider>
    );

    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(App)));

    expect(counter.renders("subscriber-a")).toBe(1);
    expect(counter.renders("subscriber-b")).toBe(1);

    const client = aui as unknown as {
      a: { setCount: (n: number) => void };
    };
    let notifications = 0;
    aui.subscribe(() => {
      notifications += 1;
    });

    flushSync(() => flushTapSync(() => client.a.setCount(1)));

    expect(notifications).toBe(1);
    expect(counter.renders("subscriber-a")).toBe(2);
    expect(counter.renders("subscriber-b")).toBe(1);

    flushSync(() => flushTapSync(() => client.a.setCount(1)));

    expect(counter.renders("subscriber-a")).toBe(2);
    expect(counter.renders("subscriber-b")).toBe(1);

    flushSync(() => root.unmount());
  });

  it("one slice write runs only that slice's selector", () => {
    const runs = { a: 0, b: 0 };
    let aui!: ReturnType<typeof useAui>;

    const Subscriber = ({ scope }: { scope: "a" | "b" }) => {
      const value = useAuiState((s) => {
        runs[scope] += 1;
        return (s as unknown as Record<string, { count: number }>)[scope]!
          .count;
      });
      return createElement("span", null, value);
    };
    const Grab = () => {
      aui = useAui();
      return null;
    };

    const config = AuiConfig({
      a: Slice(),
      b: Slice(),
    } as unknown as AuiConfig.Input);

    const root = createRoot(document.createElement("div"));
    flushSync(() =>
      root.render(
        <AuiProvider config={config}>
          <Grab />
          <Subscriber scope="a" />
          <Subscriber scope="b" />
        </AuiProvider>,
      ),
    );

    const client = aui as unknown as { a: { setCount: (n: number) => void } };
    runs.a = 0;
    runs.b = 0;

    flushSync(() => flushTapSync(() => client.a.setCount(1)));

    // The write costs the reading scope two extra selector runs, one to
    // recollect its dependencies and one for the snapshot React compares
    // against. The scope that was never read pays nothing, which is the trade:
    // a list pays the extra runs once and skips every unread sibling.
    expect(runs.a).toBe(6);
    expect(runs.b).toBe(0);

    flushSync(() => root.unmount());
  });

  it("a snapshot notifies only when a top-level value is replaced", () => {
    let runs = 0;
    let aui!: ReturnType<typeof useAui>;

    const Subscriber = () => {
      const value = useAuiState((s) => {
        runs += 1;
        return (s as unknown as { snapshot: { items: number[] } }).snapshot
          .items;
      });
      return createElement("span", null, value.length);
    };
    const Grab = () => {
      aui = useAui();
      return null;
    };

    const config = AuiConfig({
      snapshot: Snapshot(),
    } as unknown as AuiConfig.Input);

    const root = createRoot(document.createElement("div"));
    flushSync(() =>
      root.render(
        <AuiProvider config={config}>
          <Grab />
          <Subscriber />
        </AuiProvider>,
      ),
    );

    const client = aui as unknown as {
      snapshot: { reuseItems: () => void; replaceItems: () => void };
    };
    runs = 0;

    // A fresh top-level object whose fields are all identity-equal is the same
    // snapshot, so it never reaches a subscriber.
    flushSync(() => flushTapSync(() => client.snapshot.reuseItems()));
    expect(runs).toBe(0);

    // Replacing the containing top-level value is therefore what a nested
    // change has to do to be observed at all.
    flushSync(() => flushTapSync(() => client.snapshot.replaceItems()));
    expect(runs).toBe(6);

    flushSync(() => root.unmount());
  });
});
