import {
  ThreadSuggestion,
  RuntimeCapabilities,
  ThreadRuntimeCore,
  SpeechState,
  ThreadRuntimeEventType,
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
import {
  Subscribable,
  SubscribableWithState,
} from "./subscribable/Subscribable";
import {
  ThreadComposerRuntime,
  ThreadComposerRuntimeImpl,
} from "./ComposerRuntime";
import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";
import { MessageRuntimePath, ThreadRuntimePath } from "./RuntimePathTypes";

export type CreateAppendMessage =
  | string
  | {
      parentId?: string | null | undefined;
      role?: AppendMessage["role"] | undefined;
      content: AppendMessage["content"];
      attachments?: AppendMessage["attachments"] | undefined;
      startRun?: boolean | undefined;
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
    ...message,
    parentId: message.parentId ?? messages.at(-1)?.id ?? null,
    role: message.role ?? "user",
    attachments: message.attachments ?? [],
  } as AppendMessage;
};

export type ThreadRuntimeCoreBinding = SubscribableWithState<
  ThreadRuntimeCore,
  ThreadRuntimePath
> & {
  outerSubscribe(callback: () => void): Unsubscribe;
};

export type ThreadState = Readonly<{
  /**
   * The thread ID.
   */
  threadId: string;
  /**
   * Whether the thread is disabled. Disabled threads cannot receive new messages.
   */
  isDisabled: boolean;

  /**
   * Whether the thread is running. A thread is considered running when there is an active stream connection to the backend.
   */
  isRunning: boolean;

  /**
   * The capabilities of the thread, such as whether the thread supports editing, branch switching, etc.
   */
  capabilities: RuntimeCapabilities;

  /**
   * The messages in the currently selected branch of the thread.
   */
  messages: readonly ThreadMessage[];

  /**
   * Follow up message suggestions to show the user.
   */
  suggestions: readonly ThreadSuggestion[];

  /**
   * Custom extra information provided by the runtime.
   */
  extras: unknown;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  speech: SpeechState | undefined;
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
    speech: runtime.speech,
  });
};

export type ThreadRuntime = Readonly<{
  readonly path: ThreadRuntimePath;

  readonly composer: ThreadComposerRuntime;
  getState(): ThreadState;

  append(message: CreateAppendMessage): void;
  startRun(parentId: string | null): void;
  subscribe(callback: () => void): Unsubscribe;
  cancelRun(): void;
  getModelConfig(): ModelConfig;
  export(): ExportedMessageRepository;
  import(repository: ExportedMessageRepository): void;
  getMesssageByIndex(idx: number): MessageRuntime;
  getMesssageById(messageId: string): MessageRuntime;

  /**
   * @deprecated This API is still under active development and might change without notice.
   */
  stopSpeaking: () => void;

  unstable_on(event: ThreadRuntimeEventType, callback: () => void): Unsubscribe;
}>;

export class ThreadRuntimeImpl implements ThreadRuntime {
  public get path() {
    return this._threadBinding.path;
  }

  public unstable_getCore() {
    return this._threadBinding.getState();
  }

  private _threadBinding: ThreadRuntimeCoreBinding & {
    getStateState(): ThreadState;
  };

  constructor(threadBinding: ThreadRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      path: threadBinding.path,
      getState: () => getThreadState(threadBinding.getState()),
      subscribe: (callback) => threadBinding.subscribe(callback),
    });

    this._threadBinding = {
      path: threadBinding.path,
      getState: () => threadBinding.getState(),
      getStateState: () => stateBinding.getState(),
      outerSubscribe: (callback) => threadBinding.outerSubscribe(callback),
      subscribe: (callback) => threadBinding.subscribe(callback),
    };

    this.composer = new ThreadComposerRuntimeImpl(
      new NestedSubscriptionSubject({
        path: {
          ...this.path,
          ref: this.path.ref + `${this.path.ref}.composer`,
          composerSource: "thread",
        },
        getState: () => this._threadBinding.getState().composer,
        subscribe: (callback) => this._threadBinding.subscribe(callback),
      }),
    );
  }

  public readonly composer;

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

  public getModelConfig() {
    return this._threadBinding.getState().getModelConfig();
  }

  public startRun(parentId: string | null) {
    return this._threadBinding.getState().startRun(parentId);
  }

  public cancelRun() {
    this._threadBinding.getState().cancelRun();
  }

  public stopSpeaking() {
    return this._threadBinding.getState().stopSpeaking();
  }

  public getSubmittedFeedback(messageId: string) {
    return this._threadBinding.getState().getSubmittedFeedback(messageId);
  }

  public export() {
    return this._threadBinding.getState().export();
  }

  public import(data: ExportedMessageRepository) {
    this._threadBinding.getState().import(data);
  }

  public getMesssageByIndex(idx: number) {
    if (idx < 0) throw new Error("Message index must be >= 0");

    return this._getMessageRuntime(
      {
        ...this.path,
        ref: this.path.ref + `${this.path.ref}.messages[${idx}]`,
        messageSelector: { type: "index", index: idx },
      },
      () => {
        const messages = this._threadBinding.getState().messages;
        const message = messages[idx];
        if (!message) return undefined;
        return {
          message,
          parentId: messages[idx - 1]?.id ?? null,
        };
      },
    );
  }

  public getMesssageById(messageId: string) {
    return this._getMessageRuntime(
      {
        ...this.path,
        ref:
          this.path.ref +
          `${this.path.ref}.messages[messageId=${JSON.stringify(messageId)}]`,
        messageSelector: { type: "messageId", messageId: messageId },
      },
      () => this._threadBinding.getState().getMessageById(messageId),
    );
  }

  private _getMessageRuntime(
    path: MessageRuntimePath,
    callback: () =>
      | { parentId: string | null; message: ThreadMessage }
      | undefined,
  ) {
    return new MessageRuntimeImpl(
      new ShallowMemoizeSubject({
        path,
        getState: () => {
          const { message, parentId } = callback() ?? {};

          const { messages, speech: speechState } =
            this._threadBinding.getState();

          if (!message || parentId === undefined) return SKIP_UPDATE;

          const thread = this._threadBinding.getState();

          const branches = thread.getBranches(message.id);
          const submittedFeedback = thread.getSubmittedFeedback(message.id);

          return {
            ...message,

            isLast: messages.at(-1)?.id === message.id,
            parentId,

            branchNumber: branches.indexOf(message.id) + 1,
            branchCount: branches.length,

            speech:
              speechState?.messageId === message.id ? speechState : undefined,

            submittedFeedback,
          } satisfies MessageState;
        },
        subscribe: (callback) => this._threadBinding.subscribe(callback),
      }),
      this._threadBinding,
    );
  }

  private _eventListenerNestedSubscriptions = new Map<
    string,
    NestedSubscriptionSubject<Subscribable, ThreadRuntimePath>
  >();

  public unstable_on(
    event: ThreadRuntimeEventType,
    callback: () => void,
  ): Unsubscribe {
    let subject = this._eventListenerNestedSubscriptions.get(event);
    if (!subject) {
      subject = new NestedSubscriptionSubject({
        path: this.path,
        getState: () => ({
          subscribe: (callback) =>
            this._threadBinding.getState().unstable_on(event, callback),
        }),
        subscribe: (callback) => this._threadBinding.outerSubscribe(callback),
      });
      this._eventListenerNestedSubscriptions.set(event, subject);
    }
    return subject.subscribe(callback);
  }
}
