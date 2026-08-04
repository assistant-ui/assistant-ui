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

type ItemMethods = {
  getState: () => { id: string; text: string };
  setText: (t: string) => void;
};

declare module "../types/client" {
  interface ScopeRegistry {
    thread: {
      methods: {
        getState: () => { count: number };
        item: (lookup: { index: number }) => ItemMethods;
      };
    };
    message: {
      methods: ItemMethods;
      meta: { source: "thread"; query: { index: number } };
    };
    counter: {
      methods: {
        getState: () => { count: number };
        setCount: (n: number) => void;
      };
    };
    effect: {
      methods: { getState: () => Record<string, never> };
    };
  }
}

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

const emptyConfig = AuiConfig({});

const threadConfig = (ids: string[]) => AuiConfig({ thread: Thread({ ids }) });

const messageConfig = (index: number) =>
  AuiConfig({
    message: Derived<"message">({
      source: "thread",
      query: { index },
      get: (aui) => aui.thread.item({ index }),
    }),
  });

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
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};

const renderExpectingError = (ui: ReactElement, message: string) => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() => render(ui)).toThrow(message);
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
      <AuiProvider config={AuiConfig({ counter: Counter() })}>
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
      <AuiProvider config={AuiConfig({ effect: EffectClient() })}>
        <Consumer />
      </AuiProvider>,
    );

    expect(log).toEqual(["tap effect", "consumer effect"]);
  });

  it("extends the parent client with extends={aui}", () => {
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

  it("isolates from surrounding providers with extends={null}", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider extends={null} config={AuiConfig({ counter: Counter() })}>
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
      <AuiProvider extends={portaled as never} config={messageConfig(0)}>
        <Probe onRender={(c) => (aui = c)} />
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
    expect(aui.message.getState()).toEqual({ id: "a", text: "text-a" });
  });

  it("errors in dev when nested without an extends prop", () => {
    renderExpectingError(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider config={messageConfig(0)}>{null}</AuiProvider>
      </AuiProvider>,
      "A parent AuiProvider exists — pass extends={aui} to inherit it or extends={null} to isolate.",
    );
  });

  it("does not error at the true top level", () => {
    expect(() =>
      render(<AuiProvider config={threadConfig(["a"])}>{null}</AuiProvider>),
    ).not.toThrow();
  });

  it("errors in dev when extends and value are both passed", () => {
    renderExpectingError(
      // @ts-expect-error extends and value are mutually exclusive
      <AuiProvider extends={null} value={null} config={threadConfig(["a"])}>
        {null}
      </AuiProvider>,
      "AuiProvider: pass either `extends` or `value`, not both.",
    );
  });

  it("errors in dev when extends is passed without a config", () => {
    renderExpectingError(
      // @ts-expect-error extends requires a config
      <AuiProvider extends={null}>{null}</AuiProvider>,
      "AuiProvider: `extends` requires a `config`.",
    );
  });

  it("errors in dev when extends is explicitly undefined", () => {
    renderExpectingError(
      // @ts-expect-error extends must be a client or null
      <AuiProvider extends={undefined} config={threadConfig(["a"])}>
        {null}
      </AuiProvider>,
      "AuiProvider: `extends` must be a client or null, not undefined.",
    );
  });

  it("errors in dev when value and config are both passed", () => {
    renderExpectingError(
      // @ts-expect-error value and config are mutually exclusive
      <AuiProvider value={null} config={threadConfig(["a"])}>
        {null}
      </AuiProvider>,
      "AuiProvider: pass either `value` or `config`, not both.",
    );
  });

  it("errors in dev when neither value nor config is passed", () => {
    renderExpectingError(
      // @ts-expect-error a config is required
      <AuiProvider>{null}</AuiProvider>,
      "AuiProvider: a `config` is required.",
    );
  });

  it("errors in dev when a derived-only config changes its scope set", () => {
    const Harness = ({ config }: { config: AuiConfig }) => (
      <AuiProvider config={threadConfig(["a"])}>
        <Extend config={config}>{null}</Extend>
      </AuiProvider>
    );

    const view = render(<Harness config={messageConfig(0)} />);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => view.rerender(<Harness config={emptyConfig} />)).toThrow(
        "A derived-only config mounted scopes [message] but now has []; " +
          "remount with a new key to change the scope set.",
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("creates a client extending the extends parent for an empty config", () => {
    let parent!: AnyClient;
    let inner!: AnyClient;

    const Portal: FC<{ children: ReactNode }> = ({ children }) => {
      parent = useAui();
      return (
        <AuiProvider extends={parent as never} config={emptyConfig}>
          {children}
        </AuiProvider>
      );
    };

    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Portal>
          <Probe onRender={(c) => (inner = c)} />
        </Portal>
      </AuiProvider>,
    );

    expect(inner).not.toBe(parent);
    expect(inner.thread.getState()).toEqual({ count: 1 });
  });

  it("exposes the created client via ref for an empty config", () => {
    const ref = createRef<AnyClient>();

    const Portal = () => {
      const aui = useAui();
      return (
        <AuiProvider extends={aui} config={emptyConfig} ref={ref as never}>
          {null}
        </AuiProvider>
      );
    };

    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Portal />
      </AuiProvider>,
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current!.thread.getState()).toEqual({ count: 1 });
  });

  it("keeps the subtree and its clients alive across empty -> non-empty -> empty config flips", () => {
    const clients: AnyClient[] = [];
    let mounts = 0;
    const MountSpy = () => {
      useEffect(() => {
        mounts++;
      }, []);
      return null;
    };

    const Harness = ({ config }: { config: AuiConfig }) => (
      <AuiProvider config={threadConfig(["a", "b"])}>
        <Extend config={config}>
          <Extend config={AuiConfig({ counter: Counter() })}>
            <MountSpy />
            <Probe onRender={(c) => clients.push(c)} />
          </Extend>
        </Extend>
      </AuiProvider>
    );

    const view = render(<Harness config={emptyConfig} />);
    act(() => {
      flushTapSync(() => clients.at(-1)!.counter.setCount(5));
    });
    expect(clients.at(-1)!.counter.getState()).toEqual({ count: 5 });

    view.rerender(<Harness config={messageConfig(1)} />);
    expect(clients.at(-1)!.message.getState()).toEqual({
      id: "b",
      text: "text-b",
    });
    expect(clients.at(-1)!.counter.getState()).toEqual({ count: 5 });

    view.rerender(<Harness config={emptyConfig} />);
    expect(clients.at(-1)!.counter.getState()).toEqual({ count: 5 });
    expect(mounts).toBe(1);
  });

  it("creates a distinct fresh root for extends={null} with an empty config", () => {
    let parent!: AnyClient;
    let inner!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Probe onRender={(c) => (parent = c)} />
        <AuiProvider extends={null} config={emptyConfig}>
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

  it("exposes the created client through ref on an extends usage", () => {
    const ref = createRef<AnyClient>();
    const WithRef = () => {
      const aui = useAui();
      return (
        <AuiProvider extends={aui} config={messageConfig(0)} ref={ref as never}>
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

  it("value={client} exposes a client extending it (deprecated)", () => {
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

    expect(aui).not.toBe(portaled);
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
      'The current scope does not have a "thread" property.',
    );
  });

  it("commits a deprecated useAui client's effects ahead of children's effects", () => {
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

    const Legacy = ({ children }: { children: ReactNode }) => {
      const client = useAui({ effect: EffectClient() });
      return <AuiProvider value={client}>{children}</AuiProvider>;
    };

    render(
      <Legacy>
        <Consumer />
      </Legacy>,
    );

    expect(log).toEqual(["tap effect", "consumer effect"]);
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
    const input = { thread: Thread({ ids: ["a"] }) } satisfies AuiConfig.Input;
    expect(AuiConfig(input)).toBe(input);
  });

  it("rejects raw object literals for the config prop at the type level", () => {
    // @ts-expect-error config must be built with AuiConfig(...)
    void (<AuiProvider config={{}}>{null}</AuiProvider>);
    void (<AuiProvider config={emptyConfig}>{null}</AuiProvider>);
  });
});
