import type {
  AppendMessage,
  AssistantMessage,
  UserMessage,
} from "../../utils/AssistantTypes";
import { MessageRepository } from "../utils/MessageRepository";
import { generateId } from "../utils/idUtils";
import type { AssistantRuntime, Unsubscribe } from "../core/AssistantRuntime";
import type { ChatModelAdapter } from "./ChatModelAdapter";

export class LocalRuntime implements AssistantRuntime {
  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;
  private repository = new MessageRepository();

  public get messages() {
    return this.repository.getMessages();
  }
  public get isRunning() {
    return this.abortController != null;
  }

  constructor(public adapter: ChatModelAdapter) {}

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
    const userMessage: UserMessage = {
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
    const message: AssistantMessage = {
      id,
      role: "assistant",
      status: "in_progress",
      content: [{ type: "text", text: "" }],
      createdAt: new Date(),
    };
    this.repository.addOrUpdateMessage(parentId, { ...message });

    // abort existing run
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.notifySubscribers();

    try {
      await this.adapter.run({
        messages,
        abortSignal: this.abortController.signal,
        onUpdate: ({ content }) => {
          message.content = content;
          this.repository.addOrUpdateMessage(parentId, { ...message });
          this.notifySubscribers();
        },
      });

      message.status = "done";
      this.repository.addOrUpdateMessage(parentId, { ...message });
    } catch (e) {
      message.status = "error";
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
}
