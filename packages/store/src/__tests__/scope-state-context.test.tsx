// @vitest-environment jsdom

import { useState, type ReactNode } from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { AuiConfig } from "../AuiConfig";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientList } from "../useClientList";
import { attachTransformScopes } from "../attachTransformScopes";

const useItemClient = ({ key }: { key: string }) => {
  const [count, setCount] = useState(0);
  return {
    getState: () => ({ key, count }),
    increment: () => setCount((n) => n + 1),
  };
};
const ItemClient = resource(useItemClient);

const useCounterClient = () => {
  const [count, setCount] = useState(1);
  const items = useClientList({
    initialValues: [{ key: "a" }, { key: "b" }],
    getKey: (d) => d.key,
    resource: ItemClient,
  });
  return {
    getState: () => ({ count, items: items.state }),
    setCount: (value: number) => setCount(value),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const CounterClient = resource(useCounterClient);

const useStableStateClient = () => {
  const [, setTick] = useState(0);
  const [state] = useState(() => ({ value: "stable" }));
  return {
    getState: () => state,
    rerender: () => setTick((n) => n + 1),
  };
};
const StableStateClient = resource(useStableStateClient);

const Root = ({ children }: { children: ReactNode }) => {
  const config = AuiConfig({ counter: CounterClient() } as never);
  return <AuiProvider config={config}>{children}</AuiProvider>;
};

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
      source: "counter",
      query: { index },
      get: (aui: any) => aui.counter.item({ index }),
    } as never),
  } as never);
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};

describe("scope state contexts", () => {
  it("reads a root scope's state through its context and updates on change", () => {
    const { result } = renderHook(
      () => ({
        aui: useAui() as any,
        count: (useAuiState("counter" as never) as any).count,
        state: useAuiState("counter" as never) as any,
      }),
      { wrapper: Root },
    );

    expect(result.current.count).toBe(1);
    act(() => result.current.aui.counter.setCount(5));
    expect(result.current.count).toBe(5);
    expect(result.current.state.count).toBe(5);
  });

  it("does not re-render state readers when a client re-renders with the same state", () => {
    let renders = 0;
    const Reader = () => {
      renders++;
      return <>{(useAuiState("stable" as never) as any).value}</>;
    };
    const Wrapper = ({ children }: { children: ReactNode }) => {
      const config = AuiConfig({ stable: StableStateClient() } as never);
      return <AuiProvider config={config}>{children}</AuiProvider>;
    };
    const { result } = renderHook(() => useAui() as any, {
      wrapper: ({ children }) => (
        <Wrapper>
          <Reader />
          {children}
        </Wrapper>
      ),
    });
    const before = renders;
    act(() => result.current.stable.rerender());
    expect(renders).toBe(before);
    expect(screen.getByText("stable")).toBeTruthy();
  });

  it("throws for a scope no provider publishes", () => {
    expect(() =>
      renderHook(() => useAuiState("thread" as never), { wrapper: Root }),
    ).toThrow(/no AuiProvider above this component publishes the "thread"/);
  });

  it("publishes derived scopes and keeps them in sync with their source", () => {
    const Item = () => {
      const state = useAuiState("item" as never) as any;
      return <span data-testid="item">{`${state.key}:${state.count}`}</span>;
    };
    let aui!: any;
    const Capture = () => {
      aui = useAui();
      return null;
    };
    render(
      <Root>
        <Capture />
        <ItemProvider index={1}>
          <Item />
        </ItemProvider>
      </Root>,
    );

    expect(screen.getByTestId("item").textContent).toBe("b:0");
    act(() => aui.counter.item({ index: 1 }).increment());
    expect(screen.getByTestId("item").textContent).toBe("b:1");
    act(() => aui.counter.item({ index: 0 }).increment());
    expect(screen.getByTestId("item").textContent).toBe("b:1");
  });

  it("child providers only override the scopes they define", () => {
    const { result } = renderHook(
      () => (useAuiState("counter" as never) as any).count,
      {
        wrapper: ({ children }) => (
          <Root>
            <ItemProvider index={0}>{children}</ItemProvider>
          </Root>
        ),
      },
    );
    expect(result.current).toBe(1);
  });

  it("publishes scopes added by transform scopes", () => {
    const useSibling = () => ({ getState: () => ({ name: "sibling" }) });
    const Sibling = resource(useSibling);
    const useMain = () => ({ getState: () => ({ name: "main" }) });
    const Main = resource(useMain);
    attachTransformScopes(useMain, (scopes) => {
      (scopes as Record<string, unknown>).sibling ??= Sibling();
    });
    const { result } = renderHook(
      () => (useAuiState("sibling" as never) as any).name,
      {
        wrapper: ({ children }) => (
          <AuiProvider config={AuiConfig({ main: Main() } as never)}>
            {children}
          </AuiProvider>
        ),
      },
    );
    expect(result.current).toBe("sibling");
  });
});
