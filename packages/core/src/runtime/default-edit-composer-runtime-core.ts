import type { AppendMessage, ThreadMessage } from "../types";
import { getThreadMessageText } from "../utils/text";
import type { AttachmentAdapter } from "./adapters/attachment";
import type { DictationAdapter } from "./adapters/speech";
import type { ThreadRuntimeCore } from "./thread-runtime-core";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";

export class DefaultEditComposerRuntimeCore extends BaseComposerRuntimeCore {
  public get canCancel() {
    return true;
  }

  protected getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }

  protected getDictationAdapter() {
    return this.runtime.adapters?.dictation;
  }

  private _nonTextParts;
  private _previousText;
  private _parentId;
  private _sourceId;
  constructor(
    private runtime: ThreadRuntimeCore & {
      adapters?:
        | {
            attachments?: AttachmentAdapter | undefined;
            dictation?: DictationAdapter | undefined;
          }
        | undefined;
    },
    private endEditCallback: () => void,
    { parentId, message }: { parentId: string | null; message: ThreadMessage },
  ) {
    super();
    this._parentId = parentId;
    this._sourceId = message.id;
    this._previousText = getThreadMessageText(message);
    this.setText(this._previousText);

    this.setRole(message.role);
    this.setAttachments(message.attachments ?? []);

    this._nonTextParts = message.content.filter((part) => part.type !== "text");

    this.setRunConfig({ ...runtime.composer.runConfig });
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
  ) {
    const text = getThreadMessageText(message as AppendMessage);
    if (text !== this._previousText) {
      this.runtime.append({
        ...message,
        content: [...message.content, ...this._nonTextParts] as any,
        parentId: this._parentId,
        sourceId: this._sourceId,
      });
    }

    this.handleCancel();
  }

  public handleCancel() {
    this.endEditCallback();
    this._notifySubscribers();
  }
}
