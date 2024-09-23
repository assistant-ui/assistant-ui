import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { CoreMessage } from "../../types/AssistantTypes";
import { BaseAssistantRuntimeCore } from "../core/BaseAssistantRuntimeCore";
import type { ChatModelAdapter } from "./ChatModelAdapter";
import { ProxyConfigProvider } from "../../internal";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import { fromCoreMessages } from "../edge/converters/fromCoreMessage";

export class LocalRuntimeCore extends BaseAssistantRuntimeCore<LocalThreadRuntimeCore> {
  private readonly _proxyConfigProvider: ProxyConfigProvider;

  constructor(adapter: ChatModelAdapter, options: LocalRuntimeOptions) {
    const proxyConfigProvider = new ProxyConfigProvider();
    super(new LocalThreadRuntimeCore(proxyConfigProvider, adapter, options));
    this._proxyConfigProvider = proxyConfigProvider;
  }
  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public switchToNewThread() {
    const { initialMessages, ...options } = this.thread.options;

    this.thread = new LocalThreadRuntimeCore(
      this._proxyConfigProvider,
      this.thread.adapter,
      options,
    );
  }

  public switchToThread(threadId: string | null) {
    if (threadId !== null) {
      throw new Error("LocalRuntime does not yet support switching threads");
    }

    this.switchToNewThread();
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
