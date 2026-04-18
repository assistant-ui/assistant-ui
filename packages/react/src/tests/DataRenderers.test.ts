import { describe, it, expect } from "vitest";
import type {
  DataMessagePartComponent,
  DataRenderersState,
} from "@assistant-ui/core/react";

// The resource in DataRenderers.ts requires fiber infrastructure, so these
// tests replicate the reducer directly and exercise it in isolation.

type StateHarness = {
  state: DataRenderersState;
  setDataUI: (name: string, render: DataMessagePartComponent) => () => void;
  setFallbackDataUI: (render: DataMessagePartComponent) => () => void;
};

const createState = (): StateHarness => {
  let state: DataRenderersState = { renderers: {}, fallbacks: [] };

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
    state = { ...state, fallbacks: [...state.fallbacks, render] };
    return () => {
      state = {
        ...state,
        fallbacks: state.fallbacks.filter((r) => r !== render),
      };
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

describe("DataRenderers state logic", () => {
  describe("initial state", () => {
    it("should start with empty renderers and fallbacks", () => {
      const { state } = createState();
      expect(state.renderers).toEqual({});
      expect(state.fallbacks).toEqual([]);
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
  it("should register a fallback renderer", () => {
    const s = createState();
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback);

    expect(s.state.fallbacks).toHaveLength(1);
    expect(s.state.fallbacks[0]).toBe(Fallback);
  });

  it("should unregister the fallback renderer on cleanup", () => {
    const s = createState();
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    const unsub = s.setFallbackDataUI(Fallback);
    expect(s.state.fallbacks).toHaveLength(1);

    unsub();
    expect(s.state.fallbacks).toHaveLength(0);
  });

  it("should stack fallbacks; the first registered takes priority", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback1);
    s.setFallbackDataUI(Fallback2);

    expect(s.state.fallbacks).toEqual([Fallback1, Fallback2]);
  });

  it("should only unregister the specific fallback on cleanup", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    const unsub1 = s.setFallbackDataUI(Fallback1);
    s.setFallbackDataUI(Fallback2);

    unsub1();
    expect(s.state.fallbacks).toEqual([Fallback2]);
  });

  it("should restore the previous fallback when the active one unmounts", () => {
    const s = createState();
    const Fallback1 = (() => null) as unknown as DataMessagePartComponent;
    const Fallback2 = (() => null) as unknown as DataMessagePartComponent;

    s.setFallbackDataUI(Fallback1);
    const unsub2 = s.setFallbackDataUI(Fallback2);

    unsub2();
    expect(s.state.fallbacks).toEqual([Fallback1]);
  });

  it("should not affect named renderers when setting fallback", () => {
    const s = createState();
    const Named = (() => null) as unknown as DataMessagePartComponent;
    const Fallback = (() => null) as unknown as DataMessagePartComponent;

    s.setDataUI("chart", Named);
    s.setFallbackDataUI(Fallback);

    expect(s.state.renderers["chart"]).toHaveLength(1);
    expect(s.state.renderers["chart"]![0]).toBe(Named);
    expect(s.state.fallbacks[0]).toBe(Fallback);
  });
});

describe("Data part component resolution", () => {
  const resolveDataComponent = (
    partName: string,
    inlineConfig?: {
      by_name?: Record<string, DataMessagePartComponent | undefined>;
      Fallback?: DataMessagePartComponent;
    },
    globalRenderers?: Record<string, DataMessagePartComponent[]>,
    globalFallbacks?: DataMessagePartComponent[],
  ): DataMessagePartComponent | undefined => {
    const named = globalRenderers?.[partName]?.[0];
    if (named) return named;
    const inlineFallback =
      inlineConfig?.by_name?.[partName] ?? inlineConfig?.Fallback;
    return globalFallbacks?.[0] ?? inlineFallback;
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

  // --- Global fallback stack resolution ---

  it("should use global fallback when no name-specific renderer exists", () => {
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent("unknown-widget", undefined, {}, [
      GlobalFallback,
    ]);
    expect(result).toBe(GlobalFallback);
  });

  it("should prefer global name-match over global fallback", () => {
    const NamedComponent = (() => null) as unknown as DataMessagePartComponent;
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "chart",
      undefined,
      { chart: [NamedComponent] },
      [GlobalFallback],
    );
    expect(result).toBe(NamedComponent);
  });

  it("should prefer the first global fallback over inline Fallback", () => {
    const InlineFallback = (() => null) as unknown as DataMessagePartComponent;
    const GlobalFallback = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent(
      "unknown",
      { Fallback: InlineFallback },
      {},
      [GlobalFallback],
    );
    expect(result).toBe(GlobalFallback);
  });

  it("should pick the first registered when multiple fallbacks are stacked", () => {
    const First = (() => null) as unknown as DataMessagePartComponent;
    const Second = (() => null) as unknown as DataMessagePartComponent;

    const result = resolveDataComponent("anything", undefined, {}, [
      First,
      Second,
    ]);
    expect(result).toBe(First);
  });

  it("should return undefined when no fallbacks of any kind exist", () => {
    const result = resolveDataComponent("unknown", undefined, {}, []);
    expect(result).toBeUndefined();
  });
});
