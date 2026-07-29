// @vitest-environment jsdom

import type { FC, ReactNode } from "react";
import { Component, useEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useClientLookup } from "../useClientLookup";
import { Derived } from "../Derived";

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

const ThreadProvider: FC<{ ids: string[]; children: ReactNode }> = ({
  ids,
  children,
}) => {
  const aui = useAui({ thread: Thread({ ids }) } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const MessageProvider: FC<{ index: number; children: ReactNode }> = ({
  index,
  children,
}) => {
  const aui = useAui({
    message: Derived({
      source: "thread",
      query: { index },
      get: (aui: any) => aui.thread().item({ index }),
    } as any),
  } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const probe: {
  aui: any;
  instance: any;
  text: string;
  bump: (() => void) | null;
} = { aui: null, instance: null, text: "", bump: null };

const Leaf: FC = () => {
  const aui = useAui() as any;
  probe.aui = aui;
  probe.instance = aui.message();
  probe.text = useAuiState((s: any) => s.message.text);
  return <p data-testid="leaf">{probe.text}</p>;
};

class LeafErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    if (this.state.error)
      return <p data-testid="leaf-error">{this.state.error.message}</p>;
    return this.props.children;
  }
}

const App: FC<{ index?: number; initialIds?: string[] }> = ({
  index = 0,
  initialIds = ["a", "b"],
}) => {
  const [ids, setIds] = useState(initialIds);
  harness.setIds = setIds;
  return (
    <ThreadProvider ids={ids}>
      <LeafErrorBoundary>
        <MessageProvider index={index}>
          <Leaf />
        </MessageProvider>
      </LeafErrorBoundary>
    </ThreadProvider>
  );
};

const harness: { setIds: ((ids: string[]) => void) | null } = { setIds: null };

beforeEach(() => {
  probe.aui = null;
  probe.instance = null;
  probe.text = "";
  probe.bump = null;
  harness.setIds = null;
});

afterEach(() => {
  cleanup();
});

describe("render-bound aui", () => {
  it("keeps aui and bound instance identity across value-only updates", () => {
    render(<App />);
    expect(probe.text).toBe("text-a");

    const prevAui = probe.aui;
    const prevInstance = probe.instance;

    act(() => flushTapSync(() => prevInstance.setText("updated")));

    expect(probe.text).toBe("updated");
    expect(probe.aui).toBe(prevAui);
    expect(probe.instance).toBe(prevInstance);
  });

  it("returns the same instance across repeated accessor calls", () => {
    render(<App />);
    expect(probe.aui.message()).toBe(probe.aui.message());
    expect(probe.aui.message()).toBe(probe.instance);
  });

  it("returns a new aui identity when the scope's instance is swapped", () => {
    render(<App />);
    expect(probe.text).toBe("text-a");

    const prevAui = probe.aui;
    const prevInstance = probe.instance;

    act(() => harness.setIds!(["b"]));

    expect(probe.text).toBe("text-b");
    expect(probe.aui).not.toBe(prevAui);
    // Object.is: vitest's failure formatter cannot inspect the client proxies
    expect(Object.is(probe.instance, prevInstance)).toBe(false);
    expect(probe.instance.getState().id).toBe("b");
  });

  it("keeps the bound instance on a stale leaf after a shrink, including sync re-renders", () => {
    const BumpingLeaf: FC = () => {
      const [, setTick] = useState(0);
      probe.bump = () => setTick((t) => t + 1);
      const aui = useAui() as any;
      probe.aui = aui;
      probe.instance = aui.message();
      probe.text = useAuiState((s: any) => s.message.text);
      useEffect(() => aui.subscribe(() => probe.bump?.()), [aui]);
      return <p data-testid="leaf">{probe.text}</p>;
    };

    const StaleApp: FC = () => {
      const [ids, setIds] = useState(["a", "b"]);
      harness.setIds = setIds;
      return (
        <ThreadProvider ids={ids}>
          <LeafErrorBoundary>
            <MessageProvider index={1}>
              <BumpingLeaf />
            </MessageProvider>
          </LeafErrorBoundary>
        </ThreadProvider>
      );
    };

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const view = render(<StaleApp />);
      expect(probe.text).toBe("text-b");
      const prevInstance = probe.instance;

      // The leaf stays mounted while its index no longer exists; the store
      // subscriber re-renders it inside the shrink window, and again after.
      act(() => harness.setIds!(["a"]));
      act(() => probe.bump!());

      expect(view.queryByTestId("leaf-error")).toBeNull();
      expect(probe.instance).toBe(prevInstance);
      expect(probe.text).toBe("text-b");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("recomposes the aui when a trailing scope is added or removed", () => {
    const useExtra = () => ({ getState: () => ({ tag: "extra" }) });
    const Extra = resource(useExtra);

    const ExtraProbe: FC = () => {
      probe.aui = useAui();
      return null;
    };

    const toggle: { set: ((on: boolean) => void) | null } = { set: null };
    const ToggleApp: FC = () => {
      const [withExtra, setWithExtra] = useState(false);
      toggle.set = setWithExtra;
      const aui = useAui(
        (withExtra
          ? { thread: Thread({ ids: ["a"] }), extra: Extra() }
          : { thread: Thread({ ids: ["a"] }) }) as unknown as useAui.Props,
      );
      return (
        <AuiProvider value={aui}>
          <ExtraProbe />
        </AuiProvider>
      );
    };

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      render(<ToggleApp />);
      expect(probe.aui.extra.source).toBe(null);
      const prevAui = probe.aui;

      act(() => toggle.set!(true));
      expect(probe.aui).not.toBe(prevAui);
      expect(probe.aui.extra.source).toBe("root");
      expect(probe.aui.extra().getState().tag).toBe("extra");

      act(() => toggle.set!(false));
      expect(probe.aui.extra.source).toBe(null);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("throws at bind time for an index that was never valid", () => {
    const view = render(<App index={5} />);

    expect(view.queryByTestId("leaf")).toBeNull();
    expect(view.getByTestId("leaf-error").textContent).toContain(
      "useClientLookup: index 5 out of bounds (length: 2)",
    );
  });
});
