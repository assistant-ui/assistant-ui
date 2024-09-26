import { ThreadComposerAttachment } from "../context/stores/Attachment";
import { ComposerRuntimeCore } from "../runtimes/core/ComposerRuntimeCore";
import { SubscribableWithState } from "./subscribable/Subscribable";

export type ThreadComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined
>;

export type EditComposerState = Readonly<{
  type: "edit" | "thread";

  /** @deprecated Use `text` instead. This will be removed in 0.6.0. */
  value: string;
  /** @deprecated Use `useComposerRuntime().setText()` instead. This will be removed in 0.6.0. */
  setValue: (value: string) => void;

  text: string;
  /**
   * @deprecated Use `useComposerRuntime().setText()` instead. This will be removed in 0.6.0.
   */
  setText: (value: string) => void;

  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;

  /**
   * @deprecated Use `useComposerRuntime().beginEdit()` instead. This will be removed in 0.6.0.
   */
  edit: () => void;
  /**
   * @deprecated Use `useComposerRuntime().send()` instead. This will be removed in 0.6.0.
   */
  send: () => void;
  /**
   * @deprecated Use `useComposerRuntime().cancel()` instead. This will be removed in 0.6.0.
   */
  cancel: () => void;
}>;

export type UnstableThreadComposerStateV2 = EditComposerState &
  Readonly<{
    attachments: readonly ThreadComposerAttachment[];
    attachmentAccept: string;
  }>;

const METHOD_NOT_SUPPORTED = () => {
  throw new Error("Composer is not available");
};
const EMPTY_ARRAY = Object.freeze([]);
const getThreadComposerState = (
  type: "edit" | "thread",
  runtime: ComposerRuntimeCore | undefined,
  beginEdit: () => void,
): UnstableThreadComposerStateV2 => {
  return Object.freeze({
    type,

    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    text: runtime?.text ?? "",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    attachmentAccept: runtime?.attachmentAccept ?? "*",

    value: runtime?.text ?? "",
    setValue: runtime?.setText.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    setText: runtime?.setText.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    edit: beginEdit,
    send: runtime?.send.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    cancel: runtime?.cancel.bind(runtime) ?? METHOD_NOT_SUPPORTED,
  });
};

export class ComposerRuntime implements ComposerRuntimeCore {
  public get type() {
    return this._beginEdit ? "edit" : "thread";
  }

  constructor(
    private _core: ThreadComposerRuntimeCoreBinding,
    private _beginEdit?: () => void,
  ) {}

  /**
   * @deprecated Use `getState().isEditing` instead. This will be removed in 0.6.0.
   */
  public get isEditing() {
    return this.getState().isEditing;
  }

  /**
   * @deprecated Use `getState().isEmpty` instead. This will be removed in 0.6.0.
   */
  public get isEmpty() {
    return this.getState().isEmpty;
  }

  /**
   * @deprecated Use `getState().canCancel` instead. This will be removed in 0.6.0.
   */
  public get canCancel() {
    return this.getState().canCancel;
  }

  /**
   * @deprecated Use `getState().text` instead. This will be removed in 0.6.0.
   */
  public get text() {
    return this.getState().text;
  }

  /**
   * @deprecated Use `getState().attachmentAccept` instead. This will be removed in 0.6.0.
   */
  public get attachmentAccept() {
    return this.getState().attachmentAccept;
  }

  // TODO should this instead return getAttachmentByIndex([idx]) instead?
  /**
   * @deprecated Use `getState().attachments` instead. This will be removed in 0.6.0.
   */
  public get attachments() {
    return this.getState().attachments;
  }

  /**
   * @deprecated Use `getState().text` instead. This will be removed in 0.6.0.
   */
  public get value() {
    return this.text;
  }

  public getState() {
    return getThreadComposerState(
      this.type,
      this._core.getState(),
      this._beginEdit?.bind(this) ?? METHOD_NOT_SUPPORTED,
    );
  }

  public setText(text: string) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setText(text);
  }

  public setValue(text: string) {
    this.setText(text);
  }

  public addAttachment(file: File) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.addAttachment(file);
  }

  // /**
  //  * @deprecated Use `getAttachmentById(id).removeAttachment` instead. This will be removed in 0.6.0.
  //  */
  public removeAttachment(attachmentId: string) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.removeAttachment(attachmentId);
  }

  /**
   * @deprecated This method will be removed in 0.6.0. Submit feedback if you need this functionality.
   */
  public reset() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.reset();
  }

  public send() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.send();
  }

  public cancel() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.cancel();
  }

  public beginEdit() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");

    this._beginEdit?.();
  }

  /**
   * @deprecated Use `beginEdit()` instead. This will be removed in 0.6.0.
   */
  public edit() {
    this.beginEdit();
  }

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }
}
