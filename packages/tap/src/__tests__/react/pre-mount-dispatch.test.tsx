// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { resource } from "../../core/resource";
import { useState as useResourceState } from "../../react-hooks/useState";
import { useResource, useTapRoot } from "../../index";
import { cleanupAllResources } from "../test-utils";

afterEach(() => {
  cleanupAllResources();
  cleanup();
});

// Reproduces the docs `/docs/tools/interactables` crash:
//   "Resource updated before mount" (tap/react-hooks/useReducer.ts).
//
// Shape of the real bug:
//   - An ancestor hosts a tap resource (via useAui -> useTapRoot, or
//     useClientResource -> useResource). The resource's fiber is committed
//     ("mounted") in a *passive effect* on that ancestor component.
//   - A descendant registers itself from its own mount effect, which
//     synchronously dispatches a state update on the hosted resource
//     (Interactables.register -> setState).
//   - React flushes passive effects child-first, so the descendant's register
//     effect runs BEFORE the ancestor's commit effect. The dispatch lands while
//     the fiber is still `isNeverMounted`, and tap's reducer guard throws.
//
// `useRegistry` stands in for the Interactables resource; `register` mirrors
// Interactables.register (a method that synchronously dispatches setState).

const useRegistry = () => {
  const [ids, setIds] = useResourceState<readonly string[]>([]);
  const register = (id: string) =>
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  return { ids, register };
};
const Registry = resource(useRegistry);

type RegistryApi = ReturnType<typeof useRegistry>;

// Records errors thrown during render or in a child's passive effect so a throw
// surfaces as an assertable value instead of an unhandled error.
class Boundary extends Component<
  { onError: (e: unknown) => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const collectErrors = (ui: ReactNode) => {
  const errors: unknown[] = [];
  try {
    render(<Boundary onError={(e) => errors.push(e)}>{ui}</Boundary>);
  } catch (e) {
    errors.push(e);
  }
  return errors.map((e) => (e instanceof Error ? e.message : String(e)));
};

describe("dispatch from a descendant effect before the host commits", () => {
  // --- Host A: useResource (mirrors store's useClientResource) ----------------
  describe("useResource host", () => {
    const Ctx = createContext<RegistryApi | null>(null);

    function Host({ children }: { children: ReactNode }) {
      const api = useResource(Registry());
      return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
    }

    function Consumer() {
      const api = useContext(Ctx)!;
      const apiRef = useRef(api);
      apiRef.current = api;
      // Mirrors useAssistantInteractable: register once per mount (its real
      // deps — the aui client etc. — are stable). Depending on `api` itself
      // would re-register on every registry render, which is a consumer bug
      // (useRegistry returns a fresh object each render).
      useEffect(() => {
        apiRef.current.register("taskBoard");
      }, []);
      return null;
    }

    it("a descendant can register without 'Resource updated before mount'", () => {
      const messages = collectErrors(
        <Host>
          <Consumer />
        </Host>,
      );
      expect(messages.join("\n")).not.toMatch(/Resource updated before mount/);
    });
  });

  // --- Host B: useTapRoot (exactly what useAui uses) --------------------------
  describe("useTapRoot host", () => {
    type Store = ReturnType<typeof useTapRoot<RegistryApi>>;
    const Ctx = createContext<Store | null>(null);

    let hostedStore: Store | null = null;

    function Host({ children }: { children: ReactNode }) {
      const store = useTapRoot(function RegistryRoot() {
        return useRegistry();
      });
      hostedStore = store;
      return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
    }

    function Consumer() {
      const store = useContext(Ctx)!;
      // useAui exposes client methods the consumer calls in its mount effect.
      useEffect(() => {
        store.getValue().register("taskBoard");
      }, [store]);
      return null;
    }

    it("a descendant can register without 'Resource updated before mount'", () => {
      const messages = collectErrors(
        <Host>
          <Consumer />
        </Host>,
      );
      expect(messages.join("\n")).not.toMatch(/Resource updated before mount/);
    });

    it("the registration is observable once dispatch is allowed", async () => {
      collectErrors(
        <Host>
          <Consumer />
        </Host>,
      );
      // The replayed dispatch goes through the root's macrotask scheduler
      // (MessageChannel), so yield a macrotask before observing.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(hostedStore?.getValue().ids).toContain("taskBoard");
    });
  });
});
