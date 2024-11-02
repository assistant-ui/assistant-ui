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
import { ComposerRuntimePath } from "./RuntimePathTypes";
import { MessageRole } from "../types/AssistantTypes";

export type ThreadComposerRuntimeCoreBinding = SubscribableWithState<
  ThreadComposerRuntimeCore | undefined,
  ComposerRuntimePath & { composerSource: "thread" }
>;

export type EditComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined,
  ComposerRuntimePath & { composerSource: "edit" }
>;

export type ComposerRuntimeCoreBinding = SubscribableWithState<
  ComposerRuntimeCore | undefined,
  ComposerRuntimePath
>;

type BaseComposerState = {
  text: string;
  role: MessageRole;
  attachments: readonly Attachment[];

  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;
};

export type ThreadComposerState = BaseComposerState & {
  type: "thread";

  attachments: readonly PendingAttachment[];
};

export type EditComposerState = BaseComposerState & {
  type: "edit";
};

export type ComposerState = ThreadComposerState | EditComposerState;

const EMPTY_ARRAY = Object.freeze([]);
const getThreadComposerState = (
  runtime: ThreadComposerRuntimeCore | undefined,
): ThreadComposerState => {
  return Object.freeze({
    type: "thread",

    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    text: runtime?.text ?? "",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    role: runtime?.role ?? "user",

    value: runtime?.text ?? "",
  });
};

const getEditComposerState = (
  runtime: ComposerRuntimeCore | undefined,
): EditComposerState => {
  return Object.freeze({
    type: "edit",

    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,
    text: runtime?.text ?? "",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    role: runtime?.role ?? "user",

    value: runtime?.text ?? "",
  });
};

export type ComposerRuntime = {
  path: ComposerRuntimePath;
  readonly type: "edit" | "thread";
  getState(): ComposerState;

  setText(text: string): void;
  setValue(text: string): void;

  getAttachmentAccept(): string;
  addAttachment(file: File): Promise<void>;

  reset(): void;
  send(): void;
  cancel(): void;
  subscribe(callback: () => void): Unsubscribe;
  getAttachmentByIndex(idx: number): AttachmentRuntime;
};

export abstract class ComposerRuntimeImpl implements ComposerRuntime {
  public get path() {
    return this._core.path;
  }

  public abstract get type(): "edit" | "thread";

  constructor(protected _core: ComposerRuntimeCoreBinding) {}

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

  public setRole(role: MessageRole) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setRole(role);
  }

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }

  public getAttachmentAccept(): string {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.getAttachmentAccept();
  }

  public abstract getAttachmentByIndex(idx: number): AttachmentRuntime;
}

export type ThreadComposerRuntime = Omit<
  ComposerRuntime,
  "getState" | "getAttachmentByIndex"
> & {
  readonly path: ComposerRuntimePath & { composerSource: "thread" };
  readonly type: "thread";
  getState(): ThreadComposerState;

  getAttachmentByIndex(
    idx: number,
  ): AttachmentRuntime & { source: "thread-composer" };
};

export class ThreadComposerRuntimeImpl
  extends ComposerRuntimeImpl
  implements ThreadComposerRuntime
{
  public override get path() {
    return this._core.path as ComposerRuntimePath & {
      composerSource: "thread";
    };
  }

  public get type() {
    return "thread" as const;
  }

  private _getState;

  constructor(core: ThreadComposerRuntimeCoreBinding) {
    const stateBinding = new LazyMemoizeSubject({
      path: core.path,
      getState: () => getThreadComposerState(core.getState()),
      subscribe: (callback) => core.subscribe(callback),
    });
    super({
      path: core.path,
      getState: () => core.getState(),
      subscribe: (callback) => stateBinding.subscribe(callback),
    });
    this._getState = stateBinding.getState.bind(stateBinding);
  }

  public override getState(): ThreadComposerState {
    return this._getState();
  }

  public getAttachmentByIndex(idx: number) {
    return new ThreadComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          attachmentSource: "thread-composer",
          attachmentSelector: { type: "index", index: idx },
          ref: this.path.ref + `${this.path.ref}.attachments[${idx}]`,
        },
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;

          return {
            ...attachment,
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
  readonly path: ComposerRuntimePath & { composerSource: "edit" };
  readonly type: "edit";

  getState(): EditComposerState;
  beginEdit(): void;

  getAttachmentByIndex(
    idx: number,
  ): AttachmentRuntime & { source: "edit-composer" };
};

export class EditComposerRuntimeImpl
  extends ComposerRuntimeImpl
  implements EditComposerRuntime
{
  public override get path() {
    return this._core.path as ComposerRuntimePath & { composerSource: "edit" };
  }

  public get type() {
    return "edit" as const;
  }

  private _getState;
  constructor(
    core: EditComposerRuntimeCoreBinding,
    private _beginEdit: () => void,
  ) {
    const stateBinding = new LazyMemoizeSubject({
      path: core.path,
      getState: () => getEditComposerState(core.getState()),
      subscribe: (callback) => core.subscribe(callback),
    });

    super({
      path: core.path,
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

  public getAttachmentByIndex(idx: number) {
    return new EditComposerAttachmentRuntimeImpl(
      new ShallowMemoizeSubject({
        path: {
          ...this.path,
          attachmentSource: "edit-composer",
          attachmentSelector: { type: "index", index: idx },
          ref: this.path.ref + `${this.path.ref}.attachments[${idx}]`,
        },
        getState: () => {
          const attachments = this.getState().attachments;
          const attachment = attachments[idx];
          if (!attachment) return SKIP_UPDATE;

          return {
            ...attachment,
            source: "edit-composer",
          } satisfies AttachmentState & { source: "edit-composer" };
        },
        subscribe: (callback) => this._core.subscribe(callback),
      }),
      this._core,
    );
  }
}
