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

  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;

  public getAttachmentAccept(): string {
    return this.getAttachmentAdapter()?.accept ?? "*";
  }

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
    const adapter = this.getAttachmentAdapter();
    const attachments =
      adapter && this.attachments.length > 0
        ? await Promise.all(
            this.attachments.map(async (a) => {
              if (isAttachmentComplete(a)) return a;
              const result = await adapter.send(a);
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

  async addAttachment(file: File) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const attachment = await adapter.add({ file });
    // TODO remove after 0.6.0
    if (attachment.status === undefined) {
      attachment.status = { type: "requires-action", reason: "composer-send" };
    }

    this._attachments = [...this._attachments, attachment as PendingAttachment];
    this.notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await adapter.remove(attachment);

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
