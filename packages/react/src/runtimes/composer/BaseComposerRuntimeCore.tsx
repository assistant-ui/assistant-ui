import {
  Attachment,
  CompleteAttachment,
  PendingAttachment,
} from "../../types/AttachmentTypes";
import { AppendMessage, Unsubscribe } from "../../types";
import { AttachmentAdapter } from "../attachment";
import { ComposerRuntimeCore } from "../core/ComposerRuntimeCore";

const isAttachmentComplete = (a: Attachment): a is CompleteAttachment =>
  a.status.type === "complete";

export abstract class BaseComposerRuntimeCore implements ComposerRuntimeCore {
  public readonly isEditing = true;

  public attachmentAccept: string = "*";

  private _attachments: readonly Attachment[] = [];
  protected set attachments(value: readonly Attachment[]) {
    this._attachments = value;
    this.notifySubscribers();
  }
  public get attachments() {
    return this._attachments;
  }

  public abstract get canCancel(): boolean;

  public get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }

  private _text = "";

  get text() {
    return this._text;
  }

  setText(value: string) {
    this._text = value;
    this.notifySubscribers();
  }

  reset() {
    this._text = "";
    this._attachments = [];
    this.notifySubscribers();
  }

  public async send() {
    const attachments = this._attachmentAdapter
      ? await Promise.all(
          this.attachments.map(async (a) => {
            if (isAttachmentComplete(a)) return a;
            const result = await this._attachmentAdapter!.send(a);
            // TODO remove after 0.6.0
            if (result.status?.type !== "complete") {
              result.status = { type: "complete" };
            }
            return result as CompleteAttachment;
          }),
        )
      : [];

    const message: Omit<AppendMessage, "parentId"> = {
      role: "user",
      content: this.text ? [{ type: "text", text: this.text }] : [],
      attachments,
    };
    this.reset();

    this.handleSend(message);
  }
  public abstract handleSend(message: Omit<AppendMessage, "parentId">): void;
  public abstract cancel(): void;

  protected _attachmentAdapter?: AttachmentAdapter | undefined;
  public setAttachmentAdapter(adapter: AttachmentAdapter | undefined) {
    this._attachmentAdapter = adapter;
    const accept = adapter?.accept ?? "*";
    if (this.attachmentAccept !== accept) {
      this.attachmentAccept = accept;
      this.notifySubscribers();
    }
  }

  async addAttachment(file: File) {
    if (!this._attachmentAdapter)
      throw new Error("Attachments are not supported");

    const attachment = await this._attachmentAdapter.add({ file });
    // TODO remove after 0.6.0
    if (attachment.status === undefined) {
      attachment.status = { type: "requires-action", reason: "composer-send" };
    }

    this._attachments = [...this._attachments, attachment as PendingAttachment];
    this.notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    if (!this._attachmentAdapter)
      throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await this._attachmentAdapter.remove(attachment);

    this._attachments = this._attachments.toSpliced(index, 1);
    this.notifySubscribers();
  }

  private _subscriptions = new Set<() => void>();
  protected notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }
}
