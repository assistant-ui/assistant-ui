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
  // An attachment whose removal failed while its message was being prepared
  // is held out of that message only; the draft it returns to gets it back.
  // Removing it again makes that removal the pending one, so it is no longer
  // held out.
  private readonly heldOut = new WeakSet<Attachment>();

  markRemoved(attachment: Attachment) {
    this.removed.add(attachment);
    this.heldOut.delete(attachment);
  }

  unmarkRemoved(attachment: Attachment) {
    this.removed.delete(attachment);
  }

  isRemoved(attachment: Attachment) {
    return this.removed.has(attachment);
  }

  holdOut(attachment: Attachment) {
    this.removed.add(attachment);
    this.heldOut.add(attachment);
  }

  isRemovalPending(attachment: Attachment) {
    return this.removed.has(attachment) && !this.heldOut.has(attachment);
  }

  restore(attachment: Attachment) {
    if (!this.heldOut.has(attachment)) return attachment;
    return this.transfer(attachment, { ...attachment });
  }

  async send(
    attachment: Attachment,
    adapter: AttachmentAdapter | undefined,
    signal?: AbortSignal,
  ): Promise<CompleteAttachment> {
    if (isAttachmentComplete(attachment)) return attachment;
    const entry = this.entries.get(attachment) ?? {};
    if (entry.result) return entry.result;
    if (!adapter) throw new Error("Attachments are not supported");
    this.entries.set(attachment, entry);
    const result = await adapter.send(
      attachment,
      signal ? { signal } : undefined,
    );
    entry.result = result;
    return result;
  }

  transfer(original: Attachment, replacement: Attachment) {
    const entry = this.entries.get(original);
    if (entry) this.entries.set(replacement, entry);
    return replacement;
  }
}
