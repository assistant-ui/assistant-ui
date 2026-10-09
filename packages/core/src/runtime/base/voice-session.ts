import type {
  AppendMessage,
  TextMessagePart,
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { VoiceSessionState } from "../interfaces/thread-runtime-core";
import { getThreadMessageText } from "../../utils/text";
import { generateId } from "../../utils/id";
import { notifyEventListeners } from "../../utils/notify-event-listeners";
import { notifySubscribers } from "../../subscribable/subscribable";
import { MessageNotSentError } from "../../types/error";

type VoiceSessionHost = {
  adapter(): RealtimeVoiceAdapter | undefined;
  isRunning(): boolean;
  isRunActive(): boolean;
  isLoading(): boolean;
  getBaseMessages(): readonly ThreadMessage[];
  messages(): readonly ThreadMessage[];
  state(): ThreadAssistantMessage["metadata"]["unstable_state"] | null;
  notify(): void;
  subscribe(callback: () => void): Unsubscribe;
  captureGeneration(): AbortSignal;
  ensureInitialized(): void;
  commitVoiceMessage(message: ThreadMessage): void | Promise<void>;
  markVoiceMessagesDirty(): void;
  onConnected(): void;
  onDisconnected(): void;
  enrichAppendMetadata(message: AppendMessage): AppendMessage;
  resolveAppendParent(parentId: string | null): string | null;
  stopSpeakingForVoiceMessage(): Unsubscribe | undefined;
};

export class VoiceSessionController {
  public voiceMessages: ThreadMessage[] = [];
  public voiceGeneration = 0;
  private _cachedMergedMessages: readonly ThreadMessage[] | null = null;
  private _cachedVoiceGeneration = -1;
  private _cachedMergedBase: readonly ThreadMessage[] | null = null;

  private readonly host: VoiceSessionHost;

  constructor(host: VoiceSessionHost) {
    this.host = host;
  }

  public markMessagesDirty() {
    this.voiceGeneration++;
    this._cachedMergedMessages = null;
  }

  public dropMessage(messageId: string, notify: boolean) {
    const index = this.voiceMessages.findIndex(
      (message) => message.id === messageId,
    );
    if (index === -1) return;
    this.voiceMessages.splice(index, 1);
    this.host.markVoiceMessagesDirty();
    if (notify) this.host.notify();
  }

  public getMessages(): readonly ThreadMessage[] {
    if (this.voiceMessages.length === 0) return this.host.getBaseMessages();
    const base = this.host.getBaseMessages();
    if (
      this._cachedVoiceGeneration !== this.voiceGeneration ||
      this._cachedMergedBase !== base
    ) {
      const baseMessageIds = new Set(base.map((message) => message.id));
      this._cachedMergedMessages = [
        ...base,
        ...this.voiceMessages.filter(
          (message) => !baseMessageIds.has(message.id),
        ),
      ];
      this._cachedVoiceGeneration = this.voiceGeneration;
      this._cachedMergedBase = base;
    }
    return this._cachedMergedMessages!;
  }

  public replaceAssistantMessage(
    previous: ThreadAssistantMessage,
    next: ThreadAssistantMessage,
  ) {
    if (this._currentAssistantMsg === previous)
      this._currentAssistantMsg = next;
  }

  public isVoiceMessage(messageId: string | null) {
    return (
      messageId !== null &&
      this.voiceMessages.some((message) => message.id === messageId)
    );
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

  private _toVoiceSessionState(
    session: RealtimeVoiceAdapter.Session,
    status: RealtimeVoiceAdapter.Status,
    mode: RealtimeVoiceAdapter.Mode,
  ): VoiceSessionState {
    return {
      status,
      isMuted: session.isMuted,
      mode,
      canSendText: status.type === "running" && session.sendText !== undefined,
    };
  }

  public isRunActive(): boolean {
    if (this.host.isRunning()) return true;
    const last = this.host.getBaseMessages().at(-1);
    return (
      last?.role === "assistant" &&
      (last.status.type === "running" || last.status.type === "requires-action")
    );
  }

  public getVoiceCommitBarrier(): Promise<void> | undefined {
    if (!this.host.isLoading()) return undefined;
    const generation = this.host.captureGeneration();
    return (async () => {
      while (this.host.isLoading() && !generation.aborted) {
        await new Promise<void>((resolve) => {
          const wake = () => {
            unsubscribe();
            generation.removeEventListener("abort", wake);
            resolve();
          };
          const unsubscribe = this.host.subscribe(wake);
          generation.addEventListener("abort", wake);
        });
      }
    })();
  }

  public connectVoice() {
    const adapter = this.host.adapter();
    if (!adapter) throw new Error("Voice adapter not configured");
    if (this.host.isRunActive())
      throw new Error(
        "Cannot start a voice session while a run is in progress or paused on a pending tool action",
      );
    const replacing = this._voiceSession !== undefined;

    try {
      this._disconnectVoice(false);
    } catch (error) {
      console.error(
        "[assistant-ui] Voice cleanup threw before reconnect",
        error,
      );
    }
    // A subscriber notified by the disconnect may have connected a session;
    // connecting over it would leave it live with no owner.
    if (this._voiceSession !== undefined) return;

    let session: RealtimeVoiceAdapter.Session;
    try {
      session = adapter.connect({});
    } catch (error) {
      if (replacing && this._voiceSession === undefined)
        this.host.onDisconnected();
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

      this.voice = this._toVoiceSessionState(
        session,
        session.status,
        currentMode,
      );
      this._voiceVolume = 0;
      this.host.notify();
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onStatusChange((status) => {
          if (this._voiceSession !== session) return;
          if (status.type === "ended") {
            this._voiceSession = undefined;
            this.voice = undefined;
            this._voiceVolume = 0;
            try {
              notifySubscribers([
                () => this._finishVoiceAssistantMessage(false),
                () => {
                  if (this._voiceSession === undefined)
                    this.host.onDisconnected();
                },
                () =>
                  notifyEventListeners(
                    this._voiceVolumeSubscribers,
                    undefined,
                    "Voice volume",
                  ),
                () => this.host.notify(),
              ]);
            } finally {
              finishDetachedSetup();
            }
          } else {
            this.voice = this._toVoiceSessionState(
              session,
              status,
              currentMode,
            );
            this.host.notify();
          }
        }),
      );
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onModeChange((mode) => {
          if (this._voiceSession !== session) return;
          currentMode = mode;
          if (this.voice) {
            this.voice = { ...this.voice, mode };
            this.host.notify();
          }
        }),
      );
      if (finishDetachedSetup()) return;

      unsubs.push(
        session.onVolumeChange((volume) => {
          if (this._voiceSession !== session) return;
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
          if (this._voiceSession !== session) return;
          this._handleVoiceTranscript(transcript);
        }),
      );
      if (!finishDetachedSetup()) this.host.onConnected();
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
          this.host.onDisconnected();
      } else {
        finishDetachedSetup();
      }
      throw error;
    }
  }

  private _currentAssistantMsg: ThreadAssistantMessage | null = null;

  private _observeVoiceCommit(commit: () => void | Promise<void>) {
    void new Promise<void>((resolve) => resolve(commit())).catch((error) => {
      console.error("[assistant-ui] Voice message commit failed", error);
    });
  }

  private _handleVoiceTranscript(
    transcript: RealtimeVoiceAdapter.TranscriptItem,
  ) {
    const session = this._voiceSession;
    this.host.ensureInitialized();
    if (this._voiceSession !== session) return;

    if (transcript.role === "user") {
      this._finishVoiceAssistantMessage();
      if (this._voiceSession !== session) return;
      this._currentAssistantMsg = null;

      if (transcript.isFinal) {
        this._observeVoiceCommit(() =>
          this._commitVoiceUserMessage({
            id: generateId(),
            role: "user",
            content: [{ type: "text", text: transcript.text }],
            metadata: { modality: "voice", custom: {} },
            createdAt: new Date(),
            attachments: [],
          }),
        );
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
            unstable_state: this.host.state(),
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            modality: "voice",
            custom: {},
          },
          status,
          createdAt: new Date(),
        };
        this.voiceMessages.push(this._currentAssistantMsg);
      } else {
        const idx = this.voiceMessages.indexOf(this._currentAssistantMsg);
        if (idx === -1) return;
        const updated: ThreadAssistantMessage = {
          ...this._currentAssistantMsg,
          content: [{ type: "text", text: transcript.text }],
          status,
        };
        this.voiceMessages[idx] = updated;
        this._currentAssistantMsg = updated;
      }

      if (transcript.isFinal) {
        const message = this._currentAssistantMsg;
        this._observeVoiceCommit(() => this.host.commitVoiceMessage(message));
        this._currentAssistantMsg = null;
      }

      this.host.markVoiceMessagesDirty();
      this.host.notify();
    }
  }

  private _commitVoiceUserMessage(message: ThreadMessage) {
    this.voiceMessages.push(message);
    try {
      return this.host.commitVoiceMessage(message);
    } finally {
      this.host.markVoiceMessagesDirty();
      this.host.notify();
    }
  }

  public async appendToVoiceSession(message: AppendMessage) {
    const session = this._voiceSession;
    if (!this.voice?.canSendText || !session?.sendText)
      throw new Error(
        "Cannot send a text message while a voice session is connected",
      );
    const content = message.content.filter(
      (part): part is TextMessagePart => part.type === "text",
    );
    if (
      message.role !== "user" ||
      message.sourceId != null ||
      message.parentId !==
        this.host.resolveAppendParent(
          this.host.messages().at(-1)?.id ?? null,
        ) ||
      message.attachments?.length ||
      content.length !== message.content.length ||
      !content.some((part) => part.text.trim())
    )
      throw new Error(
        "Only a plain text user message can be sent while a voice session is connected",
      );

    const enriched = this.host.enrichAppendMetadata(message);
    this.host.ensureInitialized();
    const generation = this.host.captureGeneration();
    try {
      await session.sendText(getThreadMessageText(message));
    } catch (error) {
      if (generation.aborted) return;
      const notSent = new MessageNotSentError();
      notSent.cause = error;
      throw notSent;
    }
    if (generation.aborted) return;
    if (this._voiceSession !== session)
      throw new MessageNotSentError(
        "The voice session ended before the typed message was recorded",
      );
    this._finishVoiceAssistantMessage(false);
    if (this._voiceSession !== session)
      throw new MessageNotSentError(
        "The voice session ended before the typed message was recorded",
      );
    this._currentAssistantMsg = null;
    await this._commitVoiceUserMessage({
      id: generateId(),
      role: "user",
      content,
      metadata: { custom: { ...enriched.metadata?.custom } },
      createdAt: message.createdAt,
      attachments: [],
    });
  }

  private _finishVoiceAssistantMessage(notify = true) {
    const last = this.voiceMessages.at(-1);
    if (last?.role === "assistant" && last.status.type === "running") {
      const idx = this.voiceMessages.length - 1;
      this.voiceMessages[idx] = {
        ...(last as ThreadAssistantMessage),
        status: { type: "complete", reason: "stop" },
      };
      this._observeVoiceCommit(() =>
        this.host.commitVoiceMessage(this.voiceMessages[idx]!),
      );
      this._currentAssistantMsg = null;
      this.host.markVoiceMessagesDirty();
      if (notify) this.host.notify();
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
    const stopSpeaking = this.host.stopSpeakingForVoiceMessage();
    this.voiceMessages = [];
    this.host.markVoiceMessagesDirty();

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
        () => this.host.notify(),
      ]);
    } finally {
      if (fireHook && session && this._voiceSession === undefined)
        this.host.onDisconnected();
    }
  }

  public muteVoice() {
    if (!this._voiceSession) throw new Error("No active voice session");
    this._voiceSession.mute();
    this.voice = {
      ...this.voice!,
      isMuted: true,
    };
    this.host.notify();
  }

  public unmuteVoice() {
    if (!this._voiceSession) throw new Error("No active voice session");
    this._voiceSession.unmute();
    this.voice = {
      ...this.voice!,
      isMuted: false,
    };
    this.host.notify();
  }
}
