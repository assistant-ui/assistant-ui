import { AppendMessage } from "../../types";
import { ThreadRuntimeCore } from "../core/ThreadRuntimeCore";
import { BaseComposerRuntimeCore } from "./BaseComposerRuntimeCore";

export class DefaultThreadComposerRuntimeCore extends BaseComposerRuntimeCore {
  private _canCancel = false;
  public get canCancel() {
    return this._canCancel;
  }

  constructor(private runtime: Omit<ThreadRuntimeCore, "composer">) {
    super();
    this.connect();
  }

  public connect() {
    return this.runtime.subscribe(() => {
      if (this.canCancel !== this.runtime.capabilities.cancel) {
        this._canCancel = this.runtime.capabilities.cancel;
        this.notifySubscribers();
      }
    });
  }

  public async handleSend(message: Omit<AppendMessage, "parentId">) {
    this.runtime.append({
      ...(message as AppendMessage),
      parentId: this.runtime.messages.at(-1)?.id ?? null,
    });
  }

  public async cancel() {
    this.runtime.cancelRun();
  }
}
