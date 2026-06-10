import type { AppendMessage } from "../../types/message";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type {
  SendOptions,
  ThreadComposerRuntimeCore,
} from "../interfaces/composer-runtime-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import {
  EMPTY_QUEUE_ITEMS,
  type QueueItemState,
} from "../../store/scopes/queue-item";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";
import { gateInteractableComposerMetadata } from "../../model-context/interactable-composer-metadata";

export class DefaultThreadComposerRuntimeCore
  extends BaseComposerRuntimeCore
  implements ThreadComposerRuntimeCore
{
  private _canCancel = false;
  public get canCancel() {
    return this._canCancel;
  }

  public get canSend() {
    return !this.isEmpty && !this.runtime.isSendDisabled;
  }

  public override get queue(): readonly QueueItemState[] {
    return this.runtime.getQueueItems?.() ?? EMPTY_QUEUE_ITEMS;
  }

  public override steerQueueItem(queueItemId: string): void {
    this.runtime.steerQueueItem?.(queueItemId);
  }

  public override removeQueueItem(queueItemId: string): void {
    this.runtime.removeQueueItem?.(queueItemId);
  }

  protected getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }

  protected getDictationAdapter() {
    return this.runtime.adapters?.dictation;
  }

  constructor(
    private runtime: Omit<ThreadRuntimeCore, "composer"> & {
      adapters?:
        | {
            attachments?: AttachmentAdapter | undefined;
            dictation?: DictationAdapter | undefined;
          }
        | undefined;
    },
  ) {
    super();
    this.connect();
  }

  public connect() {
    let lastIsSendDisabled = this.runtime.isSendDisabled;
    let lastQueue = this.queue;
    return this.runtime.subscribe(() => {
      let changed = false;
      if (this.canCancel !== this.runtime.capabilities.cancel) {
        this._canCancel = this.runtime.capabilities.cancel;
        changed = true;
      }
      if (lastIsSendDisabled !== this.runtime.isSendDisabled) {
        lastIsSendDisabled = this.runtime.isSendDisabled;
        changed = true;
      }
      if (lastQueue !== this.queue) {
        lastQueue = this.queue;
        changed = true;
      }
      if (changed) this._notifySubscribers();
    });
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
  ) {
    // Merge provider-contributed metadata onto the outgoing user message
    // (same metadata.custom append path quotes ride). The interactables gate
    // runs here because it needs thread history, unavailable to the provider.
    const composerMetadata = gateInteractableComposerMetadata(
      this.runtime.getModelContext().unstable_composerMetadata,
      this.runtime.messages,
    );
    const enriched = composerMetadata
      ? {
          ...message,
          metadata: {
            ...message.metadata,
            custom: { ...message.metadata?.custom, ...composerMetadata },
          },
        }
      : message;

    this.runtime.append({
      ...(enriched as AppendMessage),
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      sourceId: null,
      startRun: options?.startRun,
      steer: options?.steer,
    });
  }

  public async handleCancel() {
    this.runtime.cancelRun();
  }
}
