import {
  AddToolResultOptions,
  RuntimeCapabilities,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
} from "../runtimes/core/ThreadRuntimeCore";
import { ExportedMessageRepository } from "../runtimes/utils/MessageRepository";
import { AppendMessage, ThreadMessage } from "../types";
import { MessageRuntime, MessageState } from "./MessageRuntime";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { ComposerRuntime } from "./ComposerRuntime";
import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";

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
  });
};

export class ThreadRuntime implements ThreadRuntimeCore {
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

  public readonly composer = new ComposerRuntime(
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

  // /**
  //  * @derprecated Use `getMesssageById(id).getState().branchNumber` / `getMesssageById(id).getState().branchCount` instead. This will be removed in 0.6.0.
  //  */
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

  // TODO
  public cancelRun() {
    this._threadBinding.getState().cancelRun();
  }

  // /**
  //  * @deprecated Use `getMesssageById(id).getContentPartByToolCallId(toolCallId).addToolResult({ result })` instead. This will be removed in 0.6.0.
  //  */
  public addToolResult(options: AddToolResultOptions) {
    this._threadBinding.getState().addToolResult(options);
  }

  // TODO
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
   * @deprecated This is a temporary API. This will be removed in 0.6.0.
   */
  public getEditComposer(messageId: string) {
    return this._threadBinding.getState().getEditComposer(messageId);
  }

  /**
   * @deprecated This is a temporary API. This will be removed in 0.6.0.
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

  public unstable_getMesssageByIndex(idx: number) {
    if (idx < 0) throw new Error("Message index must be >= 0");

    return new MessageRuntime(
      new ShallowMemoizeSubject({
        getState: () => {
          const messages = this.messages;
          const message = messages[idx];
          if (!message) return undefined;

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
