// @vitest-environment jsdom

import { useEffect, useState, type ReactNode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { AuiIf } from "../AuiIf";

afterEach(() => {
  cleanup();
});

const useCounterClient = () => {
  const [count, setCount] = useState(0);
  return {
    getState: () => ({ count }),
    setCount: (value: number) => setCount(value),
  };
};
const CounterClient = resource(useCounterClient);

const setup = (children: ReactNode) => {
  let aui!: Record<string, any>;
  const Harness = ({ children }: { children: ReactNode }) => {
    const client = useAui({
      counter: CounterClient(),
    } as unknown as useAui.Props);
    aui = client;
    return <AuiProvider value={client}>{children}</AuiProvider>;
  };
  const view = render(<Harness>{children}</Harness>);
  return { view, getAui: () => aui };
};

describe("AuiIf", () => {
  it("mounts children when the condition is true and unmounts when false", () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const Probe = () => {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <div>visible</div>;
    };

    const { view, getAui } = setup(
      <AuiIf condition={(s: any) => s.counter.count > 0}>
        <Probe />
      </AuiIf>,
    );

    expect(view.container.textContent).toBe("");
    expect(mounted).not.toHaveBeenCalled();

    act(() => {
      flushTapSync(() => getAui().counter.setCount(1));
    });
    expect(view.container.textContent).toBe("visible");
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();

    act(() => {
      flushTapSync(() => getAui().counter.setCount(0));
    });
    expect(view.container.textContent).toBe("");
    expect(unmounted).toHaveBeenCalledTimes(1);
  });
});
