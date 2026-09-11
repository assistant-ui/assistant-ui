import { describe, expect, it, vi } from "vitest";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createTapRoot } from "../core/createTapRoot";
import { flushTapSync } from "../core/scheduler";
import { useContextProvider } from "../core/context";
import { resource } from "../core/resource";
import { useResource } from "../hooks/useResource";

describe("standalone react alias", () => {
  it("runs resource hooks and context without React", () => {
    let cleanupCount = 0;
    const listener = vi.fn();
    const context = createContext("default");
    const Counter = resource(function CounterResource() {
      const [count, setCount] = useState(1);
      const value = useMemo(() => count * 2, [count]);
      useEffect(() => {
        return () => {
          cleanupCount++;
        };
      }, []);
      return { setCount, value };
    });
    const root = createTapRoot(function Root() {
      return useContextProvider(context, "provided", () => ({
        context: useContext(context),
        counter: useResource(Counter()),
      }));
    });
    root.subscribe(listener);

    expect(root.getValue().context).toBe("provided");
    expect(root.getValue().counter.value).toBe(2);

    flushTapSync(() => root.getValue().counter.setCount(4));

    expect(root.getValue().counter.value).toBe(8);
    expect(listener).toHaveBeenCalled();

    const cleanupCountBeforeUnmount = cleanupCount;
    root.unmount();

    expect(cleanupCount).toBe(cleanupCountBeforeUnmount + 1);
  });
});
