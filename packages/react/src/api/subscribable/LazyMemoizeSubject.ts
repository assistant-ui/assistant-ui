import { BaseSubject } from "./BaseSubject";
import { SubscribableWithState } from "./Subscribable";

export class LazyMemoizeSubject<T extends object>
  extends BaseSubject
  implements SubscribableWithState<T>
{
  constructor(private binding: SubscribableWithState<T | undefined>) {
    super();
    const state = binding.getState();
    if (state === undefined)
      throw new Error("Entry not available in the store");
    this._previousState = state;
  }

  private _previousStateDirty = true;
  private _previousState: T;
  public getState = () => {
    if (!this.isConnected || this._previousStateDirty) {
      const newState = this.binding.getState();
      if (newState !== undefined) {
        this._previousState = newState;
      }
      this._previousStateDirty = false;
    }
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
