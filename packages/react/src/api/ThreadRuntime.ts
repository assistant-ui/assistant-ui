import {
  AddToolResultOptions,
  SubmitFeedbackOptions,
  ThreadRuntimeCore,
} from "../runtimes/core/ThreadRuntimeCore";
import { ExportedMessageRepository } from "../runtimes/utils/MessageRepository";
import { AppendMessage } from "../types";
import { MessageRuntime, MessageSnapshot } from "./MessageRuntime";
import { NestedSubscriptionSubject } from "./subscribable/NestedSubscriptionSubject";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { ThreadComposerRuntime } from "./ThreadComposerRuntime";

export type ThreadRuntimeCoreBinding = SubscribableWithState<ThreadRuntimeCore>;

class ThreadState {
  constructor(private _core: ThreadRuntimeCore) {}

  get threadId() {
    return this._core.threadId;
  }
  get isDisabled() {
    return this._core.isDisabled;
  }
  get isRunning() {
    const messages = this._core.messages;
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role !== "assistant"
      ? false
      : lastMessage.status.type === "running";
  }
  get capabilities() {
    return this._core.capabilities;
  }
}

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

  // TODO this should instead return getMessageByIndex([idx])
  public get messages() {
    return this._threadBinding.getState().messages;
  }

  public unstable_getCore() {
    return this._threadBinding.getState();
  }

  constructor(private _threadBinding: ThreadRuntimeCoreBinding) {}

  public readonly composer = new ThreadComposerRuntime(
    new NestedSubscriptionSubject({
      getState: () => this._threadBinding.getState().composer,
      subscribe: (callback) => this._threadBinding.subscribe(callback),
    }),
  );

  public getState() {
    return new ThreadState(this._threadBinding.getState());
  }

  public append(message: AppendMessage) {
    this._threadBinding.getState().append(message);
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
            message,
            isLast: idx === messages.length - 1,
            parentId: messages[idx - 1]?.id ?? null,

            branches,
            branchNumber: branches.indexOf(message.id) + 1,
            branchCount: branches.length,
          } satisfies MessageSnapshot;
        },
        subscribe: (callback) => this._threadBinding.subscribe(callback),
      }),
      this._threadBinding,
    );
  }
}
