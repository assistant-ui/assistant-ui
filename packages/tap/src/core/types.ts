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
      renderQueue: any[] | null;

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
  readonly cleanup: () => void;
  readonly setup: () => void;
}

export interface RenderResult {
  output: any;
  effectTasks: EffectTask[];
}

export interface ChangelogRecord {
  readonly fiber: ResourceFiber<any, any>;
  readonly cell: Cell & { type: "reducer" };
  readonly entry: ReducerQueueEntry;
}

export interface ResourceFiberRoot {
  version: number;
  committedVersion: number;
  readonly changelog: ChangelogRecord[];

  readonly dispatchUpdate: (callback: () => boolean) => void;
  readonly dirtyCells: Set<Cell & { type: "reducer" }>;
}

export interface ResourceFiber<R, A extends readonly unknown[] = any[]> {
  readonly root: ResourceFiberRoot;
  readonly hook: (...args: A) => R;
  readonly markDirty: (() => void) | undefined;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;

  renderPendingCells: Set<Cell & { type: "reducer" }> | null;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
