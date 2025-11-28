import type {
  Attachment,
  CompleteAttachment,
  PendingAttachment,
} from "../../../types/AttachmentTypes";
import type { AppendMessage, Unsubscribe } from "../../../types";
import type { AttachmentAdapter } from "../adapters/attachment";
import type {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
  ListeningState,
} from "../core/ComposerRuntimeCore";
import type { MessageRole, RunConfig } from "../../../types/AssistantTypes";
import { BaseSubscribable } from "../remote-thread-list/BaseSubscribable";
import type { SpeechRecognitionAdapter } from "../adapters/speech/SpeechAdapterTypes";

const isAttachmentComplete = (a: Attachment): a is CompleteAttachment =>
  a.status.type === "complete";

export abstract class BaseComposerRuntimeCore
  extends BaseSubscribable
  implements ComposerRuntimeCore
{
  public readonly isEditing = true;

  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected abstract getSpeechRecognitionAdapter():
    | SpeechRecognitionAdapter
    | undefined;

  public get attachmentAccept(): string {
    return this.getAttachmentAdapter()?.accept ?? "*";
  }

  private _attachments: readonly Attachment[] = [];
  public get attachments() {
    return this._attachments;
  }

  protected setAttachments(value: readonly Attachment[]) {
    this._attachments = value;
    this._notifySubscribers();
  }

  public abstract get canCancel(): boolean;

  public get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }

  private _text = "";

  get text() {
    return this._text;
  }

  private _role: MessageRole = "user";

  get role() {
    return this._role;
  }

  private _runConfig: RunConfig = {};

  get runConfig() {
    return this._runConfig;
  }

  public setText(value: string) {
    if (this._text === value) return;

    this._text = value;
    this._notifySubscribers();
  }

  public setRole(role: MessageRole) {
    if (this._role === role) return;

    this._role = role;
    this._notifySubscribers();
  }

  public setRunConfig(runConfig: RunConfig) {
    if (this._runConfig === runConfig) return;

    this._runConfig = runConfig;
    this._notifySubscribers();
  }

  private _emptyTextAndAttachments() {
    this._attachments = [];
    this._text = "";
    this._notifySubscribers();
  }

  private async _onClearAttachments() {
    const adapter = this.getAttachmentAdapter();
    if (adapter) {
      await Promise.all(this._attachments.map((a) => adapter.remove(a)));
    }
  }

  public async reset() {
    if (
      this._attachments.length === 0 &&
      this._text === "" &&
      this._role === "user" &&
      Object.keys(this._runConfig).length === 0
    ) {
      return;
    }

    this._role = "user";
    this._runConfig = {};

    const task = this._onClearAttachments();
    this._emptyTextAndAttachments();
    await task;
  }

  public async clearAttachments() {
    const task = this._onClearAttachments();
    this.setAttachments([]);

    await task;
  }

  public async send() {
    const adapter = this.getAttachmentAdapter();
    const attachments =
      adapter && this.attachments.length > 0
        ? Promise.all(
            this.attachments.map(async (a) => {
              if (isAttachmentComplete(a)) return a;
              const result = await adapter.send(a);
              return result as CompleteAttachment;
            }),
          )
        : [];

    const text = this.text;
    this._emptyTextAndAttachments();
    const message: Omit<AppendMessage, "parentId" | "sourceId"> = {
      createdAt: new Date(),
      role: this.role,
      content: text ? [{ type: "text", text }] : [],
      attachments: await attachments,
      runConfig: this.runConfig,
      metadata: { custom: {} },
    };

    this.handleSend(message);
    this._notifyEventSubscribers("send");
  }

  public cancel() {
    this.handleCancel();
  }

  protected abstract handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
  ): void;
  protected abstract handleCancel(): void;

  async addAttachment(file: File) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const upsertAttachment = (a: PendingAttachment) => {
      const idx = this._attachments.findIndex(
        (attachment) => attachment.id === a.id,
      );
      if (idx !== -1)
        this._attachments = [
          ...this._attachments.slice(0, idx),
          a,
          ...this._attachments.slice(idx + 1),
        ];
      else {
        this._attachments = [...this._attachments, a];
      }

      this._notifySubscribers();
    };

    const promiseOrGenerator = adapter.add({ file });
    if (Symbol.asyncIterator in promiseOrGenerator) {
      for await (const r of promiseOrGenerator) {
        upsertAttachment(r);
      }
    } else {
      upsertAttachment(await promiseOrGenerator);
    }

    this._notifyEventSubscribers("attachment-add");
    this._notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await adapter.remove(attachment);

    // this._attachments.toSpliced(index, 1); - not yet widely supported
    this._attachments = [
      ...this._attachments.slice(0, index),
      ...this._attachments.slice(index + 1),
    ];
    this._notifySubscribers();
  }

  // Speech Recognition (Dictation) support
  private _listening: ListeningState | undefined;
  private _listeningSession: SpeechRecognitionAdapter.Session | undefined;
  private _listeningUnsubscribes: Unsubscribe[] = [];

  public get listening(): ListeningState | undefined {
    return this._listening;
  }

  public startListening(): void {
    const adapter = this.getSpeechRecognitionAdapter();
    if (!adapter) {
      throw new Error("Speech recognition adapter not configured");
    }

    // Stop any existing session
    if (this._listeningSession) {
      this.stopListening();
    }

    const session = adapter.listen();
    this._listeningSession = session;
    this._listening = { status: session.status };
    this._notifySubscribers();

    // Subscribe to speech events
    const unsubSpeech = session.onSpeech((result) => {
      // Check if this is a final (committed) result or interim (partial) result
      // Default to final=true for backwards compatibility
      const isFinal = result.isFinal !== false;

      if (isFinal) {
        // Final result: append to the actual text
        const currentText = this.text;
        const separator = currentText && !currentText.endsWith(" ") ? " " : "";
        this.setText(currentText + separator + result.transcript);

        // Clear the interim transcript since it's now committed
        if (this._listening) {
          const { transcript: _, ...rest } = this._listening;
          this._listening = rest;
          this._notifySubscribers();
        }
      } else {
        // Interim/partial result: update the preview transcript (don't append)
        if (this._listening) {
          this._listening = {
            ...this._listening,
            transcript: result.transcript,
          };
          this._notifySubscribers();
        }
      }
    });
    this._listeningUnsubscribes.push(unsubSpeech);

    // Subscribe to speech start
    const unsubStart = session.onSpeechStart(() => {
      const currentTranscript = this._listening?.transcript;
      this._listening = currentTranscript
        ? { status: { type: "running" }, transcript: currentTranscript }
        : { status: { type: "running" } };
      this._notifySubscribers();
    });
    this._listeningUnsubscribes.push(unsubStart);

    // Subscribe to speech end to detect when session ends
    const unsubEnd = session.onSpeechEnd(() => {
      // Session has ended
      this._cleanupListening();
    });
    this._listeningUnsubscribes.push(unsubEnd);

    // Also check for status changes (for error handling)
    const checkStatus = () => {
      if (session.status.type === "ended") {
        this._cleanupListening();
      }
    };

    // Poll status periodically as a fallback
    const statusInterval = setInterval(checkStatus, 100);
    this._listeningUnsubscribes.push(() => clearInterval(statusInterval));
  }

  public stopListening(): void {
    if (!this._listeningSession) {
      return;
    }

    // Stop the session - the onSpeechEnd callback will handle cleanup
    // Don't call _cleanupListening() here to avoid race condition where
    // we unsubscribe before the final transcript/end event is received
    this._listeningSession.stop().catch(() => {
      // If stop() fails, cleanup immediately
      this._cleanupListening();
    });
  }

  private _cleanupListening(): void {
    // Unsubscribe from all listeners
    for (const unsub of this._listeningUnsubscribes) {
      unsub();
    }
    this._listeningUnsubscribes = [];

    this._listeningSession = undefined;
    this._listening = undefined;
    this._notifySubscribers();
  }

  private _eventSubscribers = new Map<
    ComposerRuntimeEventType,
    Set<() => void>
  >();

  protected _notifyEventSubscribers(event: ComposerRuntimeEventType) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;

    for (const callback of subscribers) callback();
  }

  public unstable_on(event: ComposerRuntimeEventType, callback: () => void) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      this._eventSubscribers.set(event, new Set([callback]));
    } else {
      subscribers.add(callback);
    }

    return () => {
      const subscribers = this._eventSubscribers.get(event);
      if (!subscribers) return;
      subscribers.delete(callback);
    };
  }
}
