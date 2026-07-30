// @vitest-environment jsdom

import type { FC, ReactNode } from "react";
import { createRef, useEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

afterEach(cleanup);

describe("AuiProvider config", () => {
  it("creates a working client from a root-scope config", () => {
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

  it("inherits the parent client when value is omitted", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider config={messageConfig(0)}>
          <Probe onRender={(c) => (aui = c)} />
        </AuiProvider>
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
    expect(aui.message.getState()).toEqual({ id: "a", text: "text-a" });
  });

  it("isolates from surrounding providers with value={null}", () => {
    let aui!: AnyClient;
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <AuiProvider value={null} config={{ counter: Counter() } as never}>
          <Probe onRender={(c) => (aui = c)} />
        </AuiProvider>
      </AuiProvider>,
    );

    expect(aui.counter.getState()).toEqual({ count: 0 });
    expect(() => aui.thread.getState()).toThrow(
      'The current scope does not have a "thread" property.',
    );
  });

  it("extends an explicit value client across React roots", () => {
    let portaled!: AnyClient;
    const Capture = () => {
      portaled = useAui();
      return null;
    };
    render(
      <AuiProvider config={threadConfig(["a"])}>
        <Capture />
      </AuiProvider>,
    );

    let aui!: AnyClient;
    render(
      <AuiProvider value={portaled as never} config={messageConfig(0)}>
        <Probe onRender={(c) => (aui = c)} />
      </AuiProvider>,
    );

    expect(aui.thread.getState()).toEqual({ count: 1 });
    expect(aui.message.getState()).toEqual({ id: "a", text: "text-a" });
  });

  it("exposes the created client through ref after mount", () => {
    const ref = createRef<AnyClient>();
    render(
      <AuiProvider config={threadConfig(["a"])} ref={ref as never}>
        {null}
      </AuiProvider>,
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current!.thread.getState()).toEqual({ count: 1 });
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
        <AuiProvider config={messageConfig(index)}>
          <Probe onRender={(c) => clients.push(c)} />
        </AuiProvider>
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
    const config = threadConfig(["a"]);
    expect(AuiConfig(config)).toBe(config);
  });
});
