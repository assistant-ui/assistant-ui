import type {
  Attachment,
  CompleteAttachment,
  PendingAttachment,
  MessageRole,
  RunConfig,
  QuoteInfo,
  AppendMessage,
  Unsubscribe,
} from "../types";
import { BaseSubscribable } from "../subscribable";
import type { AttachmentAdapter } from "./adapters/attachment";
import type {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
  DictationState,
} from "./composer-runtime-core";
import type { DictationAdapter } from "./adapters/speech";

const isAttachmentComplete = (a: Attachment): a is CompleteAttachment =>
  a.status.type === "complete";

export abstract class BaseComposerRuntimeCore
  extends BaseSubscribable
  implements ComposerRuntimeCore
{
  public readonly isEditing = true;

  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected abstract getDictationAdapter(): DictationAdapter | undefined;

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

  private _quote: QuoteInfo | undefined = undefined;

  get quote() {
    return this._quote;
  }

  public setQuote(quote: QuoteInfo | undefined) {
    if (this._quote === quote) return;

    this._quote = quote;
    this._notifySubscribers();
  }

  public setText(value: string) {
    if (this._text === value) return;

    this._text = value;
    if (this._dictation) {
      this._dictationBaseText = value;
      this._currentInterimText = "";
      const { status, inputDisabled } = this._dictation;
      this._dictation = inputDisabled ? { status, inputDisabled } : { status };
    }
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
      Object.keys(this._runConfig).length === 0 &&
      this._quote === undefined
    ) {
      return;
    }

    this._role = "user";
    this._runConfig = {};
    this._quote = undefined;

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
    if (this._dictationSession) {
      this._dictationSession.cancel();
      this._cleanupDictation();
    }

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
    const quote = this._quote;
    this._quote = undefined;
    this._emptyTextAndAttachments();

    const message: Omit<AppendMessage, "parentId" | "sourceId"> = {
      createdAt: new Date(),
      role: this.role,
      content: text ? [{ type: "text", text }] : [],
      attachments: await attachments,
      runConfig: this.runConfig,
      metadata: { custom: { ...(quote ? { quote } : {}) } },
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

    this._notifyEventSubscribers("attachmentAdd");
    this._notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await adapter.remove(attachment);

    this._attachments = [
      ...this._attachments.slice(0, index),
      ...this._attachments.slice(index + 1),
    ];
    this._notifySubscribers();
  }

  private _dictation: DictationState | undefined;
  private _dictationSession: DictationAdapter.Session | undefined;
  private _dictationUnsubscribes: Unsubscribe[] = [];
  private _dictationBaseText = "";
  private _currentInterimText = "";
  private _dictationSessionIdCounter = 0;
  private _activeDictationSessionId: number | undefined;
  private _isCleaningDictation = false;

  public get dictation(): DictationState | undefined {
    return this._dictation;
  }

  private _isActiveSession(
    sessionId: number,
    session: DictationAdapter.Session,
  ): boolean {
    return (
      this._activeDictationSessionId === sessionId &&
      this._dictationSession === session
    );
  }

  public startDictation(): void {
    const adapter = this.getDictationAdapter();
    if (!adapter) {
      throw new Error("Dictation adapter not configured");
    }

    if (this._dictationSession) {
      for (const unsub of this._dictationUnsubscribes) {
        unsub();
      }
      this._dictationUnsubscribes = [];
      const oldSession = this._dictationSession;
      oldSession.stop().catch(() => {});
      this._dictationSession = undefined;
    }

    const inputDisabled = adapter.disableInputDuringDictation ?? false;

    this._dictationBaseText = this._text;
    this._currentInterimText = "";

    const session = adapter.listen();
    this._dictationSession = session;
    const sessionId = ++this._dictationSessionIdCounter;
    this._activeDictationSessionId = sessionId;
    this._dictation = { status: session.status, inputDisabled };
    this._notifySubscribers();

    const unsubSpeech = session.onSpeech((result) => {
      if (!this._isActiveSession(sessionId, session)) return;
      const isFinal = result.isFinal !== false;

      const needsSeparator =
        this._dictationBaseText &&
        !this._dictationBaseText.endsWith(" ") &&
        result.transcript;
      const separator = needsSeparator ? " " : "";

      if (isFinal) {
        this._dictationBaseText =
          this._dictationBaseText + separator + result.transcript;
        this._currentInterimText = "";
        this._text = this._dictationBaseText;

        if (this._dictation) {
          const { transcript: _, ...rest } = this._dictation;
          this._dictation = rest;
        }
        this._notifySubscribers();
      } else {
        this._currentInterimText = separator + result.transcript;
        this._text = this._dictationBaseText + this._currentInterimText;

        if (this._dictation) {
          this._dictation = {
            ...this._dictation,
            transcript: result.transcript,
          };
        }
        this._notifySubscribers();
      }
    });
    this._dictationUnsubscribes.push(unsubSpeech);

    const unsubStart = session.onSpeechStart(() => {
      if (!this._isActiveSession(sessionId, session)) return;

      this._dictation = {
        status: { type: "running" },
        inputDisabled,
        ...(this._dictation?.transcript && {
          transcript: this._dictation.transcript,
        }),
      };
      this._notifySubscribers();
    });
    this._dictationUnsubscribes.push(unsubStart);

    const unsubEnd = session.onSpeechEnd(() => {
      this._cleanupDictation({ sessionId });
    });
    this._dictationUnsubscribes.push(unsubEnd);

    const statusInterval = setInterval(() => {
      if (!this._isActiveSession(sessionId, session)) return;

      if (session.status.type === "ended") {
        this._cleanupDictation({ sessionId });
      }
    }, 100);
    this._dictationUnsubscribes.push(() => clearInterval(statusInterval));
  }

  public stopDictation(): void {
    if (!this._dictationSession) return;

    const session = this._dictationSession;
    const sessionId = this._activeDictationSessionId;
    session.stop().finally(() => {
      this._cleanupDictation({ sessionId });
    });
  }

  private _cleanupDictation(options?: { sessionId: number | undefined }): void {
    const isStaleSession =
      options?.sessionId !== undefined &&
      options.sessionId !== this._activeDictationSessionId;
    if (isStaleSession || this._isCleaningDictation) return;

    this._isCleaningDictation = true;
    try {
      for (const unsub of this._dictationUnsubscribes) {
        unsub();
      }
      this._dictationUnsubscribes = [];
      this._dictationSession = undefined;
      this._activeDictationSessionId = undefined;
      this._dictation = undefined;
      this._dictationBaseText = "";
      this._currentInterimText = "";
      this._notifySubscribers();
    } finally {
      this._isCleaningDictation = false;
    }
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
