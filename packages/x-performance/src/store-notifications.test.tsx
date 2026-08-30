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
import { createRenderCounter } from "./render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

const Slice = resource(() => {
  const [count, setCount] = useState(0);
  return { getState: () => ({ count }), setCount };
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
});
