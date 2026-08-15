import {
  type ModelContextProvider,
  mergeModelContexts,
} from "../model-context/types";
import { notifySubscribers as notifyStateSubscribers } from "../subscribable/subscribable";
import type { Unsubscribe } from "../types/unsubscribe";

export class CompositeContextProvider implements ModelContextProvider {
  private _providers = new Set<ModelContextProvider>();

  getModelContext() {
    return mergeModelContexts(this._providers);
  }

  registerModelContextProvider(provider: ModelContextProvider) {
    const wasRegistered = this._providers.has(provider);
    this._providers.add(provider);
    let unsubscribe: Unsubscribe | undefined;
    try {
      unsubscribe = provider.subscribe?.(() => {
        this.notifySubscribers();
      });
    } catch (error) {
      if (!wasRegistered) this._providers.delete(provider);
      try {
        this.notifySubscribers();
      } catch (notifyError) {
        console.error(notifyError);
      }
      throw error;
    }
    this.notifySubscribers();
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

  subscribe(callback: () => void) {
    this._subscribers.add(callback);
    return () => {
      this._subscribers.delete(callback);
    };
  }
}
