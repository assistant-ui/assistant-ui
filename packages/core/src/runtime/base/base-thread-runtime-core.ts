import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { ModelContextProvider } from "../../model-context/types";
import { getThreadMessageText } from "../../utils/text";
import { generateId } from "../../utils/id";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../utils/message-repository";
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
  public abstract unstable_notifySessionReset(): void;

  protected _voiceMessages: ThreadMessage[] = [];
  protected _voiceGeneration = 0;
  private _cachedMergedMessages: readonly ThreadMessage[] | null = null;
  private _cachedVoiceGeneration = -1;
  private _cachedMergedBase: readonly ThreadMessage[] | null = null;

  protected _markVoiceMessagesDirty() {
    this._voiceGeneration++;
    this._cachedMergedMessages = null;
  }

  protected _getBaseMessages(): readonly ThreadMessage[] {
    return this.repository.getMessages();
  }

  protected _commitVoiceMessage(_message: ThreadMessage): void {}

  public get messages(): readonly ThreadMessage[] {
    if (this._voiceMessages.length === 0) {
      return this._getBaseMessages();
    }
    const base = this._getBaseMessages();
    if (
      this._cachedVoiceGeneration !== this._voiceGeneration ||
      this._cachedMergedBase !== base
    ) {
      const baseMessageIds = new Set(base.map((message) => message.id));
      this._cachedMergedMessages = [
        ...base,
        ...this._voiceMessages.filter(
          (message) => !baseMessageIds.has(message.id),
        ),
      ];
      this._cachedVoiceGeneration = this._voiceGeneration;
      this._cachedMergedBase = base;
    }
    return this._cachedMergedMessages!;
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
  protected _isVoiceMessage(messageId: string | null) {
    return (
      messageId !== null && this._voiceMessages.some((m) => m.id === messageId)
    );
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

  public submitFeedback({ messageId, type }: SubmitFeedbackOptions) {
    const adapter = this.adapters?.feedback;
    if (!adapter) throw new Error("Feedback adapter not configured");

    const entry = this.getMessageById(messageId);
    if (!entry) throw new Error(`Message not found: ${messageId}`);
    const { message, parentId } = entry;
    adapter.submit({ message, type });

    if (message.role === "assistant") {
      const updatedMessage: ThreadMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          submittedFeedback: { type },
        },
      };
      const voiceIdx = this._voiceMessages.findIndex(
        (voiceMessage) => voiceMessage.id === messageId,
      );
      if (voiceIdx === -1) {
        this.repository.addOrUpdateMessage(parentId, updatedMessage);
      } else {
        this._voiceMessages[voiceIdx] = updatedMessage;
        if (this._currentAssistantMsg === message) {
          this._currentAssistantMsg = updatedMessage as ThreadAssistantMessage;
        }
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

  private _voiceSession: RealtimeVoiceAdapter.Session | undefined;
  private _voiceUnsubs: Array<() => void> = [];
  public voice: VoiceSessionState | undefined;

  private _voiceVolume = 0;
  private _voiceVolumeSubscribers = new Set<() => void>();

  public getVoiceVolume = () => this._voiceVolume;

  public subscribeVoiceVolume = (callback: () => void): Unsubscribe => {
    this._voiceVolumeSubscribers.add(callback);
    return () => this._voiceVolumeSubscribers.delete(callback);
  };

  protected _onVoiceConnected(): void {}

  protected _onVoiceDisconnected(): void {}

  public connectVoice() {
    const adapter = this.adapters?.voice;
    if (!adapter) throw new Error("Voice adapter not configured");
    const replacing = this._voiceSession !== undefined;

    try {
      this._disconnectVoice(false);
    } catch (error) {
      console.error(
        "[assistant-ui] Voice cleanup threw before reconnect",
        error,
      );
    }

    let session: RealtimeVoiceAdapter.Session;
    try {
      session = adapter.connect({});
    } catch (error) {
      if (replacing && this._voiceSession === undefined)
        this._onVoiceDisconnected();
      throw error;
    }
    this._voiceSession = session;
    const unsubs: Array<() => void> = [];
    this._voiceUnsubs = unsubs;

    // The cleanup-list identity preserves ownership after an ended status clears the session.
    const finishDetachedSetup = () => {
      if (this._voiceSession === session && this._voiceUnsubs === unsubs) {
        return false;
      }

      try {
        notifySubscribers(unsubs.splice(0));
      } catch (error) {
        console.error(
          "[assistant-ui] Detached voice setup cleanup threw",
          error,
        );
      }
      return true;
    };

    try {
      let currentMode: RealtimeVoiceAdapter.Mode = "listening";

      this.voice = {
        status: session.status,
        isMuted: session.isMuted,
        mode: currentMode,
      };
      this._voiceVolume = 0;
      this._notifySubscribers();
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onStatusChange((status) => {
          if (status.type === "ended") {
            this._finishVoiceAssistantMessage();
            const wasConnected = this._voiceSession === session;
            if (wasConnected) this._voiceSession = undefined;
            this.voice = undefined;
            if (wasConnected) this._onVoiceDisconnected();
          } else {
            this.voice = {
              status,
              isMuted: session.isMuted,
              mode: currentMode,
            };
          }
          this._notifySubscribers();
        }),
      );
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onModeChange((mode) => {
          currentMode = mode;
          if (this.voice) {
            this.voice = { ...this.voice, mode };
            this._notifySubscribers();
          }
        }),
      );
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onVolumeChange((volume) => {
          this._voiceVolume = volume;
          notifyEventListeners(
            this._voiceVolumeSubscribers,
            undefined,
            "Voice volume",
          );
        }),
      );
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onTranscript((transcript) => {
          this._handleVoiceTranscript(transcript);
        }),
      );
      if (!finishDetachedSetup() && !replacing) this._onVoiceConnected();
    } catch (error) {
      if (this._voiceSession === session && this._voiceUnsubs === unsubs) {
        try {
          this._disconnectVoice(false);
        } catch (cleanupError) {
          console.error(
            "[assistant-ui] Voice rollback cleanup threw",
            cleanupError,
          );
        }
        if (replacing && this._voiceSession === undefined)
          this._onVoiceDisconnected();
      } else {
        finishDetachedSetup();
      }
      throw error;
    }
  }

  private _currentAssistantMsg: ThreadAssistantMessage | null = null;

  private _handleVoiceTranscript(
    transcript: RealtimeVoiceAdapter.TranscriptItem,
  ) {
    this.ensureInitialized();

    if (transcript.role === "user") {
      this._finishVoiceAssistantMessage();
      this._currentAssistantMsg = null;

      if (transcript.isFinal) {
        const message: ThreadMessage = {
          id: generateId(),
          role: "user",
          content: [{ type: "text", text: transcript.text }],
          metadata: { modality: "voice", custom: {} },
          createdAt: new Date(),
          status: { type: "complete", reason: "unknown" },
          attachments: [],
        };
        this._voiceMessages.push(message);
        this._commitVoiceMessage(message);
        this._markVoiceMessagesDirty();
        this._notifySubscribers();
      }
    } else {
      const status: ThreadAssistantMessage["status"] = transcript.isFinal
        ? { type: "complete", reason: "stop" }
        : { type: "running" };

      if (!this._currentAssistantMsg) {
        this._currentAssistantMsg = {
          id: generateId(),
          role: "assistant",
          content: [{ type: "text", text: transcript.text }],
          metadata: {
            unstable_state: this.state,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            modality: "voice",
            custom: {},
          },
          status,
          createdAt: new Date(),
        };
        this._voiceMessages.push(this._currentAssistantMsg);
      } else {
        const idx = this._voiceMessages.indexOf(this._currentAssistantMsg);
        if (idx === -1) return;
        const updated: ThreadAssistantMessage = {
          ...this._currentAssistantMsg,
          content: [{ type: "text", text: transcript.text }],
          status,
        };
        this._voiceMessages[idx] = updated;
        this._currentAssistantMsg = updated;
      }

      if (transcript.isFinal) {
        this._commitVoiceMessage(this._currentAssistantMsg);
        this._currentAssistantMsg = null;
      }

      this._markVoiceMessagesDirty();
      this._notifySubscribers();
    }
  }

  private _finishVoiceAssistantMessage(notify = true) {
    const last = this._voiceMessages.at(-1);
    if (last?.role === "assistant" && last.status.type === "running") {
      const idx = this._voiceMessages.length - 1;
      this._voiceMessages[idx] = {
        ...(last as ThreadAssistantMessage),
        status: { type: "complete", reason: "stop" },
      };
      this._commitVoiceMessage(this._voiceMessages[idx]!);
      this._currentAssistantMsg = null;
      this._markVoiceMessagesDirty();
      if (notify) this._notifySubscribers();
    }
  }

  public disconnectVoice() {
    this._disconnectVoice(true);
  }

  private _disconnectVoice(fireHook: boolean) {
    this._finishVoiceAssistantMessage(false);
    this._currentAssistantMsg = null;
    // Drain the shared list in place so reentrant setup cannot release the same handles again.
    const unsubs = this._voiceUnsubs.splice(0);
    this._voiceUnsubs = [];
    const session = this._voiceSession;
    this._voiceSession = undefined;
    this.voice = undefined;
    this._voiceVolume = 0;
    const stopSpeaking =
      this.speech && this._isVoiceMessage(this.speech.messageId)
        ? this._stopSpeaking
        : undefined;
    this._voiceMessages = [];
    this._markVoiceMessagesDirty();

    try {
      notifySubscribers([
        ...unsubs,
        ...(stopSpeaking ? [stopSpeaking] : []),
        ...(session ? [() => session.disconnect()] : []),
        () =>
          notifyEventListeners(
            this._voiceVolumeSubscribers,
            undefined,
            "Voice volume",
          ),
        () => this._notifySubscribers(),
      ]);
    } finally {
      if (fireHook && session && this._voiceSession === undefined)
        this._onVoiceDisconnected();
    }
  }

  public muteVoice() {
    if (!this._voiceSession) throw new Error("No active voice session");
    this._voiceSession.mute();
    this.voice = {
      ...this.voice!,
      isMuted: true,
    };
    this._notifySubscribers();
  }

  public unmuteVoice() {
    if (!this._voiceSession) throw new Error("No active voice session");
    this._voiceSession.unmute();
    this.voice = {
      ...this.voice!,
      isMuted: false,
    };
    this._notifySubscribers();
  }

  protected ensureInitialized() {
    if (!this._isInitialized) {
      this._isInitialized = true;
      this._notifyEventSubscribers("initialize", {});
    }
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
