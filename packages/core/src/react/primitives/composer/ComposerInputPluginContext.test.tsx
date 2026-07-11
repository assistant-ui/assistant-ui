import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import {
  ComposerInputPluginProvider,
  type ComposerInputPlugin,
  type ComposerInputPluginRegistry,
} from "./ComposerInputPluginContext";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: <T,>(init: T) => ({ current: init }),
    useCallback: (fn: unknown) => fn,
    useMemo: (factory: () => unknown) => factory(),
  };
});

const createRegistry = (): ComposerInputPluginRegistry => {
  const element = ComposerInputPluginProvider({
    children: null,
  }) as ReactElement<{ value: ComposerInputPluginRegistry }>;
  return element.props.value;
};

const makePlugin = (): ComposerInputPlugin => ({
  handleKeyDown: () => false,
  setCursorPosition: () => {},
});

describe("plugin registration", () => {
  it("registers and unregisters plugins", () => {
    const registry = createRegistry();
    const plugin = makePlugin();

    const unregister = registry.register(plugin);
    expect(registry.getPlugins()).toEqual([plugin]);

    unregister();
    expect(registry.getPlugins()).toEqual([]);
  });

  it("orders plugins by priority descending, insertion order for ties", () => {
    const registry = createRegistry();
    const low = makePlugin();
    const high = makePlugin();
    const defaultA = makePlugin();
    const defaultB = makePlugin();

    registry.register(defaultA);
    registry.register(low, { priority: -1 });
    registry.register(high, { priority: 1 });
    registry.register(defaultB);

    expect(registry.getPlugins()).toEqual([high, defaultA, defaultB, low]);
  });

  it("keeps registries independent per provider instance", () => {
    const outer = createRegistry();
    const inner = createRegistry();
    const plugin = makePlugin();

    inner.register(plugin);

    expect(inner.getPlugins()).toEqual([plugin]);
    expect(outer.getPlugins()).toEqual([]);
  });
});

describe("active descendant channel", () => {
  const descriptor = {
    popoverId: "popover-1",
    highlightedItemId: "popover-1-option-a",
  };

  it("publishes a descriptor and notifies subscribers", () => {
    const registry = createRegistry();
    const listener = vi.fn();
    registry.subscribeActiveDescendant(listener);

    registry.setActiveDescendant("@", descriptor);

    expect(registry.getActiveDescendant()).toEqual(descriptor);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("clears the descriptor when the owning key releases it", () => {
    const registry = createRegistry();
    registry.setActiveDescendant("@", descriptor);

    registry.setActiveDescendant("@", null);

    expect(registry.getActiveDescendant()).toBeNull();
  });

  it("ignores a clear from a non-owning key", () => {
    const registry = createRegistry();
    const listener = vi.fn();
    registry.setActiveDescendant("@", descriptor);
    registry.subscribeActiveDescendant(listener);

    registry.setActiveDescendant("/", null);

    expect(registry.getActiveDescendant()).toEqual(descriptor);
    expect(listener).not.toHaveBeenCalled();
  });

  it("replaces the descriptor when a different key takes over", () => {
    const registry = createRegistry();
    registry.setActiveDescendant("@", descriptor);

    const next = { popoverId: "popover-2", highlightedItemId: undefined };
    registry.setActiveDescendant("welcome-suggestions", next);

    expect(registry.getActiveDescendant()).toEqual(next);

    registry.setActiveDescendant("@", null);
    expect(registry.getActiveDescendant()).toEqual(next);
  });

  it("skips notification when the owning key republishes an equal value", () => {
    const registry = createRegistry();
    const listener = vi.fn();
    registry.setActiveDescendant("@", descriptor);
    registry.subscribeActiveDescendant(listener);

    registry.setActiveDescendant("@", { ...descriptor });

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const registry = createRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribeActiveDescendant(listener);

    unsubscribe();
    registry.setActiveDescendant("@", descriptor);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("focus channel", () => {
  it("focuses the most recently registered input", () => {
    const registry = createRegistry();
    const first = vi.fn();
    const second = vi.fn();
    registry.registerInput({ focus: first });
    registry.registerInput({ focus: second });

    registry.requestFocus();

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("falls back to the remaining input after unregister", () => {
    const registry = createRegistry();
    const first = vi.fn();
    const second = vi.fn();
    registry.registerInput({ focus: first });
    const unregister = registry.registerInput({ focus: second });

    unregister();
    registry.requestFocus();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("is a no-op without a registered input", () => {
    const registry = createRegistry();
    expect(() => registry.requestFocus()).not.toThrow();
  });
});
