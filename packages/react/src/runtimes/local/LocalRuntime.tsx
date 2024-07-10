import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadUserMessage,
} from "../../types/AssistantTypes";
import {
  type ModelConfigProvider,
  mergeModelConfigs,
} from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadRuntime } from "../core";
import { MessageRepository } from "../utils/MessageRepository";
import { generateId } from "../../utils/idUtils";
import { BaseAssistantRuntime } from "../core/BaseAssistantRuntime";
import type { ChatModelAdapter, ChatModelRunResult } from "./ChatModelAdapter";

export class LocalRuntime extends BaseAssistantRuntime<LocalThreadRuntime> {
  private readonly _configProviders: Set<ModelConfigProvider>;

  constructor(adapter: ChatModelAdapter) {
    const configProviders = new Set<ModelConfigProvider>();
    super(new LocalThreadRuntime(configProviders, adapter));
    this._configProviders = configProviders;
  }

  public set adapter(adapter: ChatModelAdapter) {
    this.thread.adapter = adapter;
  }

  registerModelConfigProvider(provider: ModelConfigProvider) {
    this._configProviders.add(provider);
    return () => this._configProviders.delete(provider);
  }

  public switchToThread(threadId: string | null) {
    if (threadId) {
      throw new Error("LocalRuntime does not yet support switching threads");
    }

    return (this.thread = new LocalThreadRuntime(
      this._configProviders,
      this.thread.adapter,
    ));
  }
}

const CAPABILITIES = Object.freeze({
  edit: true,
  reload: true,
  cancel: true,
  copy: true,
});

class LocalThreadRuntime implements ThreadRuntime {
  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;
  private readonly repository = new MessageRepository();

  public readonly capabilities = CAPABILITIES;

  public get messages() {
    return this.repository.getMessages();
  }
  public get isRunning() {
    return this.abortController != null;
  }

  constructor(
    private _configProviders: Set<ModelConfigProvider>,
    public adapter: ChatModelAdapter,
  ) {}

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this.notifySubscribers();
  }

  public async append(message: AppendMessage): Promise<void> {
    // add user message
    const userMessageId = generateId();
    const userMessage: ThreadUserMessage = {
      id: userMessageId,
      role: "user",
      content: message.content,
      createdAt: new Date(),
    };
    this.repository.addOrUpdateMessage(message.parentId, userMessage);

    await this.startRun(userMessageId);
  }

  public async startRun(parentId: string | null): Promise<void> {
    const id = generateId();

    this.repository.resetHead(parentId);
    const messages = this.repository.getMessages();

    // add assistant message
    const message: ThreadAssistantMessage = {
      id,
      role: "assistant",
      status: { type: "in_progress" },
      content: [{ type: "text", text: "" }],
      createdAt: new Date(),
    };
    this.repository.addOrUpdateMessage(parentId, { ...message });

    // abort existing run
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.notifySubscribers();

    try {
      const updateHandler = ({ content }: ChatModelRunResult) => {
        message.content = content;
        this.repository.addOrUpdateMessage(parentId, { ...message });
        this.notifySubscribers();
      };
      const result = await this.adapter.run({
        messages,
        abortSignal: this.abortController.signal,
        config: mergeModelConfigs(this._configProviders),
        onUpdate: updateHandler,
      });
      if (result !== undefined) {
        updateHandler(result);
      }

      message.status = { type: "done" };
      this.repository.addOrUpdateMessage(parentId, { ...message });
    } catch (e) {
      message.status = { type: "error", error: e };
      this.repository.addOrUpdateMessage(parentId, { ...message });
      console.error(e);
    } finally {
      this.abortController = null;
      this.notifySubscribers();
    }
  }

  cancelRun(): void {
    if (!this.abortController) return;

    this.abortController.abort();
    this.abortController = null;
    this.notifySubscribers();
  }

  private notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  addToolResult() {
    throw new Error("LocalRuntime does not yet support adding tool results");
  }
}
