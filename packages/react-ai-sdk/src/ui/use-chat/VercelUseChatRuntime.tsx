import { INTERNAL } from "@assistant-ui/react";
import { ModelConfigProvider } from "@assistant-ui/react";
import { useChat } from "ai/react";
import { VercelUseChatThreadRuntime } from "./VercelUseChatThreadRuntime";

const { ProxyConfigProvider, BaseAssistantRuntime } = INTERNAL;

export class VercelUseChatRuntime extends BaseAssistantRuntime<VercelUseChatThreadRuntime> {
  private readonly _proxyConfigProvider = new ProxyConfigProvider();

  constructor(vercel: ReturnType<typeof useChat>) {
    super(new VercelUseChatThreadRuntime(vercel));
  }

  public set vercel(vercel: ReturnType<typeof useChat>) {
    this.thread.vercel = vercel;
  }

  public onVercelUpdated() {
    return this.thread.onVercelUpdated();
  }

  public getModelConfig() {
    return this._proxyConfigProvider.getModelConfig();
  }

  public registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public switchToThread(threadId: string | null) {
    if (threadId) {
      throw new Error(
        "VercelAIRuntime does not yet support switching threads.",
      );
    }

    // clear the vercel state (otherwise, it will be captured by the MessageRepository)
    this.thread.vercel.messages = [];
    this.thread.vercel.input = "";
    this.thread.vercel.setMessages([]);
    this.thread.vercel.setInput("");

    this.thread = new VercelUseChatThreadRuntime(this.thread.vercel);
  }
}
