import { describe, expect, it, vi } from "vitest";
import { createTapRoot } from "../core/createTapRoot";
import { flushTapSync } from "../core/scheduler";
import { useContextProvider } from "../core/context";
import { resource } from "../core/resource";
import { useResource } from "../hooks/useResource";
import * as shim from "./index";
import { c } from "./compiler-runtime";

describe("@assistant-ui/tap/standalone-shim behavior", () => {
  it("hosts stateful resource hooks under createTapRoot", () => {
    let cleanupCount = 0;
    const Counter = resource(function CounterResource() {
      const [count, setCount] = shim.useState(1);
      const value = shim.useMemo(() => count * 2, [count]);
      shim.useEffect(() => {
        return () => {
          cleanupCount++;
        };
      }, []);
      return { setCount, value };
    });
    const root = createTapRoot(function Root() {
      return useResource(Counter());
    });
    const listener = vi.fn();
    root.subscribe(listener);

    expect(root.getValue().value).toBe(2);

    flushTapSync(() => root.getValue().setCount(4));

    expect(root.getValue().value).toBe(8);
    expect(listener).toHaveBeenCalled();

    const cleanupCountBeforeUnmount = cleanupCount;
    root.unmount();
    expect(cleanupCount).toBe(cleanupCountBeforeUnmount + 1);
  });

  it("round-trips standalone contexts through a tap provider", () => {
    const context = shim.createContext("default");
    const root = createTapRoot(function Root() {
      return useContextProvider(context, "provided", () =>
        shim.useContext(context),
      );
    });

    expect(root.getValue()).toBe("provided");
    root.unmount();
  });

  it("throws outside a tap resource fiber", () => {
    expect(() => shim.useState(0)).toThrow("standalone-shim");
    expect(() => shim.default.useState(0)).toThrow("standalone-shim");
  });

  it("serves namespace-style default imports inside a resource", () => {
    const Ns = resource(function NsResource() {
      const [value] = shim.default.useState(7);
      return value;
    });
    const root = createTapRoot(function Root() {
      return useResource(Ns());
    });

    expect(root.getValue()).toBe(7);
    root.unmount();
  });

  it("provides compiler memo caches only inside a tap resource fiber", () => {
    const CacheResource = resource(function CacheResource() {
      return c(3);
    });
    const root = createTapRoot(function Root() {
      return useResource(CacheResource());
    });
    const cache = root.getValue();

    expect(cache).toHaveLength(3);
    expect(root.getValue()).toBe(cache);
    expect(() => c(1)).toThrow("standalone-shim");

    root.unmount();
  });
});
