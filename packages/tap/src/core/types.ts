import type { tapEffect } from "../hooks/tap-effect";
import type { fnSymbol } from "./helpers/callResourceFn";

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

export interface ReducerQueueEntry {
  readonly action: any;
  hasEagerState: boolean;
  eagerState: any;
}

export type Cell =
  | {
      readonly type: "reducer";
      readonly dispatch: (action: any) => void;

      readonly queue: ReducerQueueEntry[];
      dirty: boolean;
      workInProgress: any;
      current: any;
      reducer: (state: any, action: any) => any;
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
  readonly effectTasks: (() => void)[];
}

export interface ResourceFiberRoot {
  readonly dispatchUpdate: (callback: () => boolean) => void;
  readonly dirtyCells: (Cell & { type: "reducer" })[];
}

export interface ResourceFiber<R, P> {
  readonly root: ResourceFiberRoot;
  readonly type: Resource<R, P>;
  readonly markDirty: (() => void) | undefined;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
