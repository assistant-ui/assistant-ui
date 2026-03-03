import type {
  AppendMessage,
  CompleteAttachment,
  ThreadMessage,
} from "../../types";
import { getThreadMessageText } from "../../utils/text";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";

const attachmentsEqual = (
  a: readonly CompleteAttachment[],
  b: readonly CompleteAttachment[],
): boolean => {
  if (a.length !== b.length) return false;
  return a.every((att, i) => att.id === b[i]!.id);
};

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
  private _previousAttachments;
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
    this._previousAttachments = message.attachments ?? [];
    this.setAttachments(this._previousAttachments);

    this._nonTextParts = message.content.filter((part) => part.type !== "text");

    this.setRunConfig({ ...runtime.composer.runConfig });
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
  ) {
    const text = getThreadMessageText(message as AppendMessage);
    const currentAttachments = message.attachments ?? [];
    const didAttachmentsChange = !attachmentsEqual(
      currentAttachments,
      this._previousAttachments,
    );

    if (text !== this._previousText || didAttachmentsChange) {
      // Re-inject original non-text content parts (file parts, image parts,etc.) only when attachments are unchanged. When attachments changed,
      // we drop _nonTextParts entirely — this assumes all non-text content parts are attachment-derived.
      // Future non-attachment content types would need separate tracking here.
      const content = didAttachmentsChange
        ? message.content
        : [...message.content, ...this._nonTextParts];

      this.runtime.append({
        ...message,
        content: content as any,
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
