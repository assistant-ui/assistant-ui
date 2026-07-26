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

export type ResourceContext = Map<object, ResourceContextValue>;
export type ResourceContextDeps = Map<object, ResourceFiber<any> | null>;

export interface ResourceContextValue {
  value: unknown;
  source: ResourceFiber<any> | null;
}

export interface TapRoot {
  version: number;
  committedVersion: number;
  context: ResourceContext;
  readonly changelog: ChangelogRecord[];
  readonly dispatchUpdate: (
    evaluate: () => boolean,
    apply: () => boolean,
  ) => void;

  readonly rollbackCallbacks: (() => void)[];
}

export interface ResourceFiber<R, A extends readonly unknown[] = any[]> {
  readonly root: TapRoot;
  readonly hook: (...args: A) => R;
  readonly markDirty: (() => void) | undefined;
  readonly devStrictMode: "root" | "child" | null;

  cells: Cell[];

  wipContextDeps: ResourceContextDeps | null;
  contextDeps: ResourceContextDeps | null;
  commitCallbacks: CommitCallbacks | null;
  wipCommitCallbacks: CommitCallbacks | null;

  currentIndex: number;
  memoCache: {
    current: unknown[][] | null;
    workInProgress: unknown[][] | null;
    index: number;
  };

  renderPendingCells: Set<ReducerCell> | null;

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
