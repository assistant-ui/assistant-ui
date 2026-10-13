import type { AttachmentAdapter } from "../../adapters/attachment";
import {
  isAttachmentComplete,
  type Attachment,
  type CompleteAttachment,
} from "../../types/attachment";

type CleanupRecord = {
  phase: "pending" | "failed" | "complete";
  dispatched: boolean;
  retried: boolean;
  abandoned: boolean;
  retry?: () => void;
};

export class AttachmentSendOperations {
  // Draft attachments stay pending so discarding an unsent upload still calls remove.
  private readonly entries = new WeakMap<
    Attachment,
    { result?: CompleteAttachment }
  >();
  private readonly removals = new WeakMap<Attachment, CleanupRecord>();

  beginRemoval(attachment: Attachment) {
    const record = this.removals.get(attachment);
    if (record?.phase === "pending") return false;
    if (record) record.phase = "pending";
    else
      this.removals.set(attachment, {
        phase: "pending",
        dispatched: false,
        retried: false,
        abandoned: false,
      });
    return true;
  }

  abandonRemoval(attachment: Attachment) {
    const record = this.removals.get(attachment);
    if (record) record.abandoned = true;
    this.removals.delete(attachment);
  }

  isRemoved(attachment: Attachment) {
    return this.removals.has(attachment);
  }

  isRemovalPending(attachment: Attachment) {
    return this.removals.get(attachment)?.phase === "pending";
  }

  async remove(
    attachment: Attachment,
    adapter: AttachmentAdapter | undefined,
    onFailure?: (error: unknown, message: string) => void,
  ) {
    const record = this.removals.get(attachment)!;
    try {
      if (!isAttachmentComplete(attachment)) await adapter?.remove(attachment);
      record.phase = "complete";
    } catch (error) {
      record.phase = "failed";
      onFailure?.(
        error,
        error instanceof Error ? error.message : String(error),
      );
      this.retryDispatched(record);
      throw error;
    }
  }

  dispatchRemoval(attachment: Attachment, retry: () => void) {
    const record = this.removals.get(attachment);
    if (!record) return;
    record.dispatched = true;
    record.retry = retry;
    this.retryDispatched(record);
  }

  private retryDispatched(record: CleanupRecord) {
    if (
      record.abandoned ||
      !record.dispatched ||
      record.phase !== "failed" ||
      record.retried ||
      !record.retry
    )
      return;
    record.retried = true;
    record.retry();
  }

  restore(attachment: Attachment) {
    const record = this.removals.get(attachment);
    if (!record || record.dispatched || record.phase !== "failed")
      return attachment;
    const restored = { ...attachment };
    const entry = this.entries.get(attachment);
    if (entry) this.entries.set(restored, entry);
    return restored;
  }

  adoptFrom(source: AttachmentSendOperations, attachment: Attachment) {
    const record = source.removals.get(attachment);
    if (record) this.removals.set(attachment, record);
    const entry = source.entries.get(attachment);
    if (entry) this.entries.set(attachment, entry);
  }

  isSameRemoval(first: Attachment, second: Attachment) {
    const record = this.removals.get(first);
    return record !== undefined && record === this.removals.get(second);
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

  transfer<T extends Attachment>(original: Attachment, replacement: T): T {
    const entry = this.entries.get(original);
    if (entry) this.entries.set(replacement, entry);
    const record = this.removals.get(original);
    if (record) this.removals.set(replacement, record);
    return replacement;
  }
}
