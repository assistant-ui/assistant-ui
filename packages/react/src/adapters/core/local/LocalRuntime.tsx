"use client";
import type {
  AppendMessage,
  AssistantMessage,
  ThreadMessage,
  UserMessage,
} from "../../../utils/context/stores/AssistantTypes";
import { MessageRepository } from "../../MessageRepository";
import { generateId } from "../../idUtils";
import type {
  MessageUpdateCallback,
  StatusUpdateCallback,
  ThreadRuntime,
  Unsubscribe,
} from "../ThreadRuntime";
import type { ChatModelAdapter } from "./ChatModelAdapter";

export class LocalRuntime implements ThreadRuntime {
  private _messageUpdateCallbacks = new Set<MessageUpdateCallback>();
  private _statusUpdateCallbacks = new Set<StatusUpdateCallback>();

  private abortController: AbortController | null = null;
  private repository = new MessageRepository();

  constructor(public adapter: ChatModelAdapter) {}

  async append(
    message: AppendMessage,
  ): Promise<{ parentId: string; id: string }> {
    // add user message
    const userMessageId = generateId();
    const userMessage: UserMessage = {
      id: userMessageId,
      role: "user",
      content: message.content,
      createdAt: new Date(),
    };
    this.addOrUpdateMessage(message.parentId, userMessage);

    const { id } = await this.startRun(userMessageId);
    return { parentId: userMessageId, id };
  }

  async startRun(parentId: string | null): Promise<{ id: string }> {
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
    this.addOrUpdateMessage(parentId, message);

    void this.run(parentId, messages, message); // run in background

    return { id };
  }

  private addOrUpdateMessage(parentId: string | null, message: ThreadMessage) {
    const clone = { ...message };
    this.repository.addOrUpdateMessage(parentId, clone);
    for (const callback of this._messageUpdateCallbacks)
      callback(parentId, clone);
  }

  private async run(
    parentId: string | null,
    messages: ThreadMessage[],
    message: AssistantMessage,
  ) {
    // abort existing run
    this.cancelRun();
    for (const callback of this._statusUpdateCallbacks) callback(true);

    this.abortController = new AbortController();

    try {
      await this.adapter.run({
        messages,
        abortSignal: this.abortController.signal,
        onUpdate: ({ content }) => {
          message.content = content;
          this.addOrUpdateMessage(parentId, message);
        },
      });

      message.status = "done";
      this.addOrUpdateMessage(parentId, message);
    } catch (e) {
      message.status = "error";
      this.addOrUpdateMessage(parentId, message);
      console.error(e);
    } finally {
      this.cancelRun();
    }
  }

  cancelRun(): void {
    if (!this.abortController) return;

    this.abortController.abort();
    this.abortController = null;
    for (const callback of this._statusUpdateCallbacks) callback(false);
  }

  subscribeToMessageUpdates(callback: MessageUpdateCallback): Unsubscribe {
    this._messageUpdateCallbacks.add(callback);
    return () => this._messageUpdateCallbacks.delete(callback);
  }

  subscribeToStatusUpdates(callback: StatusUpdateCallback): Unsubscribe {
    this._statusUpdateCallbacks.add(callback);
    return () => this._statusUpdateCallbacks.delete(callback);
  }
}
