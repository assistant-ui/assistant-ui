import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { CoreMessage } from "../../types/AssistantTypes";
import { BaseAssistantRuntime } from "../core/BaseAssistantRuntime";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { ProxyConfigProvider } from "../../internal";
import { LocalThreadRuntime } from "./LocalThreadRuntime";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import { fromCoreMessages } from "../edge/converters/fromCoreMessage";

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

  public reset({
    initialMessages,
  }: {
    initialMessages?: readonly CoreMessage[] | undefined;
  } = {}) {
    this.switchToThread(null);
    if (!initialMessages) return;

    const messages = fromCoreMessages(initialMessages);
    this.thread.import({
      messages: messages.map((m, idx) => ({
        parentId: messages[idx - 1]?.id ?? null,
        message: m,
      })),
    });
  }
}
