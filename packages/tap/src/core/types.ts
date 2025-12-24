import type { tapEffect } from "../hooks/tap-effect";
import type { tapState } from "../hooks/tap-state";
import type { fnSymbol } from "./callResourceFn";

export type ResourceElement<R, P = any> = {
  readonly type: Resource<R, P> & { [fnSymbol]: (props: P) => R };
  readonly props: P;
  readonly key?: string | number;
};

export type Resource<R, P> = (props: P) => ResourceElement<R, P>;
export type ContravariantResource<R, P> = (props: P) => ResourceElement<R>;

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
      cleanup: tapEffect.Destructor | void;
      deps: readonly unknown[] | null | undefined;
    };

export interface EffectTask {
  readonly effect: tapEffect.EffectCallback;
  readonly deps: readonly unknown[] | undefined;
  readonly cell: Cell & { type: "effect" };
}

export interface RenderResult {
  readonly output: any;
  readonly props: any;
  readonly commitTasks: (() => void)[];
}

export interface ResourceFiber<R, P> {
  readonly dispatchUpdate: (callback: () => boolean) => void;
  readonly type: Resource<R, P>;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
