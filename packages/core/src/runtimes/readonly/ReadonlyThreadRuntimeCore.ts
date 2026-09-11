import type { ThreadMessage } from "../../types/message";
import {
  InertThreadRuntimeCore,
  createInertComposer,
} from "../inert/InertThreadRuntimeCore";

const READONLY_THREAD_ERROR = new Error(
  "This is a readonly thread. You cannot perform mutations on readonly threads.",
);

export class ReadonlyThreadRuntimeCore extends InertThreadRuntimeCore {
  protected get error() {
    return READONLY_THREAD_ERROR;
  }

  private _messages: readonly ThreadMessage[] = [];

  get messages() {
    return this._messages;
  }

  setMessages(messages: readonly ThreadMessage[]) {
    if (this._messages === messages) return;
    this._messages = messages;
    this._notifySubscribers();
  }

  getMessageById(messageId: string) {
    const idx = this._messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return undefined;
    return {
      parentId: this._messages[idx - 1]?.id ?? null,
      message: this._messages[idx]!,
      index: idx,
    };
  }

  getBranches(messageId: string) {
    const idx = this._messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return [];
    return [messageId];
  }

  export() {
    return {
      messages: this._messages.map((message, idx) => ({
        message,
        parentId: this._messages[idx - 1]?.id ?? null,
      })),
    };
  }

  composer = createInertComposer(READONLY_THREAD_ERROR, false);

  isLoading = false;

  override cancelRun(): void {}

  override stopSpeaking(): void {}

  override disconnectVoice(): void {}
}
