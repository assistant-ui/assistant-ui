import {
  Attachment,
  CompleteAttachment,
  PendingAttachment,
} from "../../types/AttachmentTypes";
import { AppendMessage } from "../../types";
import { AttachmentAdapter } from "../attachment";
import {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
} from "../core/ComposerRuntimeCore";
import { MessageRole, RunConfig } from "../../types/AssistantTypes";
import { BaseSubscribable } from "../remote-thread-list/BaseSubscribable";

const isAttachmentComplete = (a: Attachment): a is CompleteAttachment =>
  a.status.type === "complete";

export abstract class BaseComposerRuntimeCore
  extends BaseSubscribable
  implements ComposerRuntimeCore
{
  public readonly isEditing = true;

  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;

  public getAttachmentAccept(): string {
    return this.getAttachmentAdapter()?.accept ?? "*";
  }

  private _attachments: readonly Attachment[] = [];
  public get attachments() {
    return this._attachments;
  }

  protected setAttachments(value: readonly Attachment[]) {
    this._attachments = value;
    this._notifySubscribers();
  }

  public abstract get canCancel(): boolean;

  public get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }

  private _text = "";

  get text() {
    return this._text;
  }

  private _role: MessageRole = "user";

  get role() {
    return this._role;
  }

  private _runConfig: RunConfig = {};

  get runConfig() {
    return this._runConfig;
  }

  public setText(value: string) {
    if (this._text === value) return;

    this._text = value;
    this._notifySubscribers();
  }

  public setRole(role: MessageRole) {
    if (this._role === role) return;

    this._role = role;
    this._notifySubscribers();
  }

  public setRunConfig(runConfig: RunConfig) {
    if (this._runConfig === runConfig) return;

    this._runConfig = runConfig;
    this._notifySubscribers();
  }

  private _emptyTextAndAttachments() {
    this._attachments = [];
    this._text = "";
    this._notifySubscribers();
  }

  private async _onClearAttachments() {
    const adapter = this.getAttachmentAdapter();
    if (adapter) {
      await Promise.all(this._attachments.map((a) => adapter.remove(a)));
    }
  }

  public async reset() {
    if (
      this._attachments.length === 0 &&
      this._text === "" &&
      this._role === "user" &&
      Object.keys(this._runConfig).length === 0
    ) {
      return;
    }

    this._role = "user";
    this._runConfig = {};

    const task = this._onClearAttachments();
    this._emptyTextAndAttachments();
    await task;
  }

  public async clearAttachments() {
    const task = this._onClearAttachments();
    this.setAttachments([]);

    await task;
  }

  public async send() {
    const adapter = this.getAttachmentAdapter();
    const attachments =
      adapter && this.attachments.length > 0
        ? await Promise.all(
            this.attachments.map(async (a) => {
              if (isAttachmentComplete(a)) return a;
              const result = await adapter.send(a);
              return result as CompleteAttachment;
            }),
          )
        : [];

    const message: Omit<AppendMessage, "parentId"> = {
      role: this.role,
      content: this.text ? [{ type: "text", text: this.text }] : [],
      attachments,
      runConfig: this.runConfig,
    };
    this._emptyTextAndAttachments();

    this.handleSend(message);
    this._notifyEventSubscribers("send");
  }

  public cancel() {
    this.handleCancel();
  }

  protected abstract handleSend(message: Omit<AppendMessage, "parentId">): void;
  protected abstract handleCancel(): void;

  async addAttachment(file: File) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const attachment = await adapter.add({ file });

    this._attachments = [...this._attachments, attachment as PendingAttachment];
    this._notifyEventSubscribers("attachment_add");
    this._notifySubscribers();
  }

  async removeAttachment(attachmentId: string) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) throw new Error("Attachments are not supported");

    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    await adapter.remove(attachment);

    this._attachments = this._attachments.toSpliced(index, 1);
    this._notifySubscribers();
  }

  private _eventSubscribers = new Map<
    ComposerRuntimeEventType,
    Set<() => void>
  >();

  protected _notifyEventSubscribers(event: ComposerRuntimeEventType) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;

    for (const callback of subscribers) callback();
  }

  public unstable_on(event: ComposerRuntimeEventType, callback: () => void) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      this._eventSubscribers.set(event, new Set([callback]));
    } else {
      subscribers.add(callback);
    }

    return () => {
      const subscribers = this._eventSubscribers.get(event);
      if (!subscribers) return;
      subscribers.delete(callback);
    };
  }
}
