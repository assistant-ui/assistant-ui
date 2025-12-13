import type {
  AppendMessage,
  ThreadMessage,
  Unsubscribe,
  SpeechState,
  RuntimeCapabilities,
} from "../types";
import type {
  SpeechSynthesisAdapter,
  FeedbackAdapter,
  AttachmentAdapter,
} from "../adapters";
import { ExportedMessageRepository, MessageRepository } from "../runtime";
import { getThreadMessageText } from "../utils";
import type { ThreadMessageLike } from "../runtime/external-store";
import type { ModelContextProvider } from "../model-context";
import type {
  ThreadSuggestion,
  ThreadRuntimeEventType,
  ThreadRuntimeCore,
} from "./ThreadRuntimeCore";
import type {
  AddToolResultOptions,
  ResumeToolCallOptions,
  SubmitFeedbackOptions,
  StartRunConfig,
  ResumeRunConfig,
} from "../types";
import type {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "./ComposerRuntimeCore";

export type BaseThreadAdapters = {
  speech?: SpeechSynthesisAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
};

/**
 * Abstract base class for thread runtime implementations.
 * Provides common functionality for message management, branching, speech, and feedback.
 * Subclasses must provide their own composer implementations.
 */
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
  public abstract unstable_loadExternalState(state: unknown): void;

  /**
   * The thread composer runtime. Subclasses must provide their own implementation.
   */
  public abstract get composer(): ThreadComposerRuntimeCore;

  /**
   * Get the edit composer for a message. Subclasses must provide their own implementation.
   */
  public abstract getEditComposer(
    messageId: string,
  ): ComposerRuntimeCore | undefined;

  /**
   * Begin editing a message. Subclasses must provide their own implementation.
   */
  public abstract beginEdit(messageId: string): void;

  public get messages() {
    return this.repository.getMessages();
  }

  public get state() {
    let mostRecentAssistantMessage;
    for (const message of this.messages) {
      if (message.role === "assistant") {
        mostRecentAssistantMessage = message;
        break;
      }
    }

    return mostRecentAssistantMessage?.metadata.unstable_state ?? null;
  }

  constructor(private readonly _contextProvider: ModelContextProvider) {}

  public getModelContext() {
    return this._contextProvider.getModelContext();
  }

  public getMessageById(messageId: string) {
    try {
      return this.repository.getMessage(messageId);
    } catch {
      return undefined;
    }
  }

  public getBranches(messageId: string): string[] {
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

    // Update the message metadata with the feedback
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
    if (event === "model-context-update") {
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
