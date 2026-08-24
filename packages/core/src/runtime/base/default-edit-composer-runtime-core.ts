import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { CompleteAttachment } from "../../types/attachment";
import { getThreadMessageText } from "../../utils/text";
import { liftNonTextParts } from "../../adapters/attachment";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { DictationAdapter } from "../../adapters/speech";
import type { SendOptions } from "../interfaces/composer-runtime-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { BaseComposerRuntimeCore } from "./base-composer-runtime-core";

export class DefaultEditComposerRuntimeCore extends BaseComposerRuntimeCore {
  public get canCancel() {
    return true;
  }

  public get canSend() {
    return !this.isEmpty && !this._isSending;
  }

  protected getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }

  protected getDictationAdapter() {
    return this.runtime.adapters?.dictation;
  }

  private _nonTextPassthrough: readonly ThreadMessage["content"][number][];
  private _parentId: string | null;
  private _sourceId: string | null;
  private runtime: ThreadRuntimeCore & {
    adapters?:
      | {
          attachments?: AttachmentAdapter | undefined;
          dictation?: DictationAdapter | undefined;
        }
      | undefined;
  };
  private endEditCallback: () => void;

  constructor(
    runtime: ThreadRuntimeCore & {
      adapters?:
        | {
            attachments?: AttachmentAdapter | undefined;
            dictation?: DictationAdapter | undefined;
          }
        | undefined;
    },
    endEditCallback: () => void,
    { parentId, message }: { parentId: string | null; message: ThreadMessage },
  ) {
    super();
    this.runtime = runtime;
    this.endEditCallback = endEditCallback;
    this._parentId = parentId;
    this._sourceId = message.id;
    this.setText(getThreadMessageText(message));

    this.setRole(message.role);

    let attachments: readonly CompleteAttachment[];
    if (message.role === "user") {
      attachments = [
        ...(message.attachments ?? []),
        ...liftNonTextParts(message.content),
      ];
      this._nonTextPassthrough = [];
    } else {
      attachments = message.attachments ?? [];
      this._nonTextPassthrough = message.content.filter(
        (p) => p.type !== "text",
      );
    }
    this.setAttachments(attachments);

    this.setRunConfig({ ...runtime.composer.runConfig });
  }

  public get parentId() {
    return this._parentId;
  }

  public get sourceId() {
    return this._sourceId;
  }

  public async handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
  ) {
    const content =
      this._nonTextPassthrough.length > 0
        ? ([
            ...message.content,
            ...this._nonTextPassthrough,
          ] as AppendMessage["content"])
        : message.content;
    const appendTask = this.runtime.append({
      ...message,
      content,
      parentId: this._parentId,
      sourceId: this._sourceId,
      startRun: options?.startRun,
    });

    this.handleCancel();
    return appendTask;
  }

  public handleCancel() {
    this.endEditCallback();
    this._notifySubscribers();
  }
}
