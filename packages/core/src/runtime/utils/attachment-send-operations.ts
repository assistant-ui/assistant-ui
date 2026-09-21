import type { AttachmentAdapter } from "../../adapters/attachment";
import {
  isAttachmentComplete,
  type Attachment,
  type CompleteAttachment,
} from "../../types/attachment";

export class AttachmentSendOperations {
  // Draft attachments stay pending so discarding an unsent upload still calls remove.
  private readonly entries = new WeakMap<
    Attachment,
    { result?: CompleteAttachment }
  >();
  // Removal marks are per-object and never bulk-cleared: a removed attachment
  // either leaves the draft or is replaced via transfer with a fresh unmarked
  // object, so a mark cannot leak into a later send's batch.
  private readonly removed = new WeakSet<Attachment>();

  markRemoved(attachment: Attachment) {
    this.removed.add(attachment);
  }

  unmarkRemoved(attachment: Attachment) {
    this.removed.delete(attachment);
  }

  isRemoved(attachment: Attachment) {
    return this.removed.has(attachment);
  }

  async send(
    attachment: Attachment,
    adapter: AttachmentAdapter | undefined,
  ): Promise<CompleteAttachment> {
    if (isAttachmentComplete(attachment)) return attachment;
    const entry = this.entries.get(attachment) ?? {};
    if (entry.result) return entry.result;
    if (!adapter) throw new Error("Attachments are not supported");
    this.entries.set(attachment, entry);
    const result = await adapter.send(attachment);
    entry.result = result;
    return result;
  }

  transfer(original: Attachment, replacement: Attachment) {
    const entry = this.entries.get(original);
    if (entry) this.entries.set(replacement, entry);
    return replacement;
  }
}
