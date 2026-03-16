// @vitest-environment jsdom

/**
 * Regression test for useSyncExternalStore infinite-loop bug.
 *
 * Selectors that create new arrays on every call (e.g. .map((_, i) => i))
 * violate useSyncExternalStore's contract that getSnapshot must return the same
 * value when the store hasn't changed. This causes "Maximum update depth exceeded".
 */

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider } from "../utils/react-assistant-context";
import { AuiForEach } from "../AuiForEach";
import { PROXIED_ASSISTANT_STATE_SYMBOL } from "../utils/proxied-assistant-state";

afterEach(() => {
  vi.restoreAllMocks();
});

type Listener = () => void;

const createTestAuiClient = (initialState: Record<string, unknown>) => {
  const listeners = new Set<Listener>();
  const state = initialState;

  const client = {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on: () => () => {},
    [PROXIED_ASSISTANT_STATE_SYMBOL]: state,
  } as const;

  return {
    client,
    state,
    notify: () => listeners.forEach((listener) => listener()),
  };
};

describe("AuiForEach infinite loop prevention", () => {
  it("does not infinite-loop with unstable index-based keys selector", () => {
    const testClient = createTestAuiClient({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });

    let childRenderCount = 0;

    const TestComponent = () => (
      <AuiForEach
        keys={((s: any) => s.items.map((_: unknown, i: number) => i)) as any}
      >
        {(key: number) => {
          childRenderCount++;
          return <div>Item {key}</div>;
        }}
      </AuiForEach>
    );

    render(
      <AuiProvider value={testClient.client as never}>
        <TestComponent />
      </AuiProvider>,
    );

    // 3 items rendered initially
    expect(childRenderCount).toBe(3);
    childRenderCount = 0;

    // Notify without changing data — must not infinite-loop.
    // Before the fix, this throws "Maximum update depth exceeded".
    act(() => {
      testClient.notify();
    });

    // Should not have re-rendered children (data unchanged)
    expect(childRenderCount).toBeLessThan(10);
  });

  it("does not infinite-loop with unstable id-based keys selector", () => {
    const testClient = createTestAuiClient({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });

    let childRenderCount = 0;

    const TestComponent = () => (
      <AuiForEach
        keys={
          ((s: any) => s.items.map((item: { id: string }) => item.id)) as any
        }
      >
        {(key: string) => {
          childRenderCount++;
          return <div>Item {key}</div>;
        }}
      </AuiForEach>
    );

    render(
      <AuiProvider value={testClient.client as never}>
        <TestComponent />
      </AuiProvider>,
    );

    expect(childRenderCount).toBe(3);
    childRenderCount = 0;

    act(() => {
      testClient.notify();
    });

    expect(childRenderCount).toBeLessThan(10);
  });

  it("re-renders correctly when item IDs change (same length)", () => {
    const testClient = createTestAuiClient({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });

    const rendered: string[] = [];

    const TestComponent = () => (
      <AuiForEach
        keys={
          ((s: any) => s.items.map((item: { id: string }) => item.id)) as any
        }
      >
        {(key: string) => {
          rendered.push(key);
          return <div>{key}</div>;
        }}
      </AuiForEach>
    );

    render(
      <AuiProvider value={testClient.client as never}>
        <TestComponent />
      </AuiProvider>,
    );

    expect(rendered).toEqual(["a", "b", "c"]);
    rendered.length = 0;

    act(() => {
      (testClient.state as any).items = [{ id: "a" }, { id: "x" }, { id: "c" }];
      testClient.notify();
    });

    // Should have re-rendered with the changed IDs
    expect(rendered).toEqual(["a", "x", "c"]);
  });

  it("works with stable state references (no derived array)", () => {
    const testClient = createTestAuiClient({
      threadIds: ["t1", "t2", "t3"],
    });

    let childRenderCount = 0;

    const TestComponent = () => (
      <AuiForEach keys={((s: any) => s.threadIds) as any}>
        {(key: string) => {
          childRenderCount++;
          return <div>Thread {key}</div>;
        }}
      </AuiForEach>
    );

    render(
      <AuiProvider value={testClient.client as never}>
        <TestComponent />
      </AuiProvider>,
    );

    expect(childRenderCount).toBe(3);
    childRenderCount = 0;

    act(() => {
      testClient.notify();
    });

    expect(childRenderCount).toBeLessThan(10);
  });
});
