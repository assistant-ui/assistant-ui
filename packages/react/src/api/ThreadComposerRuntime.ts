import { ThreadComposerRuntimeCore } from "../runtimes/core/ThreadComposerRuntimeCore";
import { SubscribableWithState } from "./subscribable/Subscribable";

export type ThreadComposerRuntimeCoreBinding =
  SubscribableWithState<ThreadComposerRuntimeCore>;

export class ComposerState {
  constructor(private _composerBinding: ThreadComposerRuntimeCoreBinding) {}

  public get isEmpty() {
    return this._composerBinding.getState().isEmpty;
  }

  public get text() {
    return this._composerBinding.getState().text;
  }

  public get attachmentAccept() {
    return this._composerBinding.getState().attachmentAccept;
  }

  public get attachments() {
    return this._composerBinding.getState().attachments;
  }
}

export class ThreadComposerRuntime implements ThreadComposerRuntimeCore {
  constructor(private _core: ThreadComposerRuntimeCoreBinding) {
    this._state = new ComposerState(_core);
  }

  /**
   * @deprecated Use `getState().isEmpty` instead. This will be removed in 0.6.0.
   */
  public get isEmpty() {
    return this._core.getState().isEmpty;
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

  private _state;
  public getState() {
    return this._state;
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

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }
}
