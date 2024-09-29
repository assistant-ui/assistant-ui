import { SubscribableWithState } from "./subscribable/Subscribable";

import { ComposerRuntimeCoreBinding } from "./ComposerRuntime";
import { Attachment, CompleteAttachment, PendingAttachment } from "../types";

type MessageAttachmentState = CompleteAttachment & {
  source: "message";
  /**
   * @deprecated You can directly access content part fields in the state. Replace `.attachment.type` with `.type` etc. This will be removed in 0.6.0.
   */
  attachment: CompleteAttachment;
};

type ThreadComposerAttachmentState = PendingAttachment & {
  source: "thread-composer";
  /**
   * @deprecated You can directly access content part fields in the state. Replace `.attachment.type` with `.type` etc. This will be removed in 0.6.0.
   */
  attachment: PendingAttachment;
};

type EditComposerAttachmentState = Attachment & {
  source: "edit-composer";
  /**
   * @deprecated You can directly access content part fields in the state. Replace `.attachment.type` with `.type` etc. This will be removed in 0.6.0.
   */
  attachment: Attachment;
};

export type AttachmentState =
  | ThreadComposerAttachmentState
  | EditComposerAttachmentState
  | MessageAttachmentState;

type AttachmentSnapshotBinding<Source extends AttachmentRuntimeSource> =
  SubscribableWithState<AttachmentState & { source: Source }>;

type AttachmentRuntimeSource = AttachmentState["source"];

export abstract class AttachmentRuntime<
  Source extends AttachmentRuntimeSource = AttachmentRuntimeSource,
> {
  public abstract get source(): Source;

  constructor(private _core: AttachmentSnapshotBinding<Source>) {}

  public getState(): AttachmentState & { source: Source } {
    return this._core.getState();
  }

  public abstract remove(): Promise<void>;

  public subscribe(callback: () => void) {
    return this._core.subscribe(callback);
  }
}

abstract class ComposerAttachmentRuntime<
  Source extends "thread-composer" | "edit-composer",
> extends AttachmentRuntime<Source> {
  constructor(
    core: AttachmentSnapshotBinding<Source>,
    private _composerApi: ComposerRuntimeCoreBinding,
  ) {
    super(core);
  }

  public remove() {
    const core = this._composerApi.getState();
    if (!core) throw new Error("Composer is not available");
    return core.removeAttachment(this.getState().id);
  }
}

export class ThreadComposerAttachmentRuntime extends ComposerAttachmentRuntime<"thread-composer"> {
  public get source(): "thread-composer" {
    return "thread-composer";
  }
}

export class EditComposerAttachmentRuntime extends ComposerAttachmentRuntime<"edit-composer"> {
  public get source(): "edit-composer" {
    return "edit-composer";
  }
}

export class MessageAttachmentRuntime extends AttachmentRuntime<"message"> {
  public get source(): "message" {
    return "message";
  }

  constructor(core: AttachmentSnapshotBinding<"message">) {
    super(core);
  }

  public remove(): never {
    throw new Error("Message attachments cannot be removed");
  }
}
