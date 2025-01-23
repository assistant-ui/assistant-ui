import { Attachment, PendingAttachment } from "../types/AttachmentTypes";
import {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
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
import { MessageRole, RunConfig } from "../types/AssistantTypes";
import { EventSubscriptionSubject } from "./subscribable/EventSubscriptionSubject";

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
  readonly canCancel: boolean;
  readonly isEditing: boolean;
  readonly isEmpty: boolean;

  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
};

export type ThreadComposerState = BaseComposerState & {
  readonly type: "thread";

  readonly attachments: readonly PendingAttachment[];
};

export type EditComposerState = BaseComposerState & {
  readonly type: "edit";
};

export type ComposerState = ThreadComposerState | EditComposerState;

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});
const getThreadComposerState = (
  runtime: ThreadComposerRuntimeCore | undefined,
): ThreadComposerState => {
  return Object.freeze({
    type: "thread",

    isEditing: runtime?.isEditing ?? false,
    canCancel: runtime?.canCancel ?? false,
    isEmpty: runtime?.isEmpty ?? true,

    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    text: runtime?.text ?? "",
    role: runtime?.role ?? "user",
    runConfig: runtime?.runConfig ?? EMPTY_OBJECT,

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
    role: runtime?.role ?? "user",
    attachments: runtime?.attachments ?? EMPTY_ARRAY,
    runConfig: runtime?.runConfig ?? EMPTY_OBJECT,

    value: runtime?.text ?? "",
  });
};

export type ComposerRuntime = {
  readonly path: ComposerRuntimePath;
  readonly type: "edit" | "thread";
  getState(): ComposerState;

  getAttachmentAccept(): string;
  addAttachment(file: File): Promise<void>;

  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;

  reset(): Promise<void>;
  clearAttachments(): Promise<void>;

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

  protected __internal_bindMethods() {
    this.setText = this.setText.bind(this);
    this.setRunConfig = this.setRunConfig.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.addAttachment = this.addAttachment.bind(this);
    this.reset = this.reset.bind(this);
    this.clearAttachments = this.clearAttachments.bind(this);
    this.send = this.send.bind(this);
    this.cancel = this.cancel.bind(this);
    this.setRole = this.setRole.bind(this);
    this.getAttachmentAccept = this.getAttachmentAccept.bind(this);
    this.getAttachmentByIndex = this.getAttachmentByIndex.bind(this);
    this.unstable_on = this.unstable_on.bind(this);
  }

  public abstract getState(): ComposerState;

  public setText(text: string) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setText(text);
  }

  public setRunConfig(runConfig: RunConfig) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    core.setRunConfig(runConfig);
  }

  public addAttachment(file: File) {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.addAttachment(file);
  }

  public reset() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.reset();
  }

  public clearAttachments() {
    const core = this._core.getState();
    if (!core) throw new Error("Composer is not available");
    return core.clearAttachments();
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

  private _eventSubscriptionSubjects = new Map<
    string,
    EventSubscriptionSubject<ComposerRuntimeEventType>
  >();

  public unstable_on(
    event: ComposerRuntimeEventType,
    callback: () => void,
  ): Unsubscribe {
    let subject = this._eventSubscriptionSubjects.get(event);
    if (!subject) {
      subject = new EventSubscriptionSubject({
        event: event,
        binding: this._core,
      });
      this._eventSubscriptionSubjects.set(event, subject);
    }
    return subject.subscribe(callback);
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

  public override __internal_bindMethods() {
    super.__internal_bindMethods();
    this.beginEdit = this.beginEdit.bind(this);
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
