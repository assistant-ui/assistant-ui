import { describe, it, expect, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { Activity } from "react";
import { resource } from "../../core/resource";
import { useResource, useTapRoot, flushTapSync } from "../../index";
import { useState as useResourceState } from "../../react-hooks/useState";
import { useEffect as useResourceEffect } from "../../react-hooks/useEffect";

describe("resources under <Activity>", () => {
  afterEach(() => {
    cleanup();
  });

  it("re-runs effects with fresh state after an update while hidden", () => {
    const events: string[] = [];
    const useCounter = () => {
      const [count, setCount] = useResourceState(0);
      useResourceEffect(() => {
        events.push(`mount:${count}`);
        return () => events.push("unmount");
      }, [count]);
      return { count, setCount };
    };
    const Counter = resource(useCounter);

    let api: { count: number; setCount: (n: number) => void } | null = null;
    function Inner() {
      api = useResource(Counter());
      return null;
    }
    const inner = <Inner />;
    function App({ hidden }: { hidden: boolean }) {
      return <Activity mode={hidden ? "hidden" : "visible"}>{inner}</Activity>;
    }

    const { rerender } = render(<App hidden={false} />);
    expect(events).toEqual(["mount:0"]);

    rerender(<App hidden={true} />);
    expect(events).toEqual(["mount:0", "unmount"]);

    act(() => api!.setCount(5));

    rerender(<App hidden={false} />);
    expect(events).toEqual(["mount:0", "unmount", "mount:5"]);
    expect(api!.count).toBe(5);
  });

  it("reveals without re-rendering when nothing changed while hidden", () => {
    const events: string[] = [];
    let renders = 0;
    const useIdle = () => {
      renders++;
      useResourceEffect(() => {
        events.push("mount");
        return () => events.push("unmount");
      }, []);
      return null;
    };
    const Idle = resource(useIdle);

    function Inner() {
      return useResource(Idle());
    }
    const inner = <Inner />;
    function App({ hidden }: { hidden: boolean }) {
      return <Activity mode={hidden ? "hidden" : "visible"}>{inner}</Activity>;
    }

    const { rerender } = render(<App hidden={false} />);
    rerender(<App hidden={true} />);
    expect(events).toEqual(["mount", "unmount"]);

    const rendersBeforeReveal = renders;
    rerender(<App hidden={false} />);
    expect(events).toEqual(["mount", "unmount", "mount"]);
    expect(renders).toBe(rendersBeforeReveal);
  });

  it("useTapRoot keeps values updated while hidden across a reveal", () => {
    let handle: {
      getValue: () => { count: number; setCount: (n: number) => void };
    } | null = null;
    function Inner() {
      handle = useTapRoot(function CounterRoot() {
        const [count, setCount] = useResourceState(0);
        return { count, setCount };
      });
      return null;
    }
    const inner = <Inner />;
    function App({ hidden }: { hidden: boolean }) {
      return <Activity mode={hidden ? "hidden" : "visible"}>{inner}</Activity>;
    }

    const { rerender } = render(<App hidden={false} />);
    expect(handle!.getValue().count).toBe(0);

    rerender(<App hidden={true} />);
    act(() => flushTapSync(() => handle!.getValue().setCount(5)));
    expect(handle!.getValue().count).toBe(5);

    rerender(<App hidden={false} />);
    expect(handle!.getValue().count).toBe(5);
  });
});
