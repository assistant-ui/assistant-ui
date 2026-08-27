import type { AppendMessage } from "../../types/message";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type {
  SendOptions,
  ThreadComposerRuntimeCore,
} from "../interfaces/composer-runtime-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { getThreadRuntimeCoreIsRunning } from "../api/thread-runtime";
import type { QueuePlacement } from "../queue/external-thread-queue-adapter";
import { EMPTY_QUEUE_ITEMS, type QueueItemState } from "../queue/queue-item";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";

const isCancelable = (runtime: Omit<ThreadRuntimeCore, "composer">) => {
  // capabilities is a subclass field assigned after this composer is constructed
  if (!runtime.capabilities?.cancel) return false;
  return getThreadRuntimeCoreIsRunning(runtime);
};

export class DefaultThreadComposerRuntimeCore
  extends BaseComposerRuntimeCore
  implements ThreadComposerRuntimeCore
{
  public get canCancel() {
    return isCancelable(this.runtime);
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
    let lastCanCancel = false;
    let lastIsSendDisabled = this.runtime.isSendDisabled;
    let lastQueue = this.queue;
    return this.runtime.subscribe(() => {
      let changed = false;
      const nextCanCancel = this.canCancel;
      if (lastCanCancel !== nextCanCancel) {
        lastCanCancel = nextCanCancel;
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
    return this.runtime.append({
      ...(message as AppendMessage),
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
