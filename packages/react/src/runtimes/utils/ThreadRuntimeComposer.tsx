import { Attachment } from "../../context/stores/Attachment";
import { ThreadRuntime } from "../core";

export class ThreadRuntimeComposer implements ThreadRuntime.Composer {
  constructor(private notifySubscribers: () => void) {}

  private _attachments: Attachment[] = [];

  get attachments() {
    return this._attachments;
  }

  addAttachment(attachment: Attachment) {
    this._attachments = [...this._attachments, attachment];
    this.notifySubscribers();
  }

  removeAttachment(attachmentId: string) {
    this._attachments = this._attachments.filter((a) => a.id !== attachmentId);
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
}
