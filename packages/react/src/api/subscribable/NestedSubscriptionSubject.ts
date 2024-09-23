import { Unsubscribe } from "../../types";
import { BaseSubject } from "./BaseSubject";
import {
  NestedSubscribable,
  Subscribable,
  SubscribableWithState,
} from "./Subscribable";

export class NestedSubscriptionSubject<TState extends Subscribable>
  extends BaseSubject
  implements SubscribableWithState<TState>, NestedSubscribable<TState>
{
  constructor(private binding: NestedSubscribable<TState>) {
    super();
  }

  public getState() {
    return this.binding.getState();
  }

  protected _connect(): Unsubscribe {
    const callback = () => {
      this.notifySubscribers();
    };

    let lastState = this.binding.getState();
    let innerUnsubscribe = lastState.subscribe(callback);
    const onRuntimeUpdate = () => {
      const newState = this.binding.getState();
      if (newState === lastState) return;
      lastState = newState;

      innerUnsubscribe?.();
      innerUnsubscribe = this.binding.getState().subscribe(callback);

      callback();
    };

    const outerUnsubscribe = this.binding.subscribe(onRuntimeUpdate);
    return () => {
      outerUnsubscribe?.();
      innerUnsubscribe();
    };
  }
}
