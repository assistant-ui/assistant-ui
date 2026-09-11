import { describe, it, expect, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { Activity, memo } from "react";
import { resource } from "../../core/resource";
import {
  useResource,
  useResources,
  useTapRoot,
  flushTapSync,
  withKey,
} from "../../index";
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

  it("useResources children re-run effects with fresh state after an update while hidden", () => {
    const events: string[] = [];
    const useCounter = (key: string) => {
      const [count, setCount] = useResourceState(0);
      useResourceEffect(() => {
        events.push(`mount:${key}:${count}`);
        return () => events.push(`unmount:${key}`);
      }, [key, count]);
      return { count, setCount };
    };
    const Counter = resource(useCounter);

    let apis: { count: number; setCount: (n: number) => void }[] = [];
    function Inner() {
      apis = useResources([
        withKey("a", Counter("a")),
        withKey("b", Counter("b")),
      ]);
      return null;
    }
    const inner = <Inner />;
    function App({ hidden }: { hidden: boolean }) {
      return <Activity mode={hidden ? "hidden" : "visible"}>{inner}</Activity>;
    }

    const { rerender } = render(<App hidden={false} />);
    expect(events).toEqual(["mount:a:0", "mount:b:0"]);

    rerender(<App hidden={true} />);
    expect(events).toEqual([
      "mount:a:0",
      "mount:b:0",
      "unmount:a",
      "unmount:b",
    ]);

    act(() => apis[1]!.setCount(5));

    events.length = 0;
    rerender(<App hidden={false} />);
    expect(events).toEqual(["mount:a:0", "mount:b:5"]);
    expect(apis[1]!.count).toBe(5);
  });

  it("useResources survives a reveal after a hook swap", () => {
    const events: string[] = [];
    const useFirst = () => {
      useResourceEffect(() => {
        events.push("mount:first");
        return () => events.push("unmount:first");
      }, []);
      return "first";
    };
    const useSecond = () => {
      useResourceEffect(() => {
        events.push("mount:second");
        return () => events.push("unmount:second");
      }, []);
      return "second";
    };
    const First = resource(useFirst);
    const Second = resource(useSecond);

    const Inner = memo(function Inner({ swapped }: { swapped: boolean }) {
      const [value] = useResources([
        withKey("x", swapped ? Second() : First()),
      ]);
      return <>{value}</>;
    });
    function App({ hidden, swapped }: { hidden: boolean; swapped: boolean }) {
      return (
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Inner swapped={swapped} />
        </Activity>
      );
    }

    const { rerender } = render(<App hidden={false} swapped={false} />);
    rerender(<App hidden={false} swapped={true} />);
    expect(events).toEqual(["mount:first", "unmount:first", "mount:second"]);

    rerender(<App hidden={true} swapped={true} />);
    expect(events).toEqual([
      "mount:first",
      "unmount:first",
      "mount:second",
      "unmount:second",
    ]);

    events.length = 0;
    rerender(<App hidden={false} swapped={true} />);
    expect(events).toEqual(["mount:second"]);
  });

  it("useResources swaps hooks while hidden and mounts the replacement on reveal", () => {
    const events: string[] = [];
    const useFirst = () => {
      useResourceEffect(() => {
        events.push("mount:first");
        return () => events.push("unmount:first");
      }, []);
      return "first";
    };
    const useSecond = () => {
      useResourceEffect(() => {
        events.push("mount:second");
        return () => events.push("unmount:second");
      }, []);
      return "second";
    };
    const First = resource(useFirst);
    const Second = resource(useSecond);

    const Inner = memo(function Inner({ swapped }: { swapped: boolean }) {
      const [value] = useResources([
        withKey("x", swapped ? Second() : First()),
      ]);
      return <>{value}</>;
    });
    function App({ hidden, swapped }: { hidden: boolean; swapped: boolean }) {
      return (
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Inner swapped={swapped} />
        </Activity>
      );
    }

    const { rerender } = render(<App hidden={false} swapped={false} />);
    rerender(<App hidden={true} swapped={false} />);
    expect(events).toEqual(["mount:first", "unmount:first"]);

    rerender(<App hidden={true} swapped={true} />);
    expect(events).toEqual(["mount:first", "unmount:first"]);

    events.length = 0;
    rerender(<App hidden={false} swapped={true} />);
    expect(events).toEqual(["mount:second"]);
  });

  it("useTapRoot does not replay a hidden re-render's record over a later tap update", () => {
    const events: string[] = [];
    let handle: {
      getValue: () => {
        label: string;
        count: number;
        setCount: (n: number) => void;
      };
    } | null = null;
    const Inner = memo(function Inner({ label }: { label: string }) {
      handle = useTapRoot(function CounterRoot() {
        const [count, setCount] = useResourceState(0);
        useResourceEffect(() => {
          events.push(`mount:${label}:${count}`);
          return () => events.push("unmount");
        }, [label, count]);
        return { label, count, setCount };
      });
      return null;
    });
    function App({ hidden, label }: { hidden: boolean; label: string }) {
      return (
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Inner label={label} />
        </Activity>
      );
    }

    const { rerender } = render(<App hidden={false} label="a" />);
    rerender(<App hidden={true} label="a" />);
    rerender(<App hidden={true} label="b" />);

    act(() => flushTapSync(() => handle!.getValue().setCount(5)));
    expect(handle!.getValue().count).toBe(5);

    events.length = 0;
    rerender(<App hidden={false} label="b" />);
    expect(handle!.getValue().count).toBe(5);
    expect(handle!.getValue().label).toBe("b");
    expect(events).toEqual(["mount:b:5"]);
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
