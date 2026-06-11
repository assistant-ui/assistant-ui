import { EffectCallback } from "react";

export type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
};

export type Resource<R, A extends readonly unknown[] = any[]> = (
  ...args: A
) => ResourceElement<R, A>;
export type ContravariantResource<R, A extends readonly unknown[] = any[]> = (
  ...args: A
) => ResourceElement<R>;

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

      readonly queue: Set<ReducerQueueEntry>;
      dirty: boolean;
      workInProgress: any;
      current: any;
      reducer: (state: any, action: any) => any;
    }
  | {
      readonly type: "effect";
      cleanup: (() => void) | undefined;
      deps: readonly unknown[] | null | undefined;
    };

export interface EffectTask {
  readonly effect: EffectCallback;
  readonly deps: readonly unknown[] | undefined;
  readonly cell: Cell & { type: "effect" };
}

export interface RenderResult {
  readonly output: any;
  readonly effectTasks: (() => void)[];
}

export interface ResourceFiberRoot {
  version: number;
  committedVersion: number;
  readonly changelog: (() => void)[];

  readonly dispatchUpdate: (callback: () => boolean) => void;
  readonly dirtyCells: (Cell & { type: "reducer" })[];
}

export interface ResourceFiber<R, A extends readonly unknown[] = any[]> {
  readonly root: ResourceFiberRoot;
  readonly hook: (...args: A) => R;
  readonly markDirty: (() => void) | undefined;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;

  /**
   * Dispatches that arrived before the first commit (React flushes passive
   * effects child-first, so a descendant's mount effect can dispatch before
   * the ancestor host commits this fiber). Replayed in FIFO order after the
   * first commit.
   */
  preMountQueue: (() => void)[] | undefined;
}
