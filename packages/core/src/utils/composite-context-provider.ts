import {
  type ModelContextProvider,
  mergeModelContexts,
} from "../model-context/types";
import type { Unsubscribe } from "../types/unsubscribe";
import { notifyEventListeners } from "./notify-event-listeners";

export class CompositeContextProvider implements ModelContextProvider {
  private _providers = new Set<ModelContextProvider>();

  getModelContext() {
    return mergeModelContexts(this._providers);
  }

  registerModelContextProvider(provider: ModelContextProvider) {
    this._providers.add(provider);
    let unsubscribe: Unsubscribe | undefined;
    try {
      unsubscribe = provider.subscribe?.(() => {
        this.notifySubscribers();
      });
    } catch (error) {
      this._providers.delete(provider);
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
