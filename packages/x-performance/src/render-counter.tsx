import {
  createElement,
  Profiler,
  type ComponentType,
  type ProfilerOnRenderCallback,
  type ReactNode,
} from "react";

export type RenderCounter = {
  /**
   * Wraps a component so every render initiated at or above it increments the
   * counter for `id`. A re-render caused by state owned inside the wrapped
   * component does not pass through the wrapper; use `useRender` for that.
   * Render-phase counting; use outside StrictMode for exact numbers.
   */
  track: <P extends object>(
    id: string,
    component: ComponentType<P>,
  ) => ComponentType<P>;
  /**
   * Call inside a component body to count every render of that component,
   * including re-renders from its own state.
   */
  useRender: (id: string) => void;
  /**
   * Wraps a subtree in a React Profiler; every commit that includes the
   * subtree increments the counter for `id`.
   */
  wrapCommits: (id: string, node: ReactNode) => ReactNode;
  renders: (id: string) => number;
  commits: (id: string) => number;
  reset: () => void;
  snapshot: () => Record<string, number>;
};

export const createRenderCounter = (): RenderCounter => {
  const renderCounts = new Map<string, number>();
  const commitCounts = new Map<string, number>();

  const bump = (map: Map<string, number>, id: string) => {
    map.set(id, (map.get(id) ?? 0) + 1);
  };

  const track = <P extends object>(
    id: string,
    component: ComponentType<P>,
  ): ComponentType<P> => {
    const Tracked = (props: P) => {
      bump(renderCounts, id);
      return createElement(component, props);
    };
    Tracked.displayName = `Tracked(${id})`;
    return Tracked;
  };

  return {
    track,
    useRender: (id) => {
      bump(renderCounts, id);
    },
    wrapCommits: (id, node) => {
      const onRender: ProfilerOnRenderCallback = () => {
        bump(commitCounts, id);
      };
      return createElement(Profiler, { id, onRender }, node);
    },
    renders: (id) => renderCounts.get(id) ?? 0,
    commits: (id) => commitCounts.get(id) ?? 0,
    reset: () => {
      renderCounts.clear();
      commitCounts.clear();
    },
    snapshot: () => {
      const out: Record<string, number> = {};
      for (const [k, v] of renderCounts) out[`renders:${k}`] = v;
      for (const [k, v] of commitCounts) out[`commits:${k}`] = v;
      return out;
    },
  };
};
