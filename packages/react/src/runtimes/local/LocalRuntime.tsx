import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import { BaseAssistantRuntime } from "../core/BaseAssistantRuntime";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { ProxyConfigProvider } from "../../internal";
import { LocalThreadRuntime } from "./LocalThreadRuntime";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";

export class LocalRuntime extends BaseAssistantRuntime<LocalThreadRuntime> {
  private readonly _proxyConfigProvider: ProxyConfigProvider;

  constructor(adapter: ChatModelAdapter, options?: LocalRuntimeOptions) {
    const proxyConfigProvider = new ProxyConfigProvider();
    super(new LocalThreadRuntime(proxyConfigProvider, adapter, options));
    this._proxyConfigProvider = proxyConfigProvider;
  }

  public set adapter(adapter: ChatModelAdapter) {
    this.thread.adapter = adapter;
  }

  registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public switchToThread(threadId: string | null) {
    if (threadId) {
      throw new Error("LocalRuntime does not yet support switching threads");
    }

    return (this.thread = new LocalThreadRuntime(
      this._proxyConfigProvider,
      this.thread.adapter,
    ));
  }
}
