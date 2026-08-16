import {
  type ModelContextProvider,
  mergeModelContexts,
} from "../model-context/types";
import { notifySubscribers as notifyStateSubscribers } from "../subscribable/subscribable";
import type { Unsubscribe } from "../types/unsubscribe";

export class CompositeContextProvider implements ModelContextProvider {
  private _providers = new Map<symbol, ModelContextProvider>();
  private _providerUnsubscribes = new Map<symbol, Unsubscribe | undefined>();

  getModelContext() {
    return mergeModelContexts(new Set(this._providers.values()));
  }

  registerModelContextProvider(provider: ModelContextProvider) {
    const id = Symbol();
    this._providers.set(id, provider);
    let unsubscribe: Unsubscribe | undefined;
    try {
      unsubscribe = provider.subscribe?.(() => {
        this.notifySubscribers();
      });
    } catch (error) {
      this._providers.delete(id);
      try {
        this.notifySubscribers();
      } catch (notifyError) {
        console.error(notifyError);
      }
      throw error;
    }
    this._providerUnsubscribes.set(id, unsubscribe);
    this.notifySubscribers();
    return () => {
      this._providers.delete(id);
      const unsubscribe = this._providerUnsubscribes.get(id);
      unsubscribe?.();
      this._providerUnsubscribes.delete(id);
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
