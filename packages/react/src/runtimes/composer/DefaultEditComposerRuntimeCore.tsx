import { AppendMessage, ThreadMessage } from "../../types";
import { getThreadMessageText } from "../../utils/getThreadMessageText";
import { ThreadRuntimeCore } from "../core/ThreadRuntimeCore";
import { BaseComposerRuntimeCore } from "./BaseComposerRuntimeCore";

export class DefaultEditComposerRuntimeCore extends BaseComposerRuntimeCore {
  public get canCancel() {
    return true;
  }

  private _nonTextParts;
  private _previousText;
  private _parentId;
  constructor(
    private runtime: Omit<ThreadRuntimeCore, "composer">,
    private endEditCallback: () => void,
    { parentId, message }: { parentId: string | null; message: ThreadMessage },
  ) {
    super();
    this._parentId = parentId;
    this._previousText = getThreadMessageText(message);
    this.setText(this._previousText);

    this._nonTextParts = message.content.filter(
      (part) => part.type !== "text" && part.type !== "ui",
    );

    // TODO differentiate between "sent" and "pending" attachments instead of Composer/Message Attachments
    // this.attachments = message.attachments ?? [];
  }

  public async handleSend(message: Omit<AppendMessage, "parentId">) {
    const text = getThreadMessageText(message as AppendMessage);
    if (text !== this._previousText) {
      this.runtime.append({
        ...(message as AppendMessage),
        content: [...message.content, ...this._nonTextParts] as any,
        parentId: this._parentId,
      });
    }

    this.endEditCallback();
    this.notifySubscribers();
  }

  public async cancel() {
    this.endEditCallback();
    this.notifySubscribers();
  }
}
