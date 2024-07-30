import {
  type ThreadMessage,
  INTERNAL,
  ModelConfigProvider,
} from "@assistant-ui/react";
import { useAssistant } from "ai/react";
import { VercelUseAssistantThreadRuntime } from "./VercelUseAssistantThreadRuntime";

const { ProxyConfigProvider, BaseAssistantRuntime } = INTERNAL;

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class VercelUseAssistantRuntime extends BaseAssistantRuntime<VercelUseAssistantThreadRuntime> {
  private readonly _proxyConfigProvider = new ProxyConfigProvider();

  constructor(vercel: ReturnType<typeof useAssistant>) {
    super(new VercelUseAssistantThreadRuntime(vercel));
  }

  public set vercel(vercel: ReturnType<typeof useAssistant>) {
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
      throw new Error("VercelAIRuntime does not yet support switching threads");
    }

    // clear the vercel state (otherwise, it will be captured by the MessageRepository)
    this.thread.vercel.messages = [];
    this.thread.vercel.input = "";
    this.thread.vercel.setMessages([]);
    this.thread.vercel.setInput("");

    this.thread = new VercelUseAssistantThreadRuntime(this.thread.vercel);
  }
}
