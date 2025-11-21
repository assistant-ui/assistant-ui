import type { tapEffect } from "../hooks/tap-effect";
import type { tapState } from "../hooks/tap-state";

export type ResourceElement<R, P = any> = {
  type: Resource<R, P>;
  props: P;
  key?: string | number;
};

export type Resource<R, P> = (
  ...args: P extends undefined
    ? [props?: undefined, options?: { key?: string | number }]
    : [props: P, options?: { key?: string | number }]
) => ResourceElement<R, P>;

export type ContravariantResource<R, P> = (
  props: P,
  options?: { key?: string | number },
) => ResourceElement<R, any>;

export type Cell =
  | {
      type: "state";
      value: any;
      set: (updater: tapState.StateUpdater<any>) => void;
    }
  | {
      type: "effect";
      mounted: boolean;
      cleanup?: tapEffect.Destructor | undefined;
      deps?: readonly unknown[] | undefined;
    };

export interface EffectTask {
  effect: tapEffect.EffectCallback;
  deps?: readonly unknown[] | undefined;
  cellIndex: number;
}

export interface RenderResult {
  state: any;
  props: any;
  commitTasks: EffectTask[];
}

export interface ResourceFiber<R, P> {
  readonly scheduleRerender: () => void;
  readonly resource: Resource<R, P>;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
