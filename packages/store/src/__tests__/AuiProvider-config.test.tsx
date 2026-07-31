// @vitest-environment jsdom

import type { FC, ReactElement, ReactNode } from "react";
import { createRef, useEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { AuiConfig } from "../AuiConfig";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";
import { Derived } from "../Derived";

type AnyClient = Record<string, any>;

const useItem = ({ id }: { id: string }) => {
  const [text, setText] = useState(`text-${id}`);
  return {
    getState: () => ({ id, text }),
    setText: (t: string) => setText(t),
  };
};
const Item = resource(useItem);

const useThread = ({ ids }: { ids: string[] }) => {
  const items = useClientLookup(ids.map((id) => withKey(id, Item({ id }))));
  return {
    getState: () => ({ count: ids.length }),
    item: (lookup: { index: number }) => items.get(lookup),
  };
};
const Thread = resource(useThread);

const useCounter = () => {
  const [count, setCount] = useState(0);
  return {
    getState: () => ({ count }),
    setCount: (n: number) => setCount(n),
  };
};
const Counter = resource(useCounter);

const threadConfig = (ids: string[]) =>
  ({ thread: Thread({ ids }) }) as unknown as AuiConfig;

const messageConfig = (index: number) =>
  ({
    message: Derived({
      source: "thread",
      query: { index },
      get: (aui: AnyClient) => aui.thread.item({ index }),
    } as never),
  }) as unknown as AuiConfig;

const Probe: FC<{ onRender: (aui: AnyClient) => void }> = ({ onRender }) => {
  onRender(useAui());
  return null;
};

const Extend: FC<{ config: AuiConfig; children: ReactNode }> = ({
  config,
  children,
}) => {
  const aui = useAui();
  return (
    <AuiProvider extend={aui} config={config}>
      {children}
    </AuiProvider>
  );
};

const renderExpectingError = (ui: ReactElement) => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    return expect(() => render(ui));
  } finally {
    spy.mockRestore();
  }
};

afterEach(cleanup);

describe("AuiProvider config", () => {
  it("creates a working client from a top-level root config", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a", "b"])}>
        <Probe onRender={(c) => (aui = c)} />
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 2 });
  });

  it("mounts tap effects and propagates state updates to consumers", () => {
    let observed!: number;
    let api!: AnyClient;
    const Consumer = () => {
      api = useAui();
      observed = useAuiState((s: AnyClient) => s.counter.count);
      return null;
    };

    render(
      <AuiProvider config={{ counter: Counter() } as unknown as AuiConfig}>
        <Consumer />
      </AuiProvider>,
    );
    expect(observed).toBe(0);

    act(() => {
      flushTapSync(() => api.counter.setCount(5));
    });
    expect(observed).toBe(5);
  });

  it("runs the config client's effects ahead of children's effects", () => {
    const log: string[] = [];
    const useEffectClient = () => {
      useEffect(() => {
        log.push("tap effect");
      }, []);
      return { getState: () => ({}) };
    };
    const EffectClient = resource(useEffectClient);

    const Consumer = () => {
      useEffect(() => {
        log.push("consumer effect");
      }, []);
      return null;
    };

    render(
      <AuiProvider config={{ thread: EffectClient() } as unknown as AuiConfig}>
        <Consumer />
      </AuiProvider>,
    );

    expect(log).toEqual(["tap effect", "consumer effect"]);
  });

  it("extends the parent client with extend={useAui()}", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Extend config={messageConfig(0)}>
          <Probe onRender={(c) => (aui = c)} />
        </Extend>
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
    expect(aui.message.getState()).toEqual({ id: "a", text: "text-a" });
  });

  it("behaves as a root when extending the empty default client", () => {
    let aui!: AnyClient;
    render(
      <Extend config={threadConfig(["a"])}>
        <Probe onRender={(c) => (aui = c)} />
      </Extend>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
  });

  it("isolates from surrounding providers with extend={null}", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider
          extend={null}
          config={{ counter: Counter() } as unknown as AuiConfig}
        >
          <Probe onRender={(c) => (aui = c)} />
        </AuiProvider>
      </AuiProvider>,
    );

    expect(aui.counter.getState()).toEqual({ count: 0 });
    expect(() => aui.thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );
  });

  it("extends an explicit client across React roots", () => {
    let portaled!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Probe onRender={(c) => (portaled = c)} />
      </AuiProvider>,
    );

    let aui!: AnyClient;
    render(
      <AuiProvider extend={portaled as never} config={messageConfig(0)}>
        <Probe onRender={(c) => (aui = c)} />
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
    expect(aui.message.getState()).toEqual({ id: "a", text: "text-a" });
  });

  it("errors in dev when nested without an extend prop", () => {
    renderExpectingError(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider config={messageConfig(0)}>{null}</AuiProvider>
      </AuiProvider>,
    ).toThrow(
      "A parent AuiProvider exists — pass extend={useAui()} to inherit it or extend={null} to isolate.",
    );
  });

  it("does not error at the true top level", () => {
    expect(() =>
      render(<AuiProvider config={threadConfig(["a"])}>{null}</AuiProvider>),
    ).not.toThrow();
  });

  it("errors in dev when extend and value are both passed", () => {
    renderExpectingError(
      // @ts-expect-error extend and value are mutually exclusive
      <AuiProvider extend={null} value={null} config={threadConfig(["a"])}>
        {null}
      </AuiProvider>,
    ).toThrow("AuiProvider: pass either `extend` or `value`, not both.");
  });

  it("provides the extend client as-is when no config is passed", () => {
    let parent!: AnyClient;
    let inner!: AnyClient;
    const effects: string[] = [];
    const useEffectClient = () => {
      useEffect(() => {
        effects.push("tap effect");
      });
      return { getState: () => ({}) };
    };
    const EffectClient = resource(useEffectClient);

    const Portal: FC<{ children: ReactNode }> = ({ children }) => {
      parent = useAui();
      return <AuiProvider extend={parent as never}>{children}</AuiProvider>;
    };

    render(
      <AuiProvider config={{ thread: EffectClient() } as unknown as AuiConfig}>
        <Portal>
          <Probe onRender={(c) => (inner = c)} />
        </Portal>
      </AuiProvider>,
    );

    expect(inner).toBe(parent);
    // only the outer provider's effects host ran; the portal mounted none
    expect(effects).toEqual(["tap effect"]);
  });

  it("exposes the portaled client via ref on a config-less extend", () => {
    let parent!: AnyClient;
    const ref = createRef<AnyClient>();

    const Portal = () => {
      parent = useAui();
      return (
        <AuiProvider extend={parent as never} ref={ref as never}>
          {null}
        </AuiProvider>
      );
    };

    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Portal />
      </AuiProvider>,
    );

    expect(ref.current).toBe(parent);
  });

  it("creates a distinct fresh root for extend={null} with an empty config", () => {
    let parent!: AnyClient;
    let inner!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Probe onRender={(c) => (parent = c)} />
        <AuiProvider extend={null} config={AuiConfig({})}>
          <Probe onRender={(c) => (inner = c)} />
        </AuiProvider>
      </AuiProvider>,
    );

    expect(inner).not.toBe(parent);
    expect(() => inner.thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );
  });

  it("exposes the created client through ref on a root config", () => {
    const ref = createRef<AnyClient>();
    render(
      <AuiProvider config={threadConfig(["a"])} ref={ref as never}>
        {null}
      </AuiProvider>,
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current!.thread.getState()).toEqual({ count: 1 });
  });

  it("exposes the created client through ref on an extend usage", () => {
    const ref = createRef<AnyClient>();
    const WithRef = () => {
      const aui = useAui();
      return (
        <AuiProvider extend={aui} config={messageConfig(0)} ref={ref as never}>
          {null}
        </AuiProvider>
      );
    };

    render(
      <AuiProvider config={threadConfig(["a"])}>
        <WithRef />
      </AuiProvider>,
    );

    expect(ref.current!.message.getState()).toEqual({
      id: "a",
      text: "text-a",
    });
  });

  it("keeps client identity across renders with fresh config objects", () => {
    const clients: AnyClient[] = [];
    const Harness = ({ ids }: { ids: string[] }) => (
      <AuiProvider config={threadConfig(ids)}>
        <Probe onRender={(c) => clients.push(c)} />
      </AuiProvider>
    );

    const view = render(<Harness ids={["a"]} />);
    view.rerender(<Harness ids={["a"]} />);

    expect(clients.length).toBeGreaterThanOrEqual(2);
    expect(clients.at(-1)).toBe(clients[0]);
  });

  it("keeps identity for derived-only configs re-created per render", () => {
    const clients: AnyClient[] = [];
    const Harness = ({ index }: { index: number }) => (
      <AuiProvider config={threadConfig(["a", "b"])}>
        <Extend config={messageConfig(index)}>
          <Probe onRender={(c) => clients.push(c)} />
        </Extend>
      </AuiProvider>
    );

    const view = render(<Harness index={0} />);
    view.rerender(<Harness index={0} />);
    expect(clients.at(-1)).toBe(clients[0]);

    view.rerender(<Harness index={1} />);
    expect(clients.at(-1)).not.toBe(clients[0]);
    expect(clients.at(-1)!.message.getState()).toEqual({
      id: "b",
      text: "text-b",
    });
  });

  it("value={client} still provides the client as-is (deprecated)", () => {
    let portaled!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Probe onRender={(c) => (portaled = c)} />
      </AuiProvider>,
    );

    let aui!: AnyClient;
    render(
      <AuiProvider value={portaled as never}>
        <Probe onRender={(c) => (aui = c)} />
      </AuiProvider>,
    );

    expect(aui).toBe(portaled);
    expect(aui.thread.getState()).toEqual({ count: 1 });
  });

  it("value={null} still isolates (deprecated)", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider value={null}>
          <Probe onRender={(c) => (aui = c)} />
        </AuiProvider>
      </AuiProvider>,
    );

    expect(() => aui.thread.getState()).toThrow(
      "Wrap your component in an <AuiProvider> component.",
    );
  });

  it("the deprecated useAui overload still works with value providers", () => {
    let aui!: AnyClient;
    const Legacy = ({ children }: { children: ReactNode }) => {
      const client = useAui(threadConfig(["a"]));
      return <AuiProvider value={client}>{children}</AuiProvider>;
    };

    render(
      <Legacy>
        <Probe onRender={(c) => (aui = c)} />
      </Legacy>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
  });

  it("AuiConfig returns its input for hoisting", () => {
    const input = { thread: Thread({ ids: ["a"] }) } as never;
    expect(AuiConfig(input)).toBe(input);
  });
});
