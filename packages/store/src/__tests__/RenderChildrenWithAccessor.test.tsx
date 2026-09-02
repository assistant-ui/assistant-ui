// @vitest-environment jsdom

import {
  type ReactNode,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { RenderChildrenWithAccessor } from "../RenderChildrenWithAccessor";
import { useAui } from "../useAui";
import { useClientLookup } from "../useClientLookup";

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

  const client = {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    on: () => () => {},
  } as const;

  return {
    client,
    getItemState: () => itemState,
    update: (next: Partial<typeof itemState>) => {
      itemState = { ...itemState, ...next };
      listeners.forEach((listener) => listener());
    },
  };
};

describe("RenderChildrenWithAccessor", () => {
  it("re-renders when accessed state updates", () => {
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

  it("tracks scopes read through methods other than getState", () => {
    const createStore = () => {
      let state = { value: 1 };
      const listeners = new Set<() => void>();
      return {
        getSnapshot: () => state,
        subscribe: (listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        setValue: (value: number) => {
          state = { value };
          for (const listener of listeners) listener();
        },
      };
    };
    const createReadableClient = (store: ReturnType<typeof createStore>) =>
      resource(function useReadableClient() {
        const value = useSyncExternalStore(store.subscribe, store.getSnapshot);
        return useMemo(
          () => ({
            getState: () => value,
            readState: () => value,
          }),
          [value],
        );
      });
    const firstStore = createStore();
    const secondStore = createStore();
    const FirstClient = createReadableClient(firstStore);
    const SecondClient = createReadableClient(secondStore);
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        first: FirstClient(),
        second: SecondClient(),
      } as unknown as useAui.Props);
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }

    const { container } = render(
      <RenderChildrenWithAccessor
        getItemState={(client: any) =>
          client.first.getState().value + client.second.readState().value
        }
      >
        {(getItem) => <div>{getItem()}</div>}
      </RenderChildrenWithAccessor>,
      { wrapper: Wrapper },
    );

    act(() => {
      flushTapSync(() => secondStore.setValue(2));
    });

    expect(container.textContent).toBe("3");
  });

  it("updates method-only clients without a state snapshot", () => {
    const useMethodOnlyClient = () => {
      const [, setVersion] = useState(0);
      const valueRef = useRef(1);
      return useMemo(
        () => ({
          readValue: () => valueRef.current,
          setValue: (value: number) => {
            valueRef.current = value;
            setVersion((version) => version + 1);
          },
        }),
        [setVersion],
      );
    };
    const MethodOnlyClient = resource(useMethodOnlyClient);
    let aui!: Record<string, any>;
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        counter: MethodOnlyClient(),
      } as unknown as useAui.Props);
      aui = client;
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }

    const { container } = render(
      <RenderChildrenWithAccessor
        getItemState={(client: any) => client.counter.readValue()}
      >
        {(getItem) => <div>{getItem()}</div>}
      </RenderChildrenWithAccessor>,
      { wrapper: Wrapper },
    );
    expect(container.textContent).toBe("1");

    act(() => {
      flushTapSync(() => aui.counter.setValue(2));
    });

    expect(container.textContent).toBe("2");
  });

  it("updates an index lookup when the client order changes", async () => {
    const useItem = ({ id }: { id: string }) => {
      const state = useMemo(() => ({ id }), [id]);
      return useMemo(() => ({ getState: () => state }), [state]);
    };
    const Item = resource(useItem);
    const useListClient = () => {
      const [ids, setIds] = useState(["a", "b"]);
      const items = useClientLookup(
        ids.map((id) => withKey(id, Item({ id }), [id])),
      );
      return {
        getState: () => ({ ids }),
        item: (lookup: { index: number }) => items.get(lookup),
        reverse: () => setIds((current) => current.toReversed()),
      };
    };
    const ListClient = resource(useListClient);
    let aui!: Record<string, any>;
    function Wrapper({ children }: { children: ReactNode }) {
      const client = useAui({
        list: ListClient(),
      } as unknown as useAui.Props);
      aui = client;
      return <AuiProvider value={client}>{children}</AuiProvider>;
    }

    const { container } = render(
      <RenderChildrenWithAccessor
        getItemState={(client: any) =>
          client.list.item({ index: 0 }).getState()
        }
      >
        {(getItem) => <div>{getItem().id}</div>}
      </RenderChildrenWithAccessor>,
      { wrapper: Wrapper },
    );
    expect(container.textContent).toBe("a");

    await act(async () => {
      flushTapSync(() => aui.list.reverse());
      await Promise.resolve();
    });

    expect(container.textContent).toBe("b");
  });
});
