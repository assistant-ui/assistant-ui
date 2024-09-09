import { ThreadComposerAttachment } from "../../context/stores/Attachment";
import { AppendMessage } from "../../types";
import { AttachmentAdapter } from "../attachment/AttachmentAdapter";
import { ThreadRuntime } from "../core";

export class ThreadRuntimeComposer implements ThreadRuntime.Composer {
  private _attachmentAdapter?: AttachmentAdapter | undefined;

  public attachmentAccept: string = "*";

  public get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }

  constructor(
    private runtime: {
      messages: ThreadRuntime["messages"];
      append: (message: AppendMessage) => void;
    },
    private notifySubscribers: () => void,
  ) {}

  public setAttachmentAdapter(adapter: AttachmentAdapter | undefined) {
    this._attachmentAdapter = adapter;
    const accept = adapter?.accept ?? "*";
    if (this.attachmentAccept !== accept) {
      this.attachmentAccept = accept;
      return true;
    }
    return false;
  }

  private _attachments: ThreadComposerAttachment[] = [];

  public get attachments() {
    return this._attachments;
  }

  async addAttachment(file: File) {
    if (!this._attachmentAdapter)
      throw new Error("Attachments are not supported");

    const attachment = await this._attachmentAdapter.add({ file });

    this._attachments = [...this._attachments, attachment];
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
          this.attachments.map(
            async (a) => await this._attachmentAdapter!.send(a),
          ),
        )
      : [];

    this.runtime.append({
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      role: "user",
      content: this.text ? [{ type: "text", text: this.text }] : [],
      attachments,
    });
    this.reset();
  }
}
