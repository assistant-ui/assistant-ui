import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { ModelContextProvider } from "../../model-context/types";
import { getThreadMessageText } from "../../utils/text";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../utils/message-repository";
import {
  captureThreadRuntimeDisposal,
  captureThreadRuntimeGeneration,
} from "../utils/thread-runtime-lifecycle";
import { DefaultThreadComposerRuntimeCore } from "./default-thread-composer-runtime-core";
import type {
  AddToolResultOptions,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  ThreadSuggestion,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
  SpeechState,
  VoiceSessionState,
  RuntimeCapabilities,
  ThreadRuntimeEventCallback,
  ThreadRuntimeEventPayload,
  ThreadRuntimeEventType,
  StartRunConfig,
  ResumeRunConfig,
} from "../interfaces/thread-runtime-core";
import { DefaultEditComposerRuntimeCore } from "./default-edit-composer-runtime-core";
import type { SpeechSynthesisAdapter } from "../../adapters/speech";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import { VoiceSessionController } from "./voice-session";
import type { ThreadMessageLike } from "../utils/thread-message-like";
import { notifyEventListeners } from "../../utils/notify-event-listeners";
import { gateInteractableComposerMetadata } from "../../model-context/interactable-composer-metadata";
import {
  BaseSubscribable,
  notifySubscribers,
} from "../../subscribable/subscribable";

type BaseThreadAdapters = {
  speech?: SpeechSynthesisAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
  voice?: RealtimeVoiceAdapter | undefined;
};

export abstract class BaseThreadRuntimeCore
  extends BaseSubscribable
  implements ThreadRuntimeCore
{
  private _isInitialized = false;

  protected repository = new MessageRepository();
  public abstract get adapters(): BaseThreadAdapters | undefined;
  public abstract get isDisabled(): boolean;
  public abstract get isSendDisabled(): boolean;
  public abstract get isLoading(): boolean;
  public abstract get suggestions(): readonly ThreadSuggestion[];
  public abstract get extras(): unknown;

  public abstract get capabilities(): RuntimeCapabilities;
  public abstract append(message: AppendMessage): void;
  public abstract deleteMessage(messageId: string): void | Promise<void>;
  public abstract startRun(config: StartRunConfig): void;
  public abstract resumeRun(config: ResumeRunConfig): void;
  public abstract addToolResult(options: AddToolResultOptions): void;
  public abstract resumeToolCall(options: ResumeToolCallOptions): void;
  public abstract respondToToolApproval(
    options: RespondToToolApprovalOptions,
  ): Promise<void>;
  public abstract cancelRun(): void;
  public abstract exportExternalState(): any;
  public abstract importExternalState(state: any): void;
  /** @deprecated Experimental since 2026-08-14. Not scheduled for removal; the API may change in any release. */
  public abstract unstable_notifySessionReset(): void;

  private readonly _voiceController: VoiceSessionController =
    new VoiceSessionController({
      adapter: () => this.adapters?.voice,
      isRunning: () => (this as ThreadRuntimeCore).isRunning === true,
      isRunActive: () => this._isRunActive(),
      isLoading: () => this.isLoading,
      getBaseMessages: () => this._getBaseMessages(),
      messages: () => this.messages,
      state: () => this.state,
      notify: () => this._notifySubscribers(),
      subscribe: (callback) => this.subscribe(callback),
      captureGeneration: () => captureThreadRuntimeGeneration(this),
      ensureInitialized: () => this.ensureInitialized(),
      commitVoiceMessage: (message) => this._commitVoiceMessage(message),
      markVoiceMessagesDirty: () => this._markVoiceMessagesDirty(),
      onConnected: () => this._onVoiceConnected(),
      onDisconnected: () => this._onVoiceDisconnected(),
      enrichAppendMetadata: (message) => this.enrichAppendMetadata(message),
      resolveAppendParent: (parentId) => this._resolveAppendParent(parentId),
      stopSpeakingForVoiceMessage: () =>
        this.speech && this._isVoiceMessage(this.speech.messageId)
          ? this._stopSpeaking
          : undefined,
    });

  protected get _voiceMessages(): ThreadMessage[] {
    return this._voiceController.voiceMessages;
  }

  protected set _voiceMessages(messages: ThreadMessage[]) {
    this._voiceController.voiceMessages = messages;
  }

  protected get _voiceGeneration(): number {
    return this._voiceController.voiceGeneration;
  }

  protected set _voiceGeneration(generation: number) {
    this._voiceController.voiceGeneration = generation;
  }

  protected _markVoiceMessagesDirty(): void {
    this._voiceController.markMessagesDirty();
  }

  protected _getBaseMessages(): readonly ThreadMessage[] {
    return this.repository.getMessages();
  }

  protected _commitVoiceMessage(
    _message: ThreadMessage,
  ): void | Promise<void> {}

  protected _onMessageMetadataChanged(
    _previousMessage: ThreadAssistantMessage,
    _message: ThreadAssistantMessage,
  ): void {}

  protected _dropVoiceMessage(messageId: string, notify: boolean): void {
    this._voiceController.dropMessage(messageId, notify);
  }

  public get messages(): readonly ThreadMessage[] {
    return this._voiceController.getMessages();
  }

  public get state() {
    let mostRecentAssistantMessage: (typeof this.messages)[number] | undefined;
    for (const message of this.messages) {
      if (message.role === "assistant") {
        mostRecentAssistantMessage = message;
      }
    }

    return mostRecentAssistantMessage?.metadata.unstable_state ?? null;
  }

  public readonly composer = new DefaultThreadComposerRuntimeCore(this);

  private readonly _contextProvider: ModelContextProvider;

  constructor(_contextProvider: ModelContextProvider) {
    super();
    this._contextProvider = _contextProvider;
    captureThreadRuntimeDisposal(this).addEventListener("abort", () => {
      this.composer.__internal_dispose();
      for (const composer of this._editComposers.values())
        composer.__internal_dispose();
    });
  }

  public getModelContext() {
    return this._contextProvider.getModelContext();
  }

  /**
   * Stamps provider-contributed composer metadata onto an outgoing message.
   * Called at dispatch rather than in the composer, so programmatic sends are
   * covered too, and exactly once per message: a queued send is stamped when
   * it leaves the lane, never when it enters.
   *
   * Only user messages are stamped, matching the readers: both the version
   * fold and the model injection skip every other role.
   *
   * @param anchorId Message the gated branch prefix ends at. A queued send
   * passes the current tail, having waited through a run that grew the prefix
   * past the parent it was created with.
   */
  protected enrichAppendMetadata(
    message: AppendMessage,
    anchorId: string | null = message.parentId,
  ): AppendMessage {
    if (message.role !== "user") return message;
    const messages = this.messages;
    const parentIndex =
      anchorId === null ? -1 : messages.findIndex((m) => m.id === anchorId);
    const composerMetadata = gateInteractableComposerMetadata(
      this.getModelContext().unstable_composerMetadata,
      messages.slice(0, parentIndex + 1),
    );
    if (!composerMetadata) return message;
    return {
      ...message,
      metadata: {
        ...message.metadata,
        custom: { ...message.metadata?.custom, ...composerMetadata },
      },
    };
  }

  private _editComposers = new Map<string, DefaultEditComposerRuntimeCore>();
  public getEditComposer(messageId: string) {
    return this._editComposers.get(messageId);
  }

  public __internal_getEditComposers(): Iterable<DefaultEditComposerRuntimeCore> {
    return this._editComposers.values();
  }
  protected _isVoiceMessage(messageId: string | null): boolean {
    return this._voiceController.isVoiceMessage(messageId);
  }

  protected _resolveAppendParent(parentId: string | null): string | null {
    return this._isVoiceMessage(parentId)
      ? (this._getBaseMessages().at(-1)?.id ?? null)
      : parentId;
  }

  public beginEdit(messageId: string) {
    if (this.voice)
      throw new Error(
        "Cannot edit a message while a voice session is connected",
      );
    if (this._isVoiceMessage(messageId)) {
      throw new Error("Voice transcript messages cannot be edited");
    }
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
    this._notifySubscribers();
  }

  public getMessageById(messageId: string) {
    try {
      return this.repository.getMessage(messageId);
    } catch {
      // Check voice messages
      const baseMessages = this.repository.getMessages();
      const voiceIdx = this._voiceMessages.findIndex((m) => m.id === messageId);
      if (voiceIdx !== -1) {
        const parentId =
          voiceIdx > 0
            ? this._voiceMessages[voiceIdx - 1]!.id
            : (baseMessages.at(-1)?.id ?? null);
        return {
          parentId,
          message: this._voiceMessages[voiceIdx]!,
          index: baseMessages.length + voiceIdx,
        };
      }
      return undefined;
    }
  }

  public getBranches(messageId: string): string[] {
    if (this._voiceMessages.some((m) => m.id === messageId)) {
      return [];
    }
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this._notifySubscribers();
  }

  public _notifyEventSubscribers<E extends ThreadRuntimeEventType>(
    event: E,
    payload: ThreadRuntimeEventPayload[E],
  ) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;

    notifyEventListeners(subscribers, payload, `Thread runtime "${event}"`);
  }

  protected _notifyToolApprovalAnswered(
    messageId: string,
    toolCallId: string,
    toolName: string,
    approved: boolean,
  ) {
    this._notifyEventSubscribers("toolApprovalAnswered", {
      messageId,
      toolCallId,
      toolName,
      approved,
    });
  }

  public submitFeedback({ messageId, type, comment }: SubmitFeedbackOptions) {
    const adapter = this.adapters?.feedback;
    const entry = this.getMessageById(messageId);
    if (!entry) throw new Error(`Message not found: ${messageId}`);
    const { message, parentId } = entry;
    const trimmed = comment?.trim();
    const feedback = { type, ...(trimmed ? { comment: trimmed } : undefined) };
    adapter?.submit({ message, ...feedback });

    if (message.role === "assistant") {
      const updatedMessage: ThreadAssistantMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          submittedFeedback: feedback,
        },
      };
      const voiceIdx = this._voiceMessages.findIndex(
        (voiceMessage) => voiceMessage.id === messageId,
      );
      if (voiceIdx === -1) {
        this.repository.addOrUpdateMessage(parentId, updatedMessage);
        this._onMessageMetadataChanged(message, updatedMessage);
      } else {
        this._voiceMessages[voiceIdx] = updatedMessage;
        this._voiceController.replaceAssistantMessage(message, updatedMessage);
        this._markVoiceMessagesDirty();
      }
    }

    this._notifySubscribers();
  }

  private _stopSpeaking: Unsubscribe | undefined;
  public speech: SpeechState | undefined;

  public speak(messageId: string) {
    const adapter = this.adapters?.speech;
    if (!adapter) throw new Error("Speech adapter not configured");

    const entry = this.getMessageById(messageId);
    if (!entry) throw new Error(`Message not found: ${messageId}`);
    const { message } = entry;

    const previousStop = this._stopSpeaking;
    let utterance: SpeechSynthesisAdapter.Utterance;
    try {
      previousStop?.();
      utterance = adapter.speak(getThreadMessageText(message));
    } catch (error) {
      if (previousStop && !this._stopSpeaking) {
        try {
          this._notifySubscribers();
        } catch (notificationError) {
          console.error(
            "[assistant-ui] Speech rollback notification threw",
            notificationError,
          );
        }
      }
      throw error;
    }
    let unsub: Unsubscribe | undefined;
    const clear = () => {
      this._stopSpeaking = undefined;
      this.speech = undefined;
      const cleanup = unsub;
      unsub = undefined;
      cleanup?.();
    };
    const stop = () => {
      if (this._stopSpeaking !== stop) return;
      try {
        clear();
      } finally {
        utterance.cancel();
      }
    };
    const update = () => {
      if (this._stopSpeaking !== stop) return;
      if (utterance.status.type === "ended") {
        notifySubscribers([clear, () => this._notifySubscribers()]);
      } else {
        this.speech = { messageId, status: utterance.status };
        this._notifySubscribers();
      }
    };

    this._stopSpeaking = stop;
    try {
      unsub = utterance.subscribe(update);
      if (this._stopSpeaking !== stop) {
        unsub();
        return;
      }
      update();
    } catch (error) {
      if (this._stopSpeaking === stop) {
        try {
          notifySubscribers([stop, () => this._notifySubscribers()]);
        } catch (cleanupError) {
          console.error(
            "[assistant-ui] Speech rollback cleanup threw",
            cleanupError,
          );
        }
      }
      throw error;
    }
  }

  public stopSpeaking() {
    if (!this._stopSpeaking) throw new Error("No message is being spoken");
    notifySubscribers([this._stopSpeaking, () => this._notifySubscribers()]);
  }

  public get voice(): VoiceSessionState | undefined {
    return this._voiceController.voice;
  }

  public set voice(value: VoiceSessionState | undefined) {
    this._voiceController.voice = value;
  }

  public getVoiceVolume = (): number => this._voiceController.getVoiceVolume();

  public subscribeVoiceVolume = (callback: () => void): Unsubscribe =>
    this._voiceController.subscribeVoiceVolume(callback);

  protected _onVoiceConnected(): void {}

  protected _onVoiceDisconnected(): void {}

  protected _isRunActive(): boolean {
    return this._voiceController.isRunActive();
  }

  protected _getVoiceCommitBarrier(): Promise<void> | undefined {
    return this._voiceController.getVoiceCommitBarrier();
  }

  public connectVoice(): void {
    this._voiceController.connectVoice();
  }

  protected async _appendToVoiceSession(message: AppendMessage): Promise<void> {
    return this._voiceController.appendToVoiceSession(message);
  }

  public disconnectVoice(): void {
    this._voiceController.disconnectVoice();
  }

  public muteVoice(): void {
    this._voiceController.muteVoice();
  }

  public unmuteVoice(): void {
    this._voiceController.unmuteVoice();
  }

  protected ensureInitialized() {
    if (this._isInitialized) return false;
    this._isInitialized = true;
    this._notifyEventSubscribers("initialize", {});
    return true;
  }

  public export() {
    return this.repository.export();
  }

  public import(data: ExportedMessageRepository) {
    this.ensureInitialized();
    this.repository.clear();
    this.repository.import(data);
    this._notifySubscribers();
  }

  public reset(initialMessages?: readonly ThreadMessageLike[]) {
    this.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
  }

  private _eventSubscribers = new Map<
    ThreadRuntimeEventType,
    Set<(payload?: unknown) => void>
  >();

  /** @deprecated Experimental since 2024-10-12. Not scheduled for removal; the API may change in any release. */
  public unstable_on<E extends ThreadRuntimeEventType>(
    event: E,
    callback: ThreadRuntimeEventCallback<E>,
  ) {
    const wrapped = callback as (payload?: unknown) => void;
    if (event === "modelContextUpdate") {
      // provider.subscribe is `() => void`; pump the typed empty payload to the user callback.
      return (
        this._contextProvider.subscribe?.(() =>
          notifyEventListeners([wrapped], {}, `Thread runtime "${event}"`),
        ) ?? (() => {})
      );
    }

    let subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      subscribers = new Set();
      this._eventSubscribers.set(event, subscribers);
    }
    subscribers.add(wrapped);

    // `initialize` latches: replay it (deferred) to subscribers that attach
    // after the thread already initialized, mirroring a BehaviorSubject.
    if (event === "initialize" && this._isInitialized) {
      queueMicrotask(() => {
        if (subscribers.has(wrapped)) {
          notifyEventListeners([wrapped], {}, `Thread runtime "${event}"`);
        }
      });
    }

    return () => {
      this._eventSubscribers.get(event)?.delete(wrapped);
    };
  }
}
