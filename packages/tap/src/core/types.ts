export type ResourceElement<R, A extends readonly unknown[] = any[]> = {
  readonly hook: (...args: A) => R;
  readonly args: Readonly<A>;
  readonly key?: string | number;
  readonly deps?: readonly unknown[];
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

export interface ChangelogRecord {
  readonly fiber: ResourceFiber<any, any>;
  readonly cell: ReducerCell;
  readonly action: any;
  hasEagerState: boolean;
  eagerState: any;
  queued: boolean;
}

export type ReducerCell = {
  readonly type: "reducer";
  readonly dispatch: (action: any) => void;

  queue: ChangelogRecord[] | null;
  renderQueue: any[] | null;

  workInProgress: any;
  current: any;
  reducer: (state: any, action: any) => any;
  isDirty: boolean;
};

export type MemoCell<T = any> = {
  readonly type: "memo";
  current: T;
  currentDeps: readonly unknown[];
  wip: T;
  wipDeps: readonly unknown[];
  isDirty: boolean;
};

export type EffectCell = {
  readonly type: "effect";
  cleanup: (() => void) | undefined;
  deps: readonly unknown[] | null | undefined;
};

export type Cell = ReducerCell | MemoCell | EffectCell;

export type CommitCallback = () => void;
export type CommitCallbacks = Array<CommitCallback[] | undefined>;

export interface RenderResult {
  value: any;
  readonly commitCallbacks: CommitCallbacks;
}

export interface ResourceFiberRoot {
  version: number;
  committedVersion: number;
  readonly changelog: (() => void)[];

  readonly dispatchUpdate: (callback: () => boolean) => void;
  readonly rollbackCallbacks: (() => void)[];
  hasDirtyReducers: boolean;
}

export interface ResourceFiber<R, A extends readonly unknown[] = any[]> {
  readonly root: ResourceFiberRoot;
  readonly hook: (...args: A) => R;
  readonly markDirty: (() => void) | undefined;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];
  currentIndex: number;
  memoCache: {
    current: unknown[][] | null;
    workInProgress: unknown[][] | null;
    index: number;
  };

  commitCallbacks: CommitCallbacks;
  renderPendingCells: Set<ReducerCell> | null;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
