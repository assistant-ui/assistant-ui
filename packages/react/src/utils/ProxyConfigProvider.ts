import {
  type ModelConfigProvider,
  mergeModelConfigs,
} from "../types/ModelConfigTypes";

export class ProxyConfigProvider implements ModelConfigProvider {
  private _providers = new Set<ModelConfigProvider>();

  getModelConfig() {
    return mergeModelConfigs(this._providers);
  }

  registerModelConfigProvider(provider: ModelConfigProvider) {
    this._providers.add(provider);
    const unsubscribe = provider.subscribe?.(() => {
      this.notifySubscribers();
    });
    this.notifySubscribers();
    return () => {
      this._providers.delete(provider);
      unsubscribe?.();
      this.notifySubscribers();
    };
  }

  private _subscribers = new Set<() => void>();

  notifySubscribers() {
    for (const callback of this._subscribers) callback();
  }

  subscribe(callback: () => void) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }
}
