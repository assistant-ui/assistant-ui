export type ResourceFn<R, P> = (props: P) => R;

export type Unsubscribe = () => void;

export type ResourceElement<R, P = any> = {
  type: ResourceFn<R, P>;
  props: P;
  key?: string | number;
};

export type ResourceElementConstructor<R, P> = (
  ...args: undefined extends P
    ? [props?: P, options?: { key?: string | number }]
    : [props: P, options?: { key?: string | number }]
) => ResourceElement<R, P>;

export type StateUpdater<S> = S | ((prev: S) => S);

export type Destructor = () => void;
export type EffectCallback = () => void | Destructor;

export type Cell =
  | {
      type: "state";
      value: any;
      set: (updater: StateUpdater<any>) => void;
    }
  | {
      type: "effect";
      mounted: boolean;
      cleanup?: Destructor | undefined;
      deps?: readonly unknown[] | undefined;
    };

export interface EffectTask {
  effect: EffectCallback;
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
  readonly resourceFn: ResourceFn<R, P>;

  cells: Cell[];
  currentIndex: number;

  renderContext: RenderResult | undefined; // set during render

  isMounted: boolean;
  isFirstRender: boolean;
  isNeverMounted: boolean;
}
