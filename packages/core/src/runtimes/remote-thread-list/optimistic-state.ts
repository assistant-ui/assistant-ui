import { BaseSubscribable } from "../../subscribable/subscribable";

type Transform<TState, TResult> = {
  execute: () => Promise<TResult>;

  /** transform the state after the promise resolves */
  then?: (state: TState, result: TResult) => TState;

  /** transform the state during resolution and afterwards */
  optimistic?: (state: TState) => TState;

  /** transform the state only while loading */
  loading?: (state: TState, task: Promise<TResult>) => TState;
};

type PendingTransform<TState, TResult> = Transform<TState, TResult> & {
  order: number;
  task: Promise<TResult>;
};

type CompletedOptimistic<TState> = {
  order: number;
  optimistic: (state: TState) => TState;
};

const pipeTransforms = <TState, TExtra>(
  initialState: TState,
  extraParam: TExtra,
  transforms: (((state: TState, extra: TExtra) => TState) | undefined)[],
): TState => {
  return transforms.reduce((state, transform) => {
    return transform?.(state, extraParam) ?? state;
  }, initialState);
};

export class OptimisticState<TState> extends BaseSubscribable {
  private readonly _pendingTransforms: Array<PendingTransform<TState, any>> =
    [];

  /**
   * Completed optimistic callbacks remain active while any transform is
   * pending, so later state replacements cannot erase them. Invocation order
   * determines which overlapping optimistic update wins.
   *
   * Correctness requirement: `optimistic` callbacks must be idempotent.
   */
  private readonly _completedOptimistics: Array<CompletedOptimistic<TState>> =
    [];

  private _nextTransformOrder = 0;

  private _baseValue: TState;
  private _cachedValue: TState;

  public constructor(initialState: TState) {
    super();
    this._baseValue = initialState;
    this._cachedValue = initialState;
  }

  private _updateState(): void {
    const activeTransforms = [
      ...this._pendingTransforms.map((transform) => ({
        order: transform.order,
        apply: (state: TState) =>
          pipeTransforms(state, transform.task, [
            transform.loading,
            transform.optimistic,
          ]),
      })),
      ...this._completedOptimistics.map(({ order, optimistic }) => ({
        order,
        apply: optimistic,
      })),
    ].sort((a, b) => a.order - b.order);

    this._cachedValue = activeTransforms.reduce(
      (state, transform) => transform.apply(state),
      this._baseValue,
    );

    this._notifySubscribers();
  }

  public get baseValue(): TState {
    return this._baseValue;
  }

  public get value(): TState {
    return this._cachedValue;
  }

  public update(state: TState): void {
    this._baseValue = state;
    this._updateState();
  }

  public async optimisticUpdate<TResult>(
    transform: Transform<TState, TResult>,
  ): Promise<TResult> {
    const order = this._nextTransformOrder++;
    const task = transform.execute();
    const pendingTransform = {
      ...transform,
      order,
      task,
    };
    try {
      this._pendingTransforms.push(pendingTransform);
      this._updateState();

      const result = await task;
      this._baseValue = pipeTransforms(this._baseValue, result, [
        transform.optimistic,
        transform.then,
      ]);

      for (const completed of this._completedOptimistics) {
        if (transform.then || completed.order > pendingTransform.order) {
          this._baseValue = completed.optimistic(this._baseValue);
        }
      }

      if (transform.optimistic) {
        this._completedOptimistics.push({
          order: pendingTransform.order,
          optimistic: transform.optimistic,
        });
        this._completedOptimistics.sort((a, b) => a.order - b.order);
      }

      return result;
    } finally {
      const index = this._pendingTransforms.indexOf(pendingTransform);
      if (index > -1) {
        this._pendingTransforms.splice(index, 1);
      }

      if (this._pendingTransforms.length === 0) {
        this._completedOptimistics.length = 0;
      }

      this._updateState();
    }
  }
}
