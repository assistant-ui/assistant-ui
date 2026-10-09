// @vitest-environment jsdom

import type { FC, ReactNode } from "react";
import { useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";
import type { AssistantClient } from "../types/client";

type SignalItemMethods = {
  getState: () => { id: string; text: string };
  setText: (text: string) => void;
};

declare module "../types/client" {
  interface ScopeRegistry {
    signalList: {
      methods: {
        getState: () => { ids: readonly string[]; order: readonly string[] };
        item: (lookup: { index: number }) => SignalItemMethods;
        setIds: (ids: readonly string[]) => void;
        setOrder: (order: readonly string[]) => void;
      };
    };
    signalItem: {
      methods: SignalItemMethods;
      meta: { source: "signalList"; query: { index: number } };
    };
    signalCounter: {
      methods: {
        getState: () => { count: number };
        setCount: (count: number) => void;
      };
    };
    countMirror: {
      methods: { getState: () => { count: number } };
    };
    counterView: {
      methods: {
        getState: () => { tick: number; count: number };
        bump: () => void;
      };
    };
  }
}

const useSignalItem = ({ id }: { id: string }) => {
  const [text, setText] = useState(`text-${id}`);
  return {
    getState: () => ({ id, text }),
    setText: (next: string) => setText(next),
  };
};
const SignalItem = resource(useSignalItem);

// `order` maps an index to a key through the list's own state, the way a
// display order or a filter does, so resolving an index reads the list's
// render as well as the lookup
const useSignalList = () => {
  const [ids, setIds] = useState<readonly string[]>(["a", "b", "c"]);
  const [order, setOrder] = useState<readonly string[] | null>(null);
  const items = useClientLookup(
    ids.map((id) => withKey(id, SignalItem({ id }), [id])),
  );
  return {
    getState: () => ({ ids, order: order ?? ids }),
    item: (lookup: { index: number }) =>
      order ? items.get({ key: order[lookup.index]! }) : items.get(lookup),
    setIds: (next: readonly string[]) => setIds(next),
    setOrder: (next: readonly string[]) => setOrder(next),
  };
};
const SignalList = resource(useSignalList);

const useSignalCounter = () => {
  const [count, setCount] = useState(0);
  return {
    getState: () => ({ count }),
    setCount: (next: number) => setCount(next),
  };
};
const SignalCounter = resource(useSignalCounter);

const INDICES = [0, 1, 2];

const update = (fn: () => void) =>
  act(() => {
    flushTapSync(fn);
  });

const setup = (children?: ReactNode) => {
  const gets = INDICES.map(() => 0);
  const runs = INDICES.map(() => 0);
  let aui!: AssistantClient;

  const ItemAt: FC<{ index: number }> = ({ index }) => {
    const parent = useAui();
    return (
      <AuiProvider
        extends={parent}
        config={AuiConfig({
          signalItem: Derived<"signalItem">({
            source: "signalList",
            query: { index },
            get: (client) => {
              gets[index]! += 1;
              return client.signalList.item({ index });
            },
          }),
        })}
      >
        <ItemText index={index} />
      </AuiProvider>
    );
  };

  const ItemText: FC<{ index: number }> = ({ index }) => {
    const text = useAuiState((s) => {
      runs[index]! += 1;
      return s.signalItem.text;
    });
    return <span data-testid={`item-${index}`}>{text}</span>;
  };

  const Capture: FC = () => {
    aui = useAui();
    return null;
  };

  const Root: FC = () => {
    return (
      <AuiProvider
        config={AuiConfig({
          signalList: SignalList(),
          signalCounter: SignalCounter(),
        })}
      >
        <Capture />
        {INDICES.map((index) => (
          <ItemAt key={index} index={index} />
        ))}
        {children}
      </AuiProvider>
    );
  };

  render(<Root />);
  return {
    gets,
    runs,
    getAui: () => aui,
    setIds: (ids: readonly string[]) =>
      update(() => aui.signalList.setIds(ids)),
  };
};

afterEach(() => {
  cleanup();
});

describe("scoped store notifications", () => {
  it("wakes only the readers of the item that changed", () => {
    const { runs, getAui } = setup();
    const runsBefore = [...runs];

    update(() => getAui().signalList.item({ index: 1 }).setText("changed"));

    expect(screen.getByTestId("item-1").textContent).toBe("changed");
    expect(runs[1]).toBeGreaterThan(runsBefore[1]!);
    expect([runs[0], runs[2]]).toEqual([runsBefore[0], runsBefore[2]]);
  });

  it("wakes no item reader for another scope's update", () => {
    const { gets, runs, getAui } = setup();
    const getsBefore = [...gets];
    const runsBefore = [...runs];

    update(() => getAui().signalCounter.setCount(1));

    expect(runs).toEqual(runsBefore);
    expect(gets).toEqual(getsBefore);
  });

  it("re-resolves index scopes when the key order changes", () => {
    const { gets, setIds } = setup();
    const getsBefore = [...gets];

    setIds(["c", "a", "b"]);

    expect(
      INDICES.map((index) => screen.getByTestId(`item-${index}`).textContent),
    ).toEqual(["text-c", "text-a", "text-b"]);
    expect(gets[0]).toBeGreaterThan(getsBefore[0]!);
  });

  it("re-resolves index scopes when the list remaps an index through its own state", () => {
    const { getAui } = setup();

    update(() => getAui().signalList.setOrder(["b", "c", "a"]));

    expect(
      INDICES.map((index) => screen.getByTestId(`item-${index}`).textContent),
    ).toEqual(["text-b", "text-c", "text-a"]);
  });

  it("follows a selector that moves to another scope", () => {
    let switchedRuns = 0;
    const Switched: FC<{ readCounter: boolean }> = ({ readCounter }) => {
      const value = useAuiState((s) => {
        switchedRuns += 1;
        return readCounter ? s.signalCounter.count : s.signalList.ids.length;
      });
      return <span data-testid="switched">{value}</span>;
    };
    let setReadCounter!: (readCounter: boolean) => void;
    const Toggle: FC = () => {
      const [readCounter, set] = useState(false);
      setReadCounter = set;
      return <Switched readCounter={readCounter} />;
    };
    const { getAui, setIds } = setup(<Toggle />);

    act(() => setReadCounter(true));
    const afterSwitch = switchedRuns;
    setIds(["a", "b", "c", "d"]);
    expect(switchedRuns).toBe(afterSwitch);

    update(() => getAui().signalCounter.setCount(3));
    expect(screen.getByTestId("switched").textContent).toBe("3");
  });

  it("keeps a selector that reads nothing through the store on every notification", () => {
    let external = 0;
    let externalRuns = 0;
    const External: FC = () => {
      const value = useAuiState(() => {
        externalRuns += 1;
        return external;
      });
      return <span data-testid="external">{value}</span>;
    };
    const { getAui } = setup(<External />);

    external = 7;
    const before = externalRuns;
    update(() => getAui().signalCounter.setCount(1));

    expect(externalRuns).toBeGreaterThan(before);
    expect(screen.getByTestId("external").textContent).toBe("7");
  });

  it("keeps a tap-hosted reader on its host's notification", () => {
    const useCountMirror = () => {
      const count = useAuiState((s) => s.signalCounter.count);
      return { getState: () => ({ count }) };
    };
    const CountMirror = resource(useCountMirror);
    let child!: AssistantClient;
    const Child: FC = () => {
      child = useAui({ countMirror: CountMirror() });
      return null;
    };
    const { getAui } = setup(<Child />);

    update(() => getAui().signalCounter.setCount(2));

    expect(child.countMirror.getState().count).toBe(2);
  });

  it("keeps every reader of a cached scope on the clients its state read", () => {
    const useCounterView = ({ parent }: { parent: AssistantClient }) => {
      const [tick, setTick] = useState(0);
      return {
        getState: () => ({
          tick,
          count: parent.signalCounter.getState().count,
        }),
        bump: () => setTick((value) => value + 1),
      };
    };
    const CounterView = resource(useCounterView);
    const Reader: FC<{ id: string }> = ({ id }) => {
      const count = useAuiState((s) => s.counterView.count);
      return <span data-testid={id}>{count}</span>;
    };
    let view!: AssistantClient;
    const CaptureView: FC = () => {
      view = useAui();
      return null;
    };
    const ViewHost: FC = () => {
      const parent = useAui();
      return (
        <AuiProvider
          extends={parent}
          config={AuiConfig({ counterView: CounterView({ parent }) })}
        >
          <CaptureView />
          <Reader id="first" />
          <Reader id="second" />
        </AuiProvider>
      );
    };
    const { getAui } = setup(<ViewHost />);

    update(() => view.counterView.bump());
    update(() => getAui().signalCounter.setCount(5));

    expect(screen.getByTestId("first").textContent).toBe("5");
    expect(screen.getByTestId("second").textContent).toBe("5");
  });
});
