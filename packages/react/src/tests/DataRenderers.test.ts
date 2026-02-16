import { describe, it, expect } from "vitest";
import type { DataMessagePartComponent } from "../types/MessagePartComponentTypes";
import type { DataRenderersState } from "../types/scopes/dataRenderers";

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
    let state: DataRenderersState = { renderers: {} };

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

describe("Data part component resolution", () => {
  // Replicate the component lookup logic from MessageParts.tsx
  const resolveDataComponent = (
    partName: string,
    inlineConfig?: {
      by_name?: Record<string, DataMessagePartComponent | undefined>;
      Fallback?: DataMessagePartComponent;
    },
    globalRenderers?: Record<string, DataMessagePartComponent[]>,
  ): DataMessagePartComponent | undefined => {
    const inlineFallback =
      inlineConfig?.by_name?.[partName] ?? inlineConfig?.Fallback;
    const globalRenderer = globalRenderers?.[partName];

    // Global takes priority (first element), then inline fallback
    if (globalRenderer && globalRenderer.length > 0) {
      return globalRenderer[0] ?? inlineFallback;
    }
    return inlineFallback;
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
});
