import type { tapEffect } from "../hooks/tap-effect";
import type { tapState } from "../hooks/tap-state";
import { fnSymbol } from "./callResourceFn";

export type ResourceElement<R, P = any> = {
  readonly type: Resource<R, P> & { [fnSymbol]: (props: P) => R };
  readonly props: P;
  readonly key?: string | number;
};

type ResourceArgs<P> = undefined extends P ? [props?: P] : [props: P];
export type Resource<R, P> = (
  ...args: ResourceArgs<P>
) => ResourceElement<R, P>;

export type ContravariantResource<R, P> = (
  ...args: ResourceArgs<P>
) => ResourceElement<R>;

export type ExtractResourceReturnType<T> =
  T extends ResourceElement<infer R, any>
    ? R
    : T extends Resource<infer R, any>
      ? R
      : never;

export type Cell =
  | {
      readonly type: "state";
      value: any;
      set: (updater: tapState.StateUpdater<any>) => void;
    }
  | {
      readonly type: "effect";
      mounted: boolean;
      cleanup: tapEffect.Destructor | void;
      deps: readonly unknown[] | undefined;
    };

export interface EffectTask {
  readonly effect: tapEffect.EffectCallback;
  readonly deps: readonly unknown[] | undefined;
  readonly cellIndex: number;
}

export interface RenderResult {
  readonly output: any;
  readonly props: any;
  readonly commitTasks: EffectTask[];
}

export interface ResourceFiber<R, P> {
  readonly scheduleUpdate: () => void;
  readonly type: Resource<R, P>;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
