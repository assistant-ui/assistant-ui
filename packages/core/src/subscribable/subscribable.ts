import type { Unsubscribe } from "../types";

// =============================================================================
// Sentinel
// =============================================================================

export const SKIP_UPDATE = Symbol("skip-update");
export type SKIP_UPDATE = typeof SKIP_UPDATE;

// =============================================================================
// Types
// =============================================================================

export type Subscribable = {
  subscribe: (callback: () => void) => Unsubscribe;
};

export type SubscribableWithState<TState, TPath> = Subscribable & {
  path: TPath;
  getState: () => TState;
};

export type NestedSubscribable<
  TState extends Subscribable | undefined,
  TPath,
> = SubscribableWithState<TState, TPath>;

export type EventSubscribable<TEvent extends string> = {
  event: TEvent;
  binding: SubscribableWithState<
    | {
        unstable_on: (event: TEvent, callback: () => void) => Unsubscribe;
      }
    | undefined,
    unknown
  >;
};

// =============================================================================
// Utilities
// =============================================================================

function shallowEqual<T extends object>(
  objA: T | undefined,
  objB: T | undefined,
) {
  if (objA === undefined && objB === undefined) return true;
  if (objA === undefined) return false;
  if (objB === undefined) return false;

  for (const key of Object.keys(objA)) {
    const valueA = objA[key as keyof T];
    const valueB = objB[key as keyof T];
    if (!Object.is(valueA, valueB)) return false;
  }

  return true;
}

// =============================================================================
// Base Subscribable (simple pub-sub)
// =============================================================================

export class BaseSubscribable {
  private _subscribers = new Set<() => void>();

  public subscribe(callback: () => void): Unsubscribe {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  public waitForUpdate() {
    return new Promise<void>((resolve) => {
      const unsubscribe = this.subscribe(() => {
        unsubscribe();
        resolve();
      });
    });
  }

  protected _notifySubscribers() {
    const errors = [];
    for (const callback of this._subscribers) {
      try {
        callback();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        throw errors[0];
      } else {
        for (const error of errors) {
          console.error(error);
        }
        throw new AggregateError(errors);
      }
    }
  }
}

// =============================================================================
// Base Subject (lazy connect/disconnect)
// =============================================================================

export abstract class BaseSubject {
  private _subscriptions = new Set<() => void>();
  private _connection: Unsubscribe | undefined;

  protected get isConnected() {
    return !!this._connection;
  }

  protected abstract _connect(): Unsubscribe;

  protected notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  private _updateConnection() {
    if (this._subscriptions.size > 0) {
      if (this._connection) return;
      this._connection = this._connect();
    } else {
      this._connection?.();
      this._connection = undefined;
    }
  }

  public subscribe(callback: () => void) {
    this._subscriptions.add(callback);
    this._updateConnection();

    return () => {
      this._subscriptions.delete(callback);
      this._updateConnection();
    };
  }
}

// =============================================================================
// Subject Implementations
// =============================================================================

export class ShallowMemoizeSubject<TState extends object, TPath>
  extends BaseSubject
  implements SubscribableWithState<TState, TPath>
{
  public get path() {
    return this.binding.path;
  }

  constructor(
    private binding: SubscribableWithState<TState | SKIP_UPDATE, TPath>,
  ) {
    super();
    const state = binding.getState();
    if (state === SKIP_UPDATE)
      throw new Error("Entry not available in the store");
    this._previousState = state;
  }

  private _previousState: TState;
  public getState = () => {
    if (!this.isConnected) this._syncState();
    return this._previousState;
  };

  private _syncState() {
    const state = this.binding.getState();
    if (state === SKIP_UPDATE) return false;
    if (shallowEqual(state, this._previousState)) return false;
    this._previousState = state;
    return true;
  }

  protected _connect() {
    const callback = () => {
      if (this._syncState()) {
        this.notifySubscribers();
      }
    };

    return this.binding.subscribe(callback);
  }
}

export class LazyMemoizeSubject<TState extends object, TPath>
  extends BaseSubject
  implements SubscribableWithState<TState, TPath>
{
  public get path() {
    return this.binding.path;
  }

  constructor(
    private binding: SubscribableWithState<TState | SKIP_UPDATE, TPath>,
  ) {
    super();
  }

  private _previousStateDirty = true;
  private _previousState: TState | undefined;
  public getState = () => {
    if (!this.isConnected || this._previousStateDirty) {
      const newState = this.binding.getState();
      if (newState !== SKIP_UPDATE) {
        this._previousState = newState;
      }
      this._previousStateDirty = false;
    }
    if (this._previousState === undefined)
      throw new Error("Entry not available in the store");
    return this._previousState;
  };

  protected _connect() {
    const callback = () => {
      this._previousStateDirty = true;
      this.notifySubscribers();
    };

    return this.binding.subscribe(callback);
  }
}

export class NestedSubscriptionSubject<
    TState extends Subscribable | undefined,
    TPath,
  >
  extends BaseSubject
  implements
    SubscribableWithState<TState, TPath>,
    NestedSubscribable<TState, TPath>
{
  public get path() {
    return this.binding.path;
  }

  constructor(private binding: NestedSubscribable<TState, TPath>) {
    super();
  }

  public getState() {
    return this.binding.getState();
  }

  public outerSubscribe(callback: () => void) {
    return this.binding.subscribe(callback);
  }

  protected _connect(): Unsubscribe {
    const callback = () => {
      this.notifySubscribers();
    };

    let lastState = this.binding.getState();
    let innerUnsubscribe = lastState?.subscribe(callback);
    const onRuntimeUpdate = () => {
      const newState = this.binding.getState();
      if (newState === lastState) return;
      lastState = newState;

      innerUnsubscribe?.();
      innerUnsubscribe = newState?.subscribe(callback);

      callback();
    };

    const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
    return () => {
      outerUnsubscribe?.();
      innerUnsubscribe?.();
    };
  }
}

export class EventSubscriptionSubject<
  TEvent extends string,
> extends BaseSubject {
  constructor(private config: EventSubscribable<TEvent>) {
    super();
  }

  public getState() {
    return this.config.binding.getState();
  }

  public outerSubscribe(callback: () => void) {
    return this.config.binding.subscribe(callback);
  }

  protected _connect(): Unsubscribe {
    const callback = () => {
      this.notifySubscribers();
    };

    let lastState = this.config.binding.getState();
    let innerUnsubscribe = lastState?.unstable_on(this.config.event, callback);
    const onRuntimeUpdate = () => {
      const newState = this.config.binding.getState();
      if (newState === lastState) return;
      lastState = newState;

      innerUnsubscribe?.();
      innerUnsubscribe = newState?.unstable_on(this.config.event, callback);
    };

    const outerUnsubscribe = this.outerSubscribe(onRuntimeUpdate);
    return () => {
      outerUnsubscribe?.();
      innerUnsubscribe?.();
    };
  }
}
