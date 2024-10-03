import {
  AddToolResultOptions,
  ThreadSuggestion,
  RuntimeCapabilities,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
} from "../runtimes/core/ThreadRuntimeCore";
import { ExportedMessageRepository } from "../runtimes/utils/MessageRepository";
import {
  AppendMessage,
  ModelConfig,
  ThreadMessage,
  Unsubscribe,
} from "../types";
import {
  MessageRuntime,
  MessageRuntimeImpl,
  MessageState,
} from "./MessageRuntime";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";
import {
  ThreadComposerRuntime,
  ThreadComposerRuntimeImpl,
} from "./ComposerRuntime";
import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";
import { SpeechSynthesisAdapter } from "../runtimes/speech/SpeechAdapterTypes";
import { ComposerRuntimeCore } from "../runtimes/core/ComposerRuntimeCore";

export type CreateAppendMessage =
  | string
  | {
      parentId?: string | null | undefined;
      role?: AppendMessage["role"] | undefined;
      content: AppendMessage["content"];
      attachments?: AppendMessage["attachments"] | undefined;
    };

const toAppendMessage = (
  messages: readonly ThreadMessage[],
  message: CreateAppendMessage,
): AppendMessage => {
  if (typeof message === "string") {
    return {
      parentId: messages.at(-1)?.id ?? null,
      role: "user",
      content: [{ type: "text", text: message }],
      attachments: [],
    };
  }

  if (message.role && message.parentId && message.attachments) {
    return message as AppendMessage;
  }

  return {
    parentId: message.parentId ?? messages.at(-1)?.id ?? null,
    role: message.role ?? "user",
    content: message.content,
    attachments: message.attachments ?? [],
  } as AppendMessage;
};

export type ThreadRuntimeCoreBinding = SubscribableWithState<ThreadRuntimeCore>;

export type ThreadState = Readonly<{
  threadId: string;
  isDisabled: boolean;
  isRunning: boolean;
  capabilities: RuntimeCapabilities;
  messages: readonly ThreadMessage[];
  suggestions: readonly ThreadSuggestion[];
  extras: unknown;
}>;

export const getThreadState = (runtime: ThreadRuntimeCore): ThreadState => {
  const lastMessage = runtime.messages.at(-1);
  return Object.freeze({
    threadId: runtime.threadId,
    capabilities: runtime.capabilities,
    isDisabled: runtime.isDisabled,
    isRunning:
      lastMessage?.role !== "assistant"
        ? false
        : lastMessage.status.type === "running",
    messages: runtime.messages,
    suggestions: runtime.suggestions,
    extras: runtime.extras,
  });
};
export type ThreadRuntime = {
  composer: ThreadComposerRuntime;
  getState(): ThreadState;

  /**
   * @deprecated This method will be removed in 0.6.0. Submit feedback if you need this functionality.
   */
  unstable_getCore(): ThreadRuntimeCore;

  append(message: CreateAppendMessage): void;
  startRun(parentId: string | null): void;
  subscribe(callback: () => void): Unsubscribe;
  cancelRun(): void;
  getModelConfig(): ModelConfig;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  getMesssageByIndex(idx: number): MessageRuntime;

  // Legacy methods with deprecations

  /**
   * @deprecated Use `getState().capabilities` instead. This will be removed in 0.6.0.
   */
  capabilities: Readonly<RuntimeCapabilities>;

  /**
   * @deprecated Use `getState().threadId` instead. This will be removed in 0.6.0.
   */
  threadId: string;

  /**
   * @deprecated Use `getState().isDisabled` instead. This will be removed in 0.6.0.
   */
  isDisabled: boolean;

  /**
   * @deprecated Use `getState().isRunning` instead. This will be removed in 0.6.0.
   */
  isRunning: boolean;

  /**
   * @deprecated Use `getState().messages` instead. This will be removed in 0.6.0.
   */
  messages: readonly ThreadMessage[];

  /**
   * @deprecated Use `getState().followupSuggestions` instead. This will be removed in 0.6.0.
   */
  suggestions: readonly ThreadSuggestion[];

  /**
   * @deprecated Use `getState().extras` instead. This will be removed in 0.6.0.
   */
  extras: unknown;

  /**
   * @deprecated Use `getMesssageById(id).getState().branchNumber` / `getMesssageById(id).getState().branchCount` instead. This will be removed in 0.6.0.
   */
  getBranches: (messageId: string) => readonly string[];

  /**
   * @deprecated Use `getMesssageById(id).switchToBranch({ options })` instead. This will be removed in 0.6.0.
   */
  switchToBranch: (branchId: string) => void;

  /**
   * @deprecated Use `getMesssageById(id).getContentPartByToolCallId(toolCallId).addToolResult({ result })` instead. This will be removed in 0.6.0.
   */
  addToolResult: (options: AddToolResultOptions) => void;

  /**
   * @deprecated Use `getMesssageById(id).speak()` instead. This will be removed in 0.6.0.
   */
  speak: (messageId: string) => SpeechSynthesisAdapter.Utterance;

  /**
   * @deprecated Use `getMesssageById(id).submitFeedback({ type })` instead. This will be removed in 0.6.0.
   */
  submitFeedback: (feedback: SubmitFeedbackOptions) => void;

  /**
   * @deprecated Use `getMesssageById(id).getMessageByIndex(idx).composer` instead. This will be removed in 0.6.0.
   */
  getEditComposer: (messageId: string) => ComposerRuntimeCore | undefined;

  /**
   * @deprecated Use `getMesssageById(id).getMessageByIndex(idx).composer.beginEdit()` instead. This will be removed in 0.6.0.
   */
  beginEdit: (messageId: string) => void;
};

export class ThreadRuntimeImpl implements ThreadRuntimeCore, ThreadRuntime {
  // public path = "assistant.threads[main]"; // TODO

  /**
   * @deprecated Use `getState().threadId` instead. This will be removed in 0.6.0.
   */
  public get threadId() {
    return this.getState().threadId;
  }

  /**
   * @deprecated Use `getState().isDisabled` instead. This will be removed in 0.6.0.
   */
  public get isDisabled() {
    return this.getState().isDisabled;
  }

  /**
   * @deprecated Use `getState().isRunning` instead. This will be removed in 0.6.0.
   */
  public get isRunning() {
    return this.getState().isRunning;
  }

  /**
   * @deprecated Use `getState().capabilities` instead. This will be removed in 0.6.0.
   */
  public get capabilities() {
    return this.getState().capabilities;
  }

  /**
   * @deprecated Use `getState().extras` instead. This will be removed in 0.6.0.
   */
  public get extras() {
    return this._threadBinding.getState().extras;
  }

  /**
   * @deprecated Use `getState().followupSuggestions` instead. This will be removed in 0.6.0.
   */
  public get suggestions() {
    return this._threadBinding.getState().suggestions;
  }

  /**
   * @deprecated Use `getState().messages` instead. This will be removed in 0.6.0.
   */
  public get messages() {
    return this._threadBinding.getState().messages;
  }

  public unstable_getCore() {
    return this._threadBinding.getState();
  }

  private _threadBinding: ThreadRuntimeCoreBinding & {
    getStateState(): ThreadState;
  };
  constructor(threadBinding: ThreadRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      getState: () => getThreadState(threadBinding.getState()),
      subscribe: (callback) => threadBinding.subscribe(callback),
    });

    this._threadBinding = {
      getState: () => threadBinding.getState(),
      getStateState: () => stateBinding.getState(),
      subscribe: (callback) => threadBinding.subscribe(callback),
    };
  }

  public readonly composer = new ThreadComposerRuntimeImpl(
    new NestedSubscriptionSubject({
      getState: () => this._threadBinding.getState().composer,
      subscribe: (callback) => this._threadBinding.subscribe(callback),
    }),
  );

  public getState() {
    return this._threadBinding.getStateState();
  }

  public append(message: CreateAppendMessage) {
    this._threadBinding
      .getState()
      .append(
        toAppendMessage(this._threadBinding.getState().messages, message),
      );
  }

  public subscribe(callback: () => void) {
    return this._threadBinding.subscribe(callback);
  }

  /**
   * @derprecated Use `getMesssageById(id).getState().branchNumber` / `getMesssageById(id).getState().branchCount` instead. This will be removed in 0.6.0.
   */
  public getBranches(messageId: string) {
    return this._threadBinding.getState().getBranches(messageId);
  }

  public getModelConfig() {
    return this._threadBinding.getState().getModelConfig();
  }

  // TODO sometimes you want to continue when there is no child message
  public startRun(parentId: string | null) {
    return this._threadBinding.getState().startRun(parentId);
  }

  public cancelRun() {
    this._threadBinding.getState().cancelRun();
  }

  /**
   * @deprecated Use `getMesssageById(id).getContentPartByToolCallId(toolCallId).addToolResult({ result })` instead. This will be removed in 0.6.0.
   */
  public addToolResult(options: AddToolResultOptions) {
    this._threadBinding.getState().addToolResult(options);
  }

  /**
   * @deprecated Use `getMesssageById(id).switchToBranch({ options })` instead. This will be removed in 0.6.0.
   */
  public switchToBranch(branchId: string) {
    return this._threadBinding.getState().switchToBranch(branchId);
  }

  // /**
  //  * @deprecated Use `getMesssageById(id).speak()` instead. This will be removed in 0.6.0.
  //  */
  public speak(messageId: string) {
    return this._threadBinding.getState().speak(messageId);
  }

  // /**
  //  * @deprecated Use `getMesssageById(id).submitFeedback({ type })` instead. This will be removed in 0.6.0.
  //  */
  public submitFeedback(options: SubmitFeedbackOptions) {
    return this._threadBinding.getState().submitFeedback(options);
  }

  /**
   * @deprecated Use `getMesssageById(id).getMessageByIndex(idx).composer` instead. This will be removed in 0.6.0.
   */
  public getEditComposer(messageId: string) {
    return this._threadBinding.getState().getEditComposer(messageId);
  }

  /**
   * @deprecated Use `getMesssageById(id).getMessageByIndex(idx).composer.beginEdit()` instead. This will be removed in 0.6.0.
   */
  public beginEdit(messageId: string) {
    return this._threadBinding.getState().beginEdit(messageId);
  }

  public export() {
    return this._threadBinding.getState().export();
  }

  public import(data: ExportedMessageRepository) {
    this._threadBinding.getState().import(data);
  }

  public getMesssageByIndex(idx: number) {
    if (idx < 0) throw new Error("Message index must be >= 0");

    return new MessageRuntimeImpl(
      new ShallowMemoizeSubject({
        getState: () => {
          const messages = this.getState().messages;
          const message = messages[idx];
          if (!message) return SKIP_UPDATE;

          const branches = this._threadBinding
            .getState()
            .getBranches(message.id);

          return {
            ...message,

            message,
            isLast: idx === messages.length - 1,
            parentId: messages[idx - 1]?.id ?? null,

            branches,
            branchNumber: branches.indexOf(message.id) + 1,
            branchCount: branches.length,
          } satisfies MessageState;
        },
        subscribe: (callback) => this._threadBinding.subscribe(callback),
      }),
      this._threadBinding,
    );
  }
}
