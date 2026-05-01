// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider } from "../utils/react-assistant-context";
import { RenderChildrenWithAccessor } from "../RenderChildrenWithAccessor";
import { PROXIED_ASSISTANT_STATE_SYMBOL } from "../utils/proxied-assistant-state";

afterEach(() => {
  vi.restoreAllMocks();
});

type Listener = () => void;

const createTestAuiClient = () => {
  const listeners = new Set<Listener>();
  let itemState: { value: number; isEditing: boolean } = {
    value: 1,
    isEditing: false,
  };

  const proxiedState = {
    item: itemState,
  };

  const client = {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on: () => () => {},
    [PROXIED_ASSISTANT_STATE_SYMBOL]: proxiedState,
  } as const;

  return {
    client,
    getItemState: () => itemState,
    update: (next: Partial<typeof itemState>) => {
      itemState = { ...itemState, ...next };
      proxiedState.item = itemState;
      // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally has no return
      listeners.forEach((listener) => listener());
    },
  };
};

describe("RenderChildrenWithAccessor", () => {
  it("re-renders when accessed state updates (regression: issue #3838)", () => {
    const testClient = createTestAuiClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const { container } = render(
      <RenderChildrenWithAccessor
        getItemState={() => testClient.getItemState()}
      >
        {(getItem) => {
          const item = getItem();
          return <div>{item.isEditing ? "editing" : "viewing"}</div>;
        }}
      </RenderChildrenWithAccessor>,
      { wrapper },
    );

    expect(container.textContent).toBe("viewing");

    act(() => {
      testClient.update({ isEditing: true });
    });

    expect(container.textContent).toBe("editing");

    act(() => {
      testClient.update({ isEditing: false });
    });

    expect(container.textContent).toBe("viewing");
  });

  it("does not schedule an extra render on first access (initial snapshot matches getItemState)", () => {
    const testClient = createTestAuiClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const renderSpy = vi.fn();

    render(
      <RenderChildrenWithAccessor
        getItemState={() => testClient.getItemState()}
      >
        {(getItem) => {
          renderSpy();
          const item = getItem();
          return <div>{item.value}</div>;
        }}
      </RenderChildrenWithAccessor>,
      { wrapper },
    );

    // first mount accesses the item; useSyncExternalStore's post-commit
    // tearing check should see a stable snapshot and not force a re-render
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it("does not re-render when item is never accessed", () => {
    const testClient = createTestAuiClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuiProvider value={testClient.client as never}>{children}</AuiProvider>
    );

    const renderSpy = vi.fn();

    render(
      <RenderChildrenWithAccessor
        getItemState={() => testClient.getItemState()}
      >
        {() => {
          renderSpy();
          return <div>static</div>;
        }}
      </RenderChildrenWithAccessor>,
      { wrapper },
    );

    const initialRenderCount = renderSpy.mock.calls.length;

    act(() => {
      testClient.update({ value: 99 });
    });

    expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
  });
});
