import { describe, expect, it, vi } from "vitest";
import { createTapRoot } from "../core/createTapRoot";
import { flushTapSync } from "../core/scheduler";
import { useContextProvider } from "../core/context";
import { resource } from "../core/resource";
import { useResource } from "../hooks/useResource";
import * as shim from "./index";
import { c } from "./compiler-runtime";
import * as jsxRuntime from "./jsx-runtime";
import * as jsxDevRuntime from "./jsx-dev-runtime";

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

  it("rejects non-context values in useContext while use accepts thenables", () => {
    const promise = new Promise(() => {});
    const root = createTapRoot(function Root() {
      return {
        contextError: (() => {
          try {
            shim.useContext(promise);
            return null;
          } catch (error) {
            return error;
          }
        })(),
        useThrown: (() => {
          try {
            shim.use(promise);
            return null;
          } catch (error) {
            return error;
          }
        })(),
      };
    });

    expect(root.getValue().contextError).toBeInstanceOf(Error);
    expect(root.getValue().useThrown).toBe(promise);
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
  it("serves stable per-instance ids", () => {
    const Identified = resource(function IdentifiedResource() {
      return shim.useId();
    });
    const root = createTapRoot(function Root() {
      const first = useResource(Identified());
      const second = useResource(Identified());
      const [, rerender] = shim.useState(0);
      return { first, second, rerender };
    });
    root.subscribe(() => {});

    const initial = root.getValue();
    expect(initial.first).not.toBe(initial.second);

    flushTapSync(() => root.getValue().rerender((n: number) => n + 1));
    expect(root.getValue().first).toBe(initial.first);

    root.unmount();
  });

  it("assigns imperative handles and follows a replaced ref", () => {
    type Focusable = { focus(): string };
    type FocusRef = { current: Focusable | null };
    const Handle = resource(function HandleResource({
      ref,
    }: {
      ref: FocusRef;
    }) {
      const id = shim.useId();
      shim.useImperativeHandle(ref, () => ({ focus: () => id }), [id]);
      return id;
    });
    const firstRef: FocusRef = { current: null };
    const secondRef: FocusRef = { current: null };
    const root = createTapRoot(function Root() {
      const [ref, setRef] = shim.useState(firstRef);
      const id = useResource(Handle({ ref }));
      return { id, setRef };
    });
    root.subscribe(() => {});

    const id = root.getValue().id;
    expect(firstRef.current!.focus()).toBe(id);

    // The deps ([id]) are unchanged; the replaced ref alone re-assigns
    flushTapSync(() => root.getValue().setRef(secondRef));
    expect(firstRef.current).toBe(null);
    expect(secondRef.current!.focus()).toBe(id);

    root.unmount();
    expect(secondRef.current).toBe(null);
  });

  it("prefers a callback ref's disposer over a null call", () => {
    const seen: (string | null)[] = [];
    const callbackRef = (value: { focus(): string } | null) => {
      seen.push(value ? "attach" : null);
      return () => {
        seen.push("dispose");
      };
    };
    const Handle = resource(function HandleResource() {
      shim.useImperativeHandle(callbackRef, () => ({ focus: () => "x" }), null);
      return null;
    });
    const root = createTapRoot(function Root() {
      return useResource(Handle());
    });
    root.subscribe(() => {});
    root.unmount();

    // Null deps rerun the effect every render; the fallback path would push
    // null entries, so their absence proves the disposer was preferred.
    expect(seen[0]).toBe("attach");
    expect(seen.at(-1)).toBe("dispose");
    expect(seen).not.toContain(null);
  });

  it("keeps the module-scope JSX surface loadable but unrenderable", () => {
    expect(shim.Fragment).toBe(jsxRuntime.Fragment);
    expect(shim.Suspense).toBe(Symbol.for("react.suspense"));
    expect(shim.isValidElement({})).toBe(false);
    expect(shim.lazy(() => Promise.reject())).toMatchObject({
      $$typeof: Symbol.for("react.lazy"),
    });
    for (const call of [
      () => (shim.createElement as () => never)(),
      () => (shim.cloneElement as () => never)(),
      () => shim.Children.map(),
      () => (shim.useDeferredValue as () => never)(),
    ]) {
      expect(call).toThrowError(/requires real React/);
    }
  });

  it("keeps component factories loadable but their JSX unrenderable", () => {
    const render = () => null;
    expect(shim.forwardRef(render)).toEqual({
      $$typeof: Symbol.for("react.forward_ref"),
      render,
    });
    expect(shim.memo(render)).toEqual({
      $$typeof: Symbol.for("react.memo"),
      type: render,
      compare: null,
    });

    expect(jsxRuntime.Fragment).toBe(Symbol.for("react.fragment"));
    expect(jsxDevRuntime.Fragment).toBe(Symbol.for("react.fragment"));
    expect(() => jsxRuntime.jsx()).toThrow("standalone-shim");
    expect(() => jsxRuntime.jsxs()).toThrow("standalone-shim");
    expect(() => jsxDevRuntime.jsxDEV()).toThrow("standalone-shim");
  });
});
