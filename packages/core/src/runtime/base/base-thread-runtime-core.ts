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
  ThreadSuggestion,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
  SpeechState,
  VoiceSessionState,
  RuntimeCapabilities,
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

type BaseThreadAdapters = {
  speech?: SpeechSynthesisAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
  voice?: RealtimeVoiceAdapter | undefined;
};

export abstract class BaseThreadRuntimeCore implements ThreadRuntimeCore {
  private _subscriptions = new Set<() => void>();
  private _isInitialized = false;

  protected readonly repository = new MessageRepository();
  public abstract get adapters(): BaseThreadAdapters | undefined;
  public abstract get isDisabled(): boolean;
  public abstract get isLoading(): boolean;
  public abstract get suggestions(): readonly ThreadSuggestion[];
  public abstract get extras(): unknown;

  public abstract get capabilities(): RuntimeCapabilities;
  public abstract append(message: AppendMessage): void;
  public abstract startRun(config: StartRunConfig): void;
  public abstract resumeRun(config: ResumeRunConfig): void;
  public abstract addToolResult(options: AddToolResultOptions): void;
  public abstract resumeToolCall(options: ResumeToolCallOptions): void;
  public abstract cancelRun(): void;
  public abstract exportExternalState(): any;
  public abstract importExternalState(state: any): void;
  public abstract unstable_loadExternalState(state: any): void;

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

  public get messages(): readonly ThreadMessage[] {
    if (this._voiceMessages.length === 0) {
      return this._getBaseMessages();
    }
    const base = this._getBaseMessages();
    if (
      this._cachedVoiceGeneration !== this._voiceGeneration ||
      this._cachedMergedBase !== base
    ) {
      this._cachedMergedMessages = [...base, ...this._voiceMessages];
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

  constructor(private readonly _contextProvider: ModelContextProvider) {}

  public getModelContext() {
    return this._contextProvider.getModelContext();
  }

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

  protected _notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public _notifyEventSubscribers(event: ThreadRuntimeEventType) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;

    for (const callback of subscribers) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  public submitFeedback({ messageId, type }: SubmitFeedbackOptions) {
    const adapter = this.adapters?.feedback;
    if (!adapter) throw new Error("Feedback adapter not configured");

    const { message, parentId } = this.repository.getMessage(messageId);
    adapter.submit({ message, type });

    if (message.role === "assistant") {
      const updatedMessage: ThreadMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          submittedFeedback: { type },
        },
      };
      this.repository.addOrUpdateMessage(parentId, updatedMessage);
    }

    this._notifySubscribers();
  }

  private _stopSpeaking: Unsubscribe | undefined;
  public speech: SpeechState | undefined;

  public speak(messageId: string) {
    const adapter = this.adapters?.speech;
    if (!adapter) throw new Error("Speech adapter not configured");

    const { message } = this.repository.getMessage(messageId);

    this._stopSpeaking?.();

    const utterance = adapter.speak(getThreadMessageText(message));
    const unsub = utterance.subscribe(() => {
      if (utterance.status.type === "ended") {
        this._stopSpeaking = undefined;
        this.speech = undefined;
      } else {
        this.speech = { messageId, status: utterance.status };
      }
      this._notifySubscribers();
    });

    this.speech = { messageId, status: utterance.status };
    this._notifySubscribers();

    this._stopSpeaking = () => {
      utterance.cancel();
      unsub();
      this.speech = undefined;
      this._stopSpeaking = undefined;
    };
  }

  public stopSpeaking() {
    if (!this._stopSpeaking) throw new Error("No message is being spoken");
    this._stopSpeaking();
    this._notifySubscribers();
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

  public connectVoice() {
    const adapter = this.adapters?.voice;
    if (!adapter) throw new Error("Voice adapter not configured");

    this.disconnectVoice();

    const session = adapter.connect({});
    this._voiceSession = session;
    const unsubs: Array<() => void> = [];

    let currentMode: RealtimeVoiceAdapter.Mode = "listening";

    this.voice = {
      status: session.status,
      isMuted: session.isMuted,
      mode: currentMode,
    };
    this._voiceVolume = 0;
    this._notifySubscribers();

    unsubs.push(
      session.onStatusChange((status) => {
        if (status.type === "ended") {
          this._finishVoiceAssistantMessage();
          this._voiceSession = undefined;
          this.voice = undefined;
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

    unsubs.push(
      session.onModeChange((mode) => {
        currentMode = mode;
        if (this.voice) {
          this.voice = { ...this.voice, mode };
          this._notifySubscribers();
        }
      }),
    );

    unsubs.push(
      session.onVolumeChange((volume) => {
        this._voiceVolume = volume;
        for (const cb of this._voiceVolumeSubscribers) cb();
      }),
    );

    unsubs.push(
      session.onTranscript((transcript) => {
        this._handleVoiceTranscript(transcript);
      }),
    );

    this._voiceUnsubs = unsubs;
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
        this._voiceMessages.push({
          id: generateId(),
          role: "user",
          content: [{ type: "text", text: transcript.text }],
          metadata: { custom: {} },
          createdAt: new Date(),
          status: { type: "complete", reason: "unknown" },
          attachments: [],
        });
        this._markVoiceMessagesDirty();
        this._notifySubscribers();
      }
    } else {
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
            custom: {},
          },
          status: { type: "running" },
          createdAt: new Date(),
        };
        this._voiceMessages.push(this._currentAssistantMsg);
      } else {
        const idx = this._voiceMessages.indexOf(this._currentAssistantMsg);
        if (idx === -1) return;
        const updated: ThreadAssistantMessage = {
          ...this._currentAssistantMsg,
          content: [{ type: "text", text: transcript.text }],
          ...(transcript.isFinal
            ? { status: { type: "complete", reason: "stop" } }
            : {}),
        };
        this._voiceMessages[idx] = updated;
        this._currentAssistantMsg = updated;
      }

      if (transcript.isFinal) {
        this._currentAssistantMsg = null;
      }

      this._markVoiceMessagesDirty();
      this._notifySubscribers();
    }
  }

  private _finishVoiceAssistantMessage() {
    const last = this._voiceMessages.at(-1);
    if (last?.role === "assistant" && last.status.type === "running") {
      const idx = this._voiceMessages.length - 1;
      this._voiceMessages[idx] = {
        ...(last as ThreadAssistantMessage),
        status: { type: "complete", reason: "stop" },
      };
      this._markVoiceMessagesDirty();
      this._notifySubscribers();
    }
  }

  public disconnectVoice() {
    this._finishVoiceAssistantMessage();
    this._currentAssistantMsg = null;
    for (const unsub of this._voiceUnsubs) unsub();
    this._voiceUnsubs = [];
    this._voiceSession?.disconnect();
    this._voiceSession = undefined;
    this.voice = undefined;
    this._voiceVolume = 0;
    for (const cb of this._voiceVolumeSubscribers) cb();
    this._voiceMessages = [];
    this._markVoiceMessagesDirty();
    this._notifySubscribers();
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
      this._notifyEventSubscribers("initialize");
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
    Set<() => void>
  >();

  public unstable_on(event: ThreadRuntimeEventType, callback: () => void) {
    if (event === "modelContextUpdate") {
      return this._contextProvider.subscribe?.(callback) ?? (() => {});
    }

    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      this._eventSubscribers.set(event, new Set([callback]));
    } else {
      subscribers.add(callback);
    }

    return () => {
      const subscribers = this._eventSubscribers.get(event)!;
      subscribers.delete(callback);
    };
  }
}
