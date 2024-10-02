import { Attachment, PendingAttachment } from "../types/AttachmentTypes";
import {
  ComposerRuntimeCore,
  ThreadComposerRuntimeCore,
} from "../runtimes/core/ComposerRuntimeCore";
import { Unsubscribe } from "../types";
import { SubscribableWithState } from "./subscribable/Subscribable";
import { LazyMemoizeSubject } from "./subscribable/LazyMemoizeSubject";
import {
  AttachmentRuntime,
  AttachmentState,
  EditComposerAttachmentRuntimeImpl,
  ThreadComposerAttachmentRuntimeImpl,
} from "./AttachmentRuntime";
import { ShallowMemoizeSubject } from "./subscribable/ShallowMemoizeSubject";
import { SKIP_UPDATE } from "./subscribable/SKIP_UPDATE";

export type ThreadComposerRuntimeCoreBinding = SubscribableWithState<
  ThreadComposerRuntimeCore | undefined
>;

export type ComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined
>;

type LegacyEditComposerState = Readonly<{
  type: "edit";

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
   * @deprecated Use useComposerRuntime().beginEdit() instead. This will be removed in 0.6.0.
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

type LegacyThreadComposerState = Readonly<{
  type: "thread";

  /** @deprecated Use `text` instead. This will be removed in 0.6.0. */
  value: string;
  /** @deprecated Use `useComposerRuntime().setText` instead. This will be removed in 0.6.0. */
  setValue: (value: string) => void;

  attachmentAccept: string;
  attachments: readonly Attachment[];

  /** @deprecated Use `useComposerRuntime().addAttachment` instead. This will be removed in 0.6.0. */
  addAttachment: (file: File) => void;
  /** @deprecated Use `useComposerRuntime().removeAttachment` instead. This will be removed in 0.6.0. */
  removeAttachment: (attachmentId: string) => void;

  text: string;
  /** @deprecated Use `useComposerRuntime().setText` instead. This will be removed in 0.6.0. */
  setText: (value: string) => void;

  /** @deprecated Use `useComposerRuntime().reset` instead. This will be removed in 0.6.0. */
  reset: () => void;

  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;

  /**
   * @deprecated Use `useComposerRuntime().send` instead. This will be removed in 0.6.0.
   **/
  send: () => void;
  /** @deprecated Use `useComposerRuntime().cancel` instead. This will be removed in 0.6.0. */
  cancel: () => void;

  // TODO replace with events
  /** @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it. */
  focus: () => void;
  /** @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it. */
  onFocus: (listener: () => void) => Unsubscribe;
}>;

type BaseComposerState = {
  text: string;
  attachmentAccept: string;
  attachments: readonly Attachment[];

  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;
};

export type ThreadComposerState = LegacyThreadComposerState &
  BaseComposerState & {
    type: "thread";

    attachments: readonly PendingAttachment[];
  };

export type EditComposerState = LegacyEditComposerState &
  BaseComposerState & {
    type: "edit";
  };

export type ComposerState = ThreadComposerState | EditComposerState;

const METHOD_NOT_SUPPORTED = () => {
  throw new Error("Composer is not available");
};
const EMPTY_ARRAY = Object.freeze([]);
const getThreadComposerState = (
  runtime: ThreadComposerRuntimeCore | undefined,
  focus: () => void,
  onFocus: (listener: () => void) => Unsubscribe,
): ThreadComposerState => {
  return Object.freeze({
    type: "thread",

    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    text: runtime?.text ?? "",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    attachmentAccept: runtime?.attachmentAccept ?? "*",

    value: runtime?.text ?? "",
    setValue: runtime?.setText.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    setText: runtime?.setText.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    // edit: beginEdit,
    send: runtime?.send.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    cancel: runtime?.cancel.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    focus: focus,
    onFocus: onFocus,
    reset: runtime?.reset.bind(runtime) ?? METHOD_NOT_SUPPORTED,

    addAttachment: runtime?.addAttachment.bind(runtime) ?? METHOD_NOT_SUPPORTED,
    removeAttachment:
      runtime?.removeAttachment.bind(runtime) ?? METHOD_NOT_SUPPORTED,
  });
};

const getEditComposerState = (
  runtime: ComposerRuntimeCore | undefined,
  beginEdit: () => void,
): EditComposerState => {
  return Object.freeze({
    type: "edit",

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

export type ComposerRuntime = {
  readonly type: "edit" | "thread";
  getState(): ComposerState;

  /** @deprecated Use `getState().isEditing` instead. This will be removed in 0.6.0. */
  readonly isEditing: boolean;

  /** @deprecated Use `getState().isEmpty` instead. This will be removed in 0.6.0. */
  readonly isEmpty: boolean;

  /** @deprecated Use `getState().canCancel` instead. This will be removed in 0.6.0. */
  readonly canCancel: boolean;

  /** @deprecated Use `getState().text` instead. This will be removed in 0.6.0. */
  readonly text: string;

  /** @deprecated Use `getState().attachmentAccept` instead. This will be removed in 0.6.0. */
  readonly attachmentAccept: string;

  /** @deprecated Use `getState().attachments` instead. This will be removed in 0.6.0. */
  readonly attachments: readonly Attachment[];

  /** @deprecated Use `getState().text` instead. This will be removed in 0.6.0. */
  readonly value: string;

  setText(text: string): void;
  setValue(text: string): void;
  addAttachment(file: File): void;

  /** @deprecated Use `getAttachmentById(id).removeAttachment()` instead. This will be removed in 0.6.0. */
  removeAttachment(attachmentId: string): void;

  /** @deprecated This method will be removed in 0.6.0. Submit feedback if you need this functionality. */
  reset(): void;

  send(): void;
  cancel(): void;
  subscribe(callback: () => void): Unsubscribe;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
};

export abstract class ComposerRuntimeImpl
  implements ComposerRuntimeCore, ComposerRuntime
{
  public abstract get type(): "edit" | "thread";

  constructor(protected _core: ComposerRuntimeCoreBinding) {}

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

  public abstract getState(): ComposerState;

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

  /**
   * @deprecated Use `getAttachmentById(id).removeAttachment()` instead. This will be removed in 0.6.0.
   */
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

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }

  public abstract getAttachmentByIndex(idx: number): AttachmentRuntime;
}

export type ThreadComposerRuntime = Omit<
  ComposerRuntime,
  "getState" | "getAttachmentByIndex"
> & {
  readonly type: "thread";
  getState(): ThreadComposerState;

  /** @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it. */
  focus(): void;

  /** @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it. */
  onFocus(callback: () => void): Unsubscribe;

  getAttachmentByIndex(
    idx: number,
  ): AttachmentRuntime & { source: "thread-composer" };
};

export class ThreadComposerRuntimeImpl
  extends ComposerRuntimeImpl
  implements ThreadComposerRuntime, ThreadComposerState
{
  public get type() {
    return "thread" as const;
  }

  private _getState;

  constructor(core: ThreadComposerRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      getState: () =>
        getThreadComposerState(
          core.getState(),
          this.focus.bind(this),
          this.onFocus.bind(this),
        ),
      subscribe: (callback) => core.subscribe(callback),
    });
    super({
      getState: () => core.getState(),
      subscribe: (callback) => stateBinding.subscribe(callback),
    });
    this._getState = stateBinding.getState.bind(stateBinding);
  }

  public override get attachments() {
    return this.getState()?.attachments ?? EMPTY_ARRAY;
  }

  public override getState(): ThreadComposerState {
    return this._getState();
  }

  // TODO replace with events
  private _focusListeners = new Set<() => void>();

  /**
   * @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it.
   */
  public focus() {
    this._focusListeners.forEach((callback) => callback());
  }

  /**
   * @deprecated This feature is being removed in 0.6.0. Submit feedback if you need it.
   */
  public onFocus(callback: () => void) {
    this._focusListeners.add(callback);
    return () => this._focusListeners.delete(callback);
  }

  public getAttachmentByIndex(idx: number) {
    return new ThreadComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;

          return {
            ...attachment,
            attachment: attachment,
            source: "thread-composer",
          } satisfies AttachmentState & { source: "thread-composer" };
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }
}

export type EditComposerRuntime = Omit<
  ComposerRuntime,
  "getState" | "getAttachmentByIndex"
> & {
  readonly type: "edit";
  getState(): EditComposerState;
  beginEdit(): void;

  /**
   * @deprecated Use `beginEdit()` instead. This will be removed in 0.6.0.
   */
  edit(): void;

  getAttachmentByIndex(
    idx: number,
  ): AttachmentRuntime & { source: "edit-composer" };
};

export class EditComposerRuntimeImpl
  extends ComposerRuntimeImpl
  implements EditComposerRuntime, EditComposerState
{
  public get type() {
    return "edit" as const;
  }

  private _getState;
  constructor(
    core: ComposerRuntimeCoreBinding,
    private _beginEdit: () => void,
  ) {
    const stateBinding = new LazyMemoizeSubject({
      getState: () => getEditComposerState(core.getState(), this._beginEdit),
      subscribe: (callback) => core.subscribe(callback),
    });

    super({
      getState: () => core.getState(),
      subscribe: (callback) => stateBinding.subscribe(callback),
    });

    this._getState = stateBinding.getState.bind(stateBinding);
  }

  public override getState(): EditComposerState {
    return this._getState();
  }

  public beginEdit() {
    this._beginEdit();
  }

  /**
   * @deprecated Use `beginEdit()` instead. This will be removed in 0.6.0.
   */
  public edit() {
    this.beginEdit();
  }

  public getAttachmentByIndex(idx: number) {
    return new EditComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;

          return {
            ...attachment,
            attachment: attachment,
            source: "edit-composer",
          } satisfies AttachmentState & { source: "edit-composer" };
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }
}
