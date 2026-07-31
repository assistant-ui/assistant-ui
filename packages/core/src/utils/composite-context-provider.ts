import {
  type ModelContextProvider,
  mergeModelContexts,
} from "../model-context/types";
import { notifySubscribers as notifyStateSubscribers } from "../subscribable/subscribable";
import type { Unsubscribe } from "../types/unsubscribe";
import { notifyEventListeners } from "./notify-event-listeners";

export class CompositeContextProvider implements ModelContextProvider {
  private _providers = new Set<ModelContextProvider>();

  getModelContext() {
    return mergeModelContexts(this._providers);
  }

  registerModelContextProvider(provider: ModelContextProvider) {
    const wasRegistered = this._providers.has(provider);
    this._providers.add(provider);
    let unsubscribe: Unsubscribe | undefined;
    let isRegistering = true;
    try {
      unsubscribe = provider.subscribe?.(() => {
        if (isRegistering) {
          this.notifyRegistrationSubscribers();
        } else {
          this.notifySubscribers();
        }
      });
    } catch (error) {
      if (!wasRegistered) this._providers.delete(provider);
      this.notifyRegistrationSubscribers();
      throw error;
    } finally {
      isRegistering = false;
    }
    this.notifyRegistrationSubscribers();
    return () => {
      this._providers.delete(provider);
      unsubscribe?.();
      this.notifySubscribers();
    };
  }

  private _subscribers = new Set<() => void>();

  notifySubscribers() {
    notifyStateSubscribers(this._subscribers);
  }

  private notifyRegistrationSubscribers() {
    notifyEventListeners(
      this._subscribers,
      undefined,
      "Model context provider",
    );
  }

  subscribe(callback: () => void) {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }
}
