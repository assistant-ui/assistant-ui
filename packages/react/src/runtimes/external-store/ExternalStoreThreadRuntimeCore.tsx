import { AddToolResultOptions, ThreadSuggestion } from "../core";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../utils/MessageRepository";
import {
  AppendMessage,
  ModelConfigProvider,
  ThreadMessage,
  Unsubscribe,
} from "../../types";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import {
  getExternalStoreMessage,
  symbolInnerMessage,
} from "./getExternalStoreMessage";
import { ThreadMessageConverter } from "./ThreadMessageConverter";
import { getAutoStatus, isAutoStatus } from "./auto-status";
import { fromThreadMessageLike } from "./ThreadMessageLike";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { generateId } from "../../internal";
import { DefaultThreadComposerRuntimeCore } from "../composer/DefaultThreadComposerRuntimeCore";
import {
  RuntimeCapabilities,
  SpeechState,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
} from "../core/ThreadRuntimeCore";
import { DefaultEditComposerRuntimeCore } from "../composer/DefaultEditComposerRuntimeCore";

const EMPTY_ARRAY = Object.freeze([]);

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class ExternalStoreThreadRuntimeCore implements ThreadRuntimeCore {
  private _subscriptions = new Set<() => void>();
  private repository = new MessageRepository();
  private assistantOptimisticId: string | null = null;

  private _capabilities: RuntimeCapabilities = {
    switchToBranch: false,
    edit: false,
    reload: false,
    cancel: false,
    unstable_copy: false,
    speak: false,
    attachments: false,
    feedback: false,
  };

  public get capabilities() {
    return this._capabilities;
  }

  public threadId!: string;
  public messages!: ThreadMessage[];
  public isDisabled!: boolean;

  public suggestions: readonly ThreadSuggestion[] = [];
  public extras: unknown = undefined;

  private _converter = new ThreadMessageConverter();

  private _store!: ExternalStoreAdapter<any>;

  public readonly composer = new DefaultThreadComposerRuntimeCore(this);
  private _editComposers = new Map<string, DefaultEditComposerRuntimeCore>();
  public getEditComposer(messageId: string) {
    return this._editComposers.get(messageId);
  }
  public beginEdit(messageId: string) {
    if (this._editComposers.has(messageId))
      throw new Error("Edit already in progress");

    this._editComposers.set(
      messageId,
      new DefaultEditComposerRuntimeCore(
        this,
        () => this._editComposers.delete(messageId),
        this.repository.getMessage(messageId),
      ),
    );
    this.notifySubscribers();
  }

  constructor(
    private configProvider: ModelConfigProvider,
    store: ExternalStoreAdapter<any>,
  ) {
    this.store = store;
  }

  public get store() {
    return this._store;
  }

  public set store(store: ExternalStoreAdapter<any>) {
    if (this._store === store) return;

    this.threadId = store.threadId ?? this.threadId ?? generateId();
    const isRunning = store.isRunning ?? false;
    this.isDisabled = store.isDisabled ?? false;

    const oldStore = this._store as ExternalStoreAdapter<any> | undefined;
    this._store = store;
    this.extras = store.extras;
    this.suggestions = store.suggestions ?? EMPTY_ARRAY;
    this._capabilities = {
      switchToBranch: this._store.setMessages !== undefined,
      edit: this._store.onEdit !== undefined,
      reload: this._store.onReload !== undefined,
      cancel: this._store.onCancel !== undefined,
      speak: this._store.onSpeak !== undefined,
      unstable_copy: this._store.unstable_capabilities?.copy !== false, // default true
      attachments: !!this.store.adapters?.attachments,
      feedback: !!this.store.adapters?.feedback,
    };

    this.composer.setAttachmentAdapter(this._store.adapters?.attachments);

    if (oldStore) {
      // flush the converter cache when the convertMessage prop changes
      if (oldStore.convertMessage !== store.convertMessage) {
        this._converter = new ThreadMessageConverter();
      } else if (
        oldStore.isRunning === store.isRunning &&
        oldStore.messages === store.messages
      ) {
        this.notifySubscribers();
        // no conversion update
        return;
      }
    }

    const messages = !store.convertMessage
      ? store.messages
      : this._converter.convertMessages(store.messages, (cache, m, idx) => {
          if (!store.convertMessage) return m;

          const isLast = idx === store.messages.length - 1;
          const autoStatus = getAutoStatus(isLast, isRunning);

          if (
            cache &&
            (cache.role !== "assistant" ||
              !isAutoStatus(cache.status) ||
              cache.status === autoStatus)
          )
            return cache;

          const newMessage = fromThreadMessageLike(
            store.convertMessage(m, idx),
            idx.toString(),
            autoStatus,
          );
          (newMessage as any)[symbolInnerMessage] = m;
          return newMessage;
        });

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]!;
      const parent = messages[i - 1];
      this.repository.addOrUpdateMessage(parent?.id ?? null, message);
    }

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId);
      this.assistantOptimisticId = null;
    }

    if (hasUpcomingMessage(isRunning, messages)) {
      this.assistantOptimisticId = this.repository.appendOptimisticMessage(
        messages.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [],
        },
      );
    }

    this.repository.resetHead(
      this.assistantOptimisticId ?? messages.at(-1)?.id ?? null,
    );

    this.messages = this.repository.getMessages();
    this.notifySubscribers();
  }

  public getModelConfig() {
    return this.configProvider.getModelConfig();
  }

  private notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    if (!this._store.setMessages)
      throw new Error("Runtime does not support switching branches.");

    this.repository.switchToBranch(branchId);
    this.updateMessages(this.repository.getMessages());
  }

  public async append(message: AppendMessage): Promise<void> {
    if (message.parentId !== (this.messages.at(-1)?.id ?? null)) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }

  public async startRun(parentId: string | null): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    await this._store.onReload(parentId);
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    this._store.onCancel();

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId);
      this.assistantOptimisticId = null;
    }

    let messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    if (
      previousMessage?.role === "user" &&
      previousMessage.id === messages.at(-1)?.id // ensure the previous message is a leaf node
    ) {
      this.repository.deleteMessage(previousMessage.id);
      if (!this.composer.text.trim()) {
        this.composer.setText(getThreadMessageText(previousMessage));
      }

      messages = this.repository.getMessages();
    } else {
      this.notifySubscribers();
    }

    // resync messages (for reloading, to restore the previous branch)
    setTimeout(() => {
      this.updateMessages(messages);
    }, 0);
  }

  public addToolResult(options: AddToolResultOptions) {
    if (!this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult(options);
  }

  // TODO speech runtime?
  private _stopSpeaking: Unsubscribe | undefined;
  public speech: SpeechState | null = null;

  public speak(messageId: string) {
    let adapter = this.store.adapters?.speech;
    if (!adapter && this.store.onSpeak) {
      adapter = { speak: this.store.onSpeak };
    }
    if (!adapter) throw new Error("Speech adapter not configured");

    const { message } = this.repository.getMessage(messageId);

    this._stopSpeaking?.();

    const utterance = adapter.speak(message);
    const unsub = utterance.subscribe(() => {
      if (utterance.status.type === "ended") {
        this._stopSpeaking = undefined;
        this.speech = null;
      } else {
        this.speech = { messageId, status: utterance.status };
      }
      this.notifySubscribers();
    });

    this.speech = { messageId, status: utterance.status };
    this._stopSpeaking = () => {
      utterance.cancel();
      unsub();
      this.speech = null;
      this._stopSpeaking = undefined;
    };
  }

  public stopSpeaking() {
    if (!this._stopSpeaking) throw new Error("No message is being spoken");
    this._stopSpeaking();
  }

  public submitFeedback({ messageId, type }: SubmitFeedbackOptions) {
    const adapter = this._store.adapters?.feedback;
    if (!adapter) throw new Error("Feedback adapter not configured");

    const { message } = this.repository.getMessage(messageId);
    adapter.submit({ message, type });
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private updateMessages = (messages: ThreadMessage[]) => {
    this._store.setMessages?.(
      messages.flatMap(getExternalStoreMessage).filter((m) => m != null),
    );
  };

  public import(repository: ExportedMessageRepository) {
    this.repository.import(repository);
  }

  public export(): ExportedMessageRepository {
    return this.repository.export();
  }
}
