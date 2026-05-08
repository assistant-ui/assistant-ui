import type { AppendMessage } from "../../types/message";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type {
  SendOptions,
  ThreadComposerRuntimeCore,
} from "../interfaces/composer-runtime-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";

export class DefaultThreadComposerRuntimeCore
  extends BaseComposerRuntimeCore
  implements ThreadComposerRuntimeCore
{
  private _canCancel = false;
  public get canCancel() {
    return this._canCancel;
  }

  public get canSend() {
    return this.isEditing && !this.isEmpty && !this.runtime.isSendDisabled;
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
      if (changed) this._notifySubscribers();
    });
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
  ) {
    this.runtime.append({
      ...(message as AppendMessage),
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      sourceId: null,
      startRun: options?.startRun,
    });
  }

  public async handleCancel() {
    this.runtime.cancelRun();
  }
}
