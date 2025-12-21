import type { Unsubscribe, EventSubscribable } from "@assistant-ui/core";
import { BaseSubject } from "./BaseSubject";

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
