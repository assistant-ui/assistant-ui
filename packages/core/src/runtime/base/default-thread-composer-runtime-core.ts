import type { AppendMessage, MessageRole } from "../../types/message";
import type { CompleteAttachment } from "../../types/attachment";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type {
  SendOptions,
  ThreadComposerRuntimeCore,
} from "../interfaces/composer-runtime-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import type { QueuePlacement } from "../queue/external-thread-queue-adapter";
import {
  EMPTY_QUEUE_ITEMS,
  type QueueItemState,
} from "../../store/scopes/queue-item";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";
import { getOptimisticAttachmentSend } from "../utils/optimistic-attachment-send";

export class DefaultThreadComposerRuntimeCore
  extends BaseComposerRuntimeCore
  implements ThreadComposerRuntimeCore
{
  private _canCancel = false;
  public get canCancel() {
    return this._canCancel;
  }

  public get canSend() {
    return !this.isEmpty && !this.runtime.isSendDisabled && !this._isSending;
  }

  private _queueCache:
    | {
        steer: readonly QueueItemState[];
        queue: readonly QueueItemState[];
        flat: readonly QueueItemState[];
      }
    | undefined;

  public override get queue(): readonly QueueItemState[] {
    const steer = this.runtime.getSteerQueueItems?.() ?? EMPTY_QUEUE_ITEMS;
    const queue = this.runtime.getQueueItems?.() ?? EMPTY_QUEUE_ITEMS;
    const cache = this._queueCache;
    if (cache && cache.steer === steer && cache.queue === queue)
      return cache.flat;
    const flat =
      steer.length === 0
        ? queue
        : queue.length === 0
          ? steer
          : [...steer, ...queue];
    this._queueCache = { steer, queue, flat };
    return flat;
  }

  public override moveQueueItem(
    queueItemId: string,
    placement: QueuePlacement,
  ): void {
    this.runtime.moveQueueItem?.(queueItemId, placement);
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

  private runtime: Omit<ThreadRuntimeCore, "composer"> & {
    adapters?:
      | {
          attachments?: AttachmentAdapter | undefined;
          dictation?: DictationAdapter | undefined;
        }
      | undefined;
  };

  constructor(
    runtime: Omit<ThreadRuntimeCore, "composer"> & {
      adapters?:
        | {
            attachments?: AttachmentAdapter | undefined;
            dictation?: DictationAdapter | undefined;
          }
        | undefined;
    },
  ) {
    super();
    this.runtime = runtime;
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

  protected override supportsOptimisticAttachmentSend(
    role: MessageRole,
    options: SendOptions | undefined,
  ) {
    if (role !== "user") return false;
    if (!getOptimisticAttachmentSend(this.runtime)) return false;
    // A queued run reorders the message, so the placeholder could land at a
    // position the completed message never occupies.
    return !this.runtime.capabilities.queue || options?.startRun === false;
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
    uploadAttachments?: () => Promise<readonly CompleteAttachment[]>,
  ) {
    const appendMessage: AppendMessage = {
      ...(message as AppendMessage),
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      sourceId: null,
      startRun: options?.startRun,
      steer: options?.steer,
    };

    if (!uploadAttachments) {
      return this.runtime.append(appendMessage);
    }

    const appendOptimistic = getOptimisticAttachmentSend(this.runtime);
    if (!appendOptimistic) {
      return this.runtime.append({
        ...appendMessage,
        attachments: await uploadAttachments(),
      });
    }
    return appendOptimistic(appendMessage, uploadAttachments);
  }

  public async handleCancel() {
    this.runtime.cancelRun();
  }
}
