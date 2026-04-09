import { describe, it, expect } from "vitest";
import type { DataMessagePartComponent, DataRenderersState } from "../types";
import * as PackageExports from "../index";

/**
 * Tests for the DataRenderers state management logic.
 *
 * Since the DataRenderers resource relies on @assistant-ui/tap's resource system
 * (which requires fiber infrastructure), we test the core state logic directly.
 */
describe("DataRenderers state logic", () => {
  // Replicate the state management logic from DataRenderers.ts
  const createState = (): {
    state: DataRenderersState;
    setDataUI: (name: string, render: DataMessagePartComponent) => () => void;
  } => {
    let state: DataRenderersState = { renderers: {}, fallback: undefined };

    const setDataUI = (name: string, render: DataMessagePartComponent) => {
      state = {
        ...state,
        renderers: {
          ...state.renderers,
          [name]: [...(state.renderers[name] ?? []), render],
        },
      };

      return () => {
        state = {
          ...state,
          renderers: {
            ...state.renderers,
            [name]: state.renderers[name]?.filter((r) => r !== render) ?? [],
          },
        };
      };
    };

    return {
      get state() {
        return state;
      },
      setDataUI,
    };
  };

  describe("initial state", () => {
    it("should start with empty renderers", () => {
      const { state } = createState();
      expect(state.renderers).toEqual({});
    });
  });

  describe("setDataUI", () => {
    it("should register a data renderer", () => {
      const s = createState();
      const Component = (() => null) as unknown as DataMessagePartComponent;

      s.setDataUI("my-event", Component);

      expect(s.state.renderers["my-event"]).toHaveLength(1);
      expect(s.state.renderers["my-event"]![0]).toBe(Component);
    });

    it("should register multiple renderers for the same name", () => {
      const s = createState();
      const Component1 = (() => null) as unknown as DataMessagePartComponent;
      const Component2 = (() => null) as unknown as DataMessagePartComponent;

      s.setDataUI("my-event", Component1);
      s.setDataUI("my-event", Component2);

      expect(s.state.renderers["my-event"]).toHaveLength(2);
      expect(s.state.renderers["my-event"]![0]).toBe(Component1);
      expect(s.state.renderers["my-event"]![1]).toBe(Component2);
    });

    it("should register renderers for different names independently", () => {
      const s = createState();
      const Component1 = (() => null) as unknown as DataMessagePartComponent;
      const Component2 = (() => null) as unknown as DataMessagePartComponent;

      s.setDataUI("event-a", Component1);
      s.setDataUI("event-b", Component2);

      expect(s.state.renderers["event-a"]).toHaveLength(1);
      expect(s.state.renderers["event-b"]).toHaveLength(1);
      expect(s.state.renderers["event-a"]![0]).toBe(Component1);
      expect(s.state.renderers["event-b"]![0]).toBe(Component2);
    });

    it("should unregister a renderer when cleanup is called", () => {
      const s = createState();
      const Component = (() => null) as unknown as DataMessagePartComponent;

      const unsubscribe = s.setDataUI("my-event", Component);
      expect(s.state.renderers["my-event"]).toHaveLength(1);

      unsubscribe();
      expect(s.state.renderers["my-event"]).toHaveLength(0);
    });

    it("should only unregister the specific renderer on cleanup", () => {
      const s = createState();
      const Component1 = (() => null) as unknown as DataMessagePartComponent;
      const Component2 = (() => null) as unknown as DataMessagePartComponent;

      const unsub1 = s.setDataUI("my-event", Component1);
      s.setDataUI("my-event", Component2);

      unsub1();

      expect(s.state.renderers["my-event"]).toHaveLength(1);
      expect(s.state.renderers["my-event"]![0]).toBe(Component2);
    });

    it("should not affect other names when unregistering", () => {
      const s = createState();
      const Component1 = (() => null) as unknown as DataMessagePartComponent;
      const Component2 = (() => null) as unknown as DataMessagePartComponent;

      const unsub1 = s.setDataUI("event-a", Component1);
      s.setDataUI("event-b", Component2);

      unsub1();

      expect(s.state.renderers["event-a"]).toHaveLength(0);
      expect(s.state.renderers["event-b"]).toHaveLength(1);
    });
  });
});

describe("DataRenderers fallback state logic", () => {
  const createState = (): {
    state: DataRenderersState;
    setDataUI: (name: string, render: DataMessagePartComponent) => () => void;
    setFallbackDataUI: (render: DataMessagePartComponent) => () => void;
  } => {
    let state: DataRenderersState = { renderers: {}, fallback: undefined };

    const setDataUI = (name: string, render: DataMessagePartComponent) => {
      state = {
        ...state,
        renderers: {
          ...state.renderers,
          [name]: [...(state.renderers[name] ?? []), render],
        },
      };

      return () => {
        state = {
          ...state,
          renderers: {
            ...state.renderers,
            [name]: state.renderers[name]?.filter((r) => r !== render) ?? [],
          },
        };
      };
    };

    const setFallbackDataUI = (render: DataMessagePartComponent) => {
      state = { ...state, fallback: render };
      return () => {
        if (state.fallback === render) {
          state = { ...state, fallback: undefined };
        }
      };
    };

    return {
      get state() {
        return state;
      },
      setDataUI,
      setFallbackDataUI,
    };
  };

  it("should start with undefined fallback", () => {
    const { state } = createState();
    expect(state.fallback).toBeUndefined();
  });

  it("should register a fallback renderer", () => {
    const s = createState();
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback);

    expect(s.state.fallback).toBe(Fallback);
  });

  it("should unregister the fallback renderer on cleanup", () => {
    const s = createState();
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    const unsub = s.setFallbackDataUI(Fallback);
    expect(s.state.fallback).toBe(Fallback);

    unsub();
    expect(s.state.fallback).toBeUndefined();
  });

  it("should replace the fallback when a new one is registered", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback1);
    s.setFallbackDataUI(Fallback2);

    expect(s.state.fallback).toBe(Fallback2);
  });

  it("should not clear a newer fallback when an older cleanup is called", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    const unsub1 = s.setFallbackDataUI(Fallback1);
    s.setFallbackDataUI(Fallback2);

    unsub1();
    expect(s.state.fallback).toBe(Fallback2);
  });

  it("should clear fallback when the active registration unmounts (single-slot)", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback1);
    const unsub2 = s.setFallbackDataUI(Fallback2);

    unsub2();
    expect(s.state.fallback).toBeUndefined();
  });

  it("should not affect named renderers when setting fallback", () => {
    const s = createState();
    const Named = (() => null) as unknown as DataMessagePartComponent;
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    s.setDataUI("chart", Named);
    s.setFallbackDataUI(Fallback);

    expect(s.state.renderers["chart"]).toHaveLength(1);
    expect(s.state.renderers["chart"]![0]).toBe(Named);
    expect(s.state.fallback).toBe(Fallback);
  });
});

describe("Data part component resolution", () => {
  // Replicate the component lookup logic from MessageParts.tsx
  // Updated to include store-level fallback in the resolution chain
  const resolveDataComponent = (
    partName: string,
    inlineConfig?: {
      by_name?: Record<string, DataMessagePartComponent | undefined>;
      Fallback?: DataMessagePartComponent;
    },
    globalRenderers?: Record<string, DataMessagePartComponent[]>,
    globalFallback?: DataMessagePartComponent,
  ): DataMessagePartComponent | undefined => {
    const inlineFallback =
      inlineConfig?.by_name?.[partName] ?? inlineConfig?.Fallback;
    const globalRenderer = globalRenderers?.[partName];

    // Priority: global name-match > global fallback > inline config
    if (globalRenderer && globalRenderer.length > 0) {
      return globalRenderer[0] ?? globalFallback ?? inlineFallback;
    }
    return globalFallback ?? inlineFallback;
  };

  it("should return undefined when no config provided", () => {
    expect(resolveDataComponent("my-event")).toBeUndefined();
  });

  it("should return undefined when config has no matching name and no fallback", () => {
    expect(resolveDataComponent("my-event", { by_name: {} })).toBeUndefined();
  });

  it("should resolve by_name component", () => {
    const Component = (() => null) as unknown as DataMessagePartComponent;
    const result = resolveDataComponent("my-event", {
      by_name: { "my-event": Component },
    });
    expect(result).toBe(Component);
  });

  it("should fall back to Fallback when name not in by_name", () => {
    const Fallback = (() => null) as unknown as DataMessagePartComponent;
    const result = resolveDataComponent("unknown-event", {
      by_name: {},
      Fallback,
    });
    expect(result).toBe(Fallback);
  });

  it("should prefer by_name over Fallback", () => {
    const SpecificComponent = (() =>
      null) as unknown as DataMessagePartComponent;
    const Fallback = (() => null) as unknown as DataMessagePartComponent;
    const result = resolveDataComponent("my-event", {
      by_name: { "my-event": SpecificComponent },
      Fallback,
    });
    expect(result).toBe(SpecificComponent);
  });

  it("should prefer global registration over inline config", () => {
    const InlineComponent = (() => null) as unknown as DataMessagePartComponent;
    const GlobalComponent = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "my-event",
      { by_name: { "my-event": InlineComponent } },
      { "my-event": [GlobalComponent] },
    );
    expect(result).toBe(GlobalComponent);
  });

  it("should fall back to inline when global has no match", () => {
    const InlineComponent = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "my-event",
      { by_name: { "my-event": InlineComponent } },
      {},
    );
    expect(result).toBe(InlineComponent);
  });

  it("should fall back to inline Fallback when global has empty array", () => {
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "my-event",
      { Fallback },
      { "my-event": [] },
    );
    expect(result).toBe(Fallback);
  });

  // --- Fallback data renderer resolution tests ---

  it("should use global fallback when no name-specific renderer exists", () => {
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "unknown-widget",
      undefined,
      {},
      GlobalFallback,
    );
    expect(result).toBe(GlobalFallback);
  });

  it("should prefer global name-match over global fallback", () => {
    const NamedComponent = (() => null) as unknown as DataMessagePartComponent;
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "chart",
      undefined,
      { chart: [NamedComponent] },
      GlobalFallback,
    );
    expect(result).toBe(NamedComponent);
  });

  it("should prefer global fallback over inline config", () => {
    const InlineComponent = (() => null) as unknown as DataMessagePartComponent;
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "my-event",
      { by_name: { "my-event": InlineComponent } },
      {},
      GlobalFallback,
    );
    expect(result).toBe(GlobalFallback);
  });

  it("should prefer global fallback over inline Fallback", () => {
    const InlineFallback = (() => null) as unknown as DataMessagePartComponent;
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "unknown",
      { Fallback: InlineFallback },
      {},
      GlobalFallback,
    );
    expect(result).toBe(GlobalFallback);
  });

  it("should return undefined when no fallbacks of any kind exist", () => {
    const result = resolveDataComponent("unknown", undefined, {}, undefined);
    expect(result).toBeUndefined();
  });
});

describe("Fallback DataUI public API", () => {
  it("should export makeAssistantFallbackDataUI", () => {
    expect(
      (PackageExports as Record<string, unknown>).makeAssistantFallbackDataUI,
    ).toBeDefined();
    expect(
      typeof (PackageExports as Record<string, unknown>)
        .makeAssistantFallbackDataUI,
    ).toBe("function");
  });

  it("should export useAssistantFallbackDataUI", () => {
    expect(
      (PackageExports as Record<string, unknown>).useAssistantFallbackDataUI,
    ).toBeDefined();
    expect(
      typeof (PackageExports as Record<string, unknown>)
        .useAssistantFallbackDataUI,
    ).toBe("function");
  });
});
