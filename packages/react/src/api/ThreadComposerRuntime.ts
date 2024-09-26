import { ThreadComposerAttachment } from "../context/stores/Attachment";
import { ThreadComposerRuntimeCore } from "../runtimes/core/ThreadComposerRuntimeCore";
import { SubscribableWithState } from "./subscribable/Subscribable";

export type ThreadComposerRuntimeCoreBinding =
  SubscribableWithState<ThreadComposerRuntimeCore>;

export type UnstableThreadComposerStateV2 = Readonly<{
  isEmpty: boolean;
  text: string;
  attachments: readonly ThreadComposerAttachment[];
  attachmentAccept: string;
  canCancel: boolean;
}>;

const getThreadComposerState = (
  runtime: ThreadComposerRuntimeCore,
): UnstableThreadComposerStateV2 => {
  return Object.freeze({
    canCancel: runtime.canCancel,
    isEmpty: runtime.isEmpty,
    text: runtime.text,
    attachments: runtime.attachments,
    attachmentAccept: runtime.attachmentAccept,
  });
};

export class ThreadComposerRuntime implements ThreadComposerRuntimeCore {
  constructor(private _core: ThreadComposerRuntimeCoreBinding) {}

  /**
   * @deprecated Use `getState().isEmpty` instead. This will be removed in 0.6.0.
   */
  public get isEmpty() {
    return this._core.getState().isEmpty;
  }

  /**
   * @deprecated Use `getState().canCancel` instead. This will be removed in 0.6.0.
   */
  public get canCancel() {
    return this._core.getState().canCancel;
  }

  /**
   * @deprecated Use `getState().text` instead. This will be removed in 0.6.0.
   */
  public get text() {
    return this._core.getState().text;
  }

  /**
   * @deprecated Use `getState().attachmentAccept` instead. This will be removed in 0.6.0.
   */
  public get attachmentAccept() {
    return this._core.getState().attachmentAccept;
  }

  // TODO should this instead return getAttachmentByIndex([idx]) instead?
  /**
   * @deprecated Use `getState().attachments` instead. This will be removed in 0.6.0.
   */
  public get attachments() {
    return this._core.getState().attachments;
  }

  public getState() {
    return getThreadComposerState(this._core.getState());
  }

  public setText(text: string) {
    this._core.getState().setText(text);
  }

  public addAttachment(file: File) {
    return this._core.getState().addAttachment(file);
  }

  // /**
  //  * @deprecated Use `getAttachmentById(id).removeAttachment` instead. This will be removed in 0.6.0.
  //  */
  public removeAttachment(attachmentId: string) {
    return this._core.getState().removeAttachment(attachmentId);
  }

  /**
   * @deprecated This method will be removed in 0.6.0. Submit feedback if you need this functionality.
   */
  public reset() {
    this._core.getState().reset();
  }

  public send() {
    this._core.getState().send();
  }

  public cancel() {
    this._core.getState().cancel();
  }

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }
}
