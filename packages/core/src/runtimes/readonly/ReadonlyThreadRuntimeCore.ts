import type { ThreadMessage } from "../../types/message";
import {
  InertThreadRuntimeCore,
  createInertComposer,
} from "../inert/InertThreadRuntimeCore";
import type { Unstable_RecordToolInteractionOptions } from "../../runtime/interfaces/thread-runtime-core";

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

  override switchToBranch(): void {}

  override append(): void {}

  override deleteMessage(): void {}

  override startRun(): void {}

  override resumeRun(): void {}

  override cancelRun(): void {}

  override unstable_notifySessionReset(): void {}

  override addToolResult(): void {}

  override resumeToolCall(): void {}

  override async respondToToolApproval(): Promise<void> {}

  override async unstable_recordToolInteraction(
    _options: Unstable_RecordToolInteractionOptions,
  ): Promise<void> {}

  override speak(): void {}

  override stopSpeaking(): void {}

  override connectVoice(): void {}

  override disconnectVoice(): void {}

  override muteVoice(): void {}

  override unmuteVoice(): void {}

  override submitFeedback(): void {}

  override importExternalState(): void {}

  override beginEdit(): void {}

  override import(): void {}

  override reset(): void {}
}
