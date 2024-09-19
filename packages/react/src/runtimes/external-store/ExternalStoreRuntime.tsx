import { BaseAssistantRuntime, ProxyConfigProvider } from "../../internal";
import { ModelConfigProvider } from "../../types";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import { ExternalStoreThreadRuntime } from "./ExternalStoreThreadRuntime";

export class ExternalStoreRuntime extends BaseAssistantRuntime<ExternalStoreThreadRuntime> {
  private readonly _proxyConfigProvider = new ProxyConfigProvider();

  constructor(store: ExternalStoreAdapter<any>) {
    super(new ExternalStoreThreadRuntime(store));
  }

  public get store() {
    return this.thread.store;
  }

  public set store(store: ExternalStoreAdapter<any>) {
    this.thread.store = store;
  }

  public getModelConfig() {
    return this._proxyConfigProvider.getModelConfig();
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public async switchToNewThread() {
    if (!this.store.onSwitchToNewThread)
      throw new Error("Runtime does not support switching to new threads.");

    this.thread = new ExternalStoreThreadRuntime({
      ...this.store,
      messages: [],
    });
    await this.store.onSwitchToNewThread();
  }

  public async switchToThread(threadId: string | null) {
    if (threadId !== null) {
      if (!this.store.onSwitchToThread)
        throw new Error("Runtime does not support switching threads.");

      this.thread = new ExternalStoreThreadRuntime({
        ...this.store,
        messages: [], // ignore messages until rerender
      });
      this.store.onSwitchToThread(threadId);
    } else {
      this.switchToNewThread();
    }
  }
}
