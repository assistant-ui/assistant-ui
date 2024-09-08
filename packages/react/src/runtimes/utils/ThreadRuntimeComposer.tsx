import { Attachment } from "../../context/stores/Attachment";
import { AppendMessage } from "../../types";
import { AttachmentAdapter } from "../attachment/AttachmentAdapter";
import { ThreadRuntime } from "../core";

export class ThreadRuntimeComposer implements ThreadRuntime.Composer {
  public adapter?: AttachmentAdapter | undefined;

  constructor(
    private runtime: {
      messages: ThreadRuntime["messages"];
      append: (message: AppendMessage) => void;
    },
    private notifySubscribers: () => void,
  ) {}

  private _attachments: Attachment[] = [];

  get attachments() {
    return this._attachments;
  }

  async addAttachment(file: File) {
    if (!this.adapter) throw new Error("Attachments are not supported");

    const attachment = await this.adapter.add({ file });

    this._attachments = [...this._attachments, attachment];
    this.notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    if (!this.adapter) throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await this.adapter.remove(attachment);

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
    const attachmentContentParts = this.adapter
      ? await Promise.all(
          this.attachments.map(async (a) => {
            const { content } = await this.adapter!.send(a);
            return content;
          }),
        )
      : [];

    this.runtime.append({
      parentId: this.runtime.messages.at(-1)?.id ?? null,
      role: "user",
      content: this.text
        ? [{ type: "text", text: this.text }, ...attachmentContentParts.flat()]
        : [],
      attachments: this.attachments,
    });
    this.reset();
  }
}
