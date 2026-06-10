import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { CompleteAttachment } from "../../types/attachment";
import { getThreadMessageText } from "../../utils/text";
import { attachmentsEqual, liftNonTextParts } from "../../adapters/attachment";
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
    return !this.isEmpty;
  }

  protected getAttachmentAdapter() {
    return this.runtime.adapters?.attachments;
  }

  protected getDictationAdapter() {
    return this.runtime.adapters?.dictation;
  }

  private _previousText;
  private _previousAttachments: readonly CompleteAttachment[];
  private _nonTextPassthrough: readonly ThreadMessage["content"][number][];
  private _parentId: string | null;
  private _sourceId: string | null;
  private _sourceInteractables: unknown;
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
    // Preserve the interactable snapshot this message ran with so the new branch
    // keeps its model-facing baseline (the edit composer rebuilds metadata fresh).
    this._sourceInteractables = (
      message.metadata?.custom as Record<string, unknown> | undefined
    )?.interactables;
    this._previousText = getThreadMessageText(message);
    this.setText(this._previousText);

    this.setRole(message.role);

    if (message.role === "user") {
      this._previousAttachments = [
        ...(message.attachments ?? []),
        ...liftNonTextParts(message.content),
      ];
      this._nonTextPassthrough = [];
    } else {
      this._previousAttachments = message.attachments ?? [];
      this._nonTextPassthrough = message.content.filter(
        (p) => p.type !== "text",
      );
    }
    this.setAttachments(this._previousAttachments);

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
    const text = getThreadMessageText(message as AppendMessage);
    const attachmentsChanged = !attachmentsEqual(
      message.attachments ?? [],
      this._previousAttachments,
    );

    if (
      text !== this._previousText ||
      attachmentsChanged ||
      options?.startRun
    ) {
      const content =
        this._nonTextPassthrough.length > 0
          ? ([
              ...message.content,
              ...this._nonTextPassthrough,
            ] as AppendMessage["content"])
          : message.content;
      const enriched = this._sourceInteractables
        ? {
            ...message,
            metadata: {
              ...message.metadata,
              custom: {
                ...message.metadata?.custom,
                interactables: this._sourceInteractables,
              },
            },
          }
        : message;
      this.runtime.append({
        ...enriched,
        content,
        parentId: this._parentId,
        sourceId: this._sourceId,
        startRun: options?.startRun,
      });
    }

    this.handleCancel();
  }

  public handleCancel() {
    this.endEditCallback();
    this._notifySubscribers();
  }
}
