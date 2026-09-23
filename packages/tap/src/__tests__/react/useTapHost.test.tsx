import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { StrictMode, useEffect, useLayoutEffect } from "react";
import { useState as useTapState } from "../../react-hooks/useState";
import { useEffect as useTapEffect } from "../../react-hooks/useEffect";
import { useTapHost } from "../../index";

const countOf = (log: string[], entry: string) =>
  log.filter((e) => e === entry).length;

describe("useTapHost", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns the resource value and re-renders on dispatch", () => {
    let api!: { count: number; setCount: (n: number) => void };
    function App() {
      const { value } = useTapHost(function TapHost() {
        const [count, setCount] = useTapState(0);
        return { count, setCount };
      });
      api = value;
      return <div data-testid="count">{value.count}</div>;
    }

    render(<App />);
    expect(screen.getByTestId("count").textContent).toBe("0");
    act(() => api.setCount(3));
    expect(screen.getByTestId("count").textContent).toBe("3");
  });

  it("commits in the passive phase, before the effects of a consumer that mounts effects", () => {
    const log: string[] = [];
    function Child({ effects }: { effects: () => void }) {
      useEffect(effects);
      useLayoutEffect(() => {
        log.push("child layout");
      }, []);
      useEffect(() => {
        log.push("child effect");
      }, []);
      return null;
    }
    function App() {
      const { effects } = useTapHost(function TapHost() {
        useTapEffect(() => {
          log.push("tap effect");
        });
        return null;
      });
      useEffect(() => {
        log.push("host effect");
      }, []);
      return <Child effects={effects} />;
    }

    render(<App />);
    // "child layout" first proves the commit is passive (does not block
    // paint); "tap effect" before "child effect" proves the consumer's
    // instance won the commit over the host's own fallback instance.
    expect(log).toEqual([
      "child layout",
      "tap effect",
      "child effect",
      "host effect",
    ]);
  });

  it("falls back to the host's own instance when no consumer mounts effects", () => {
    const log: string[] = [];
    function Child() {
      useEffect(() => {
        log.push("child effect");
      }, []);
      return null;
    }
    function App() {
      useTapHost(function TapHost() {
        useTapEffect(() => {
          log.push("tap effect");
        });
        return null;
      });
      return <Child />;
    }

    render(<App />);
    expect(log).toEqual(["child effect", "tap effect"]);
  });

  it("commits exactly once per pass with multiple consumers", () => {
    const log: string[] = [];
    let api!: { bump: () => void };
    function Child({ effects }: { effects: () => void }) {
      useEffect(effects);
      return null;
    }
    function App() {
      const { value, effects } = useTapHost(function TapHost() {
        const [count, setCount] = useTapState(0);
        useTapEffect(() => {
          log.push("tap effect");
        });
        return { count, bump: () => setCount(count + 1) };
      });
      api = value;
      return (
        <>
          <Child effects={effects} />
          <Child effects={effects} />
        </>
      );
    }

    render(<App />);
    expect(countOf(log, "tap effect")).toBe(1);

    act(() => api.bump());
    expect(countOf(log, "tap effect")).toBe(2);
  });

  it("hands responsibility to the next instance when the winner unmounts", () => {
    const log: string[] = [];
    let api!: { count: number; bump: () => void };
    function Child({ name, effects }: { name: string; effects: () => void }) {
      useEffect(effects);
      useEffect(() => {
        log.push(`${name} effect`);
      });
      return null;
    }
    function App({ showA }: { showA: boolean }) {
      const { value, effects } = useTapHost(function TapHost() {
        const [count, setCount] = useTapState(0);
        useTapEffect(() => {
          log.push(`tap effect ${count}`);
          return () => {
            log.push("tap cleanup");
          };
        });
        return { count, bump: () => setCount(count + 1) };
      });
      api = value;
      return (
        <>
          {showA && <Child name="a" effects={effects} />}
          <Child name="b" effects={effects} />
        </>
      );
    }

    const { rerender } = render(<App showA={true} />);
    expect(log).toEqual(["tap effect 0", "a effect", "b effect"]);

    log.length = 0;
    rerender(<App showA={false} />);
    // The winner's unmount removes only its instance, not the resource: the
    // no-deps tap effect re-fires as a cleanup/setup pair, not a final
    // cleanup, and the commit still lands before b's own effect.
    expect(log).toEqual(["tap cleanup", "tap effect 0", "b effect"]);

    log.length = 0;
    act(() => api.bump());
    expect(api.count).toBe(1);
    // Next in line (b) now commits, still ahead of its own effects.
    expect(log).toEqual(["tap cleanup", "tap effect 1", "b effect"]);
  });

  it("unmounting the host cleans up exactly once", () => {
    // effects consumers must be descendants of the host component, so
    // they unmount with it and no flush can fire after the deletion.
    const log: string[] = [];
    function Child({ effects }: { effects: () => void }) {
      useEffect(effects);
      return null;
    }
    function HostComp() {
      const { effects } = useTapHost(function TapHost() {
        useTapEffect(() => {
          log.push("tap effect");
          return () => {
            log.push("tap cleanup");
          };
        }, []);
        return null;
      });
      return <Child effects={effects} />;
    }
    function App({ showHost }: { showHost: boolean }) {
      return showHost ? <HostComp /> : null;
    }

    const { rerender } = render(<App showHost={true} />);
    expect(log).toEqual(["tap effect"]);

    rerender(<App showHost={false} />);
    expect(log).toEqual(["tap effect", "tap cleanup"]);
  });

  it("remounts through a StrictMode effect cycle", () => {
    const log: string[] = [];
    let api!: { count: number; setCount: (n: number) => void };
    function App() {
      const { value } = useTapHost(function TapHost() {
        const [count, setCount] = useTapState(0);
        useTapEffect(() => {
          log.push("tap mount");
          return () => {
            log.push("tap unmount");
          };
        }, []);
        return { count, setCount };
      });
      api = value;
      return <div data-testid="count">{value.count}</div>;
    }

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    // setup, simulated unmount, setup: same as inlined hooks in StrictMode.
    expect(countOf(log, "tap mount")).toBe(2);
    expect(countOf(log, "tap unmount")).toBe(1);

    act(() => api.setCount(5));
    expect(screen.getByTestId("count").textContent).toBe("5");
    expect(countOf(log, "tap mount")).toBe(2);
    expect(countOf(log, "tap unmount")).toBe(1);
  });
});
