import type { Attachment } from "../../types/attachment";

export type AttachmentAddOperation = {
  cancelled: boolean;
  attachmentIds: Set<string>;
};

export class AttachmentAddOperations {
  private readonly operations = new Set<AttachmentAddOperation>();
  private readonly uploading = new Map<
    string,
    { operation: AttachmentAddOperation; waiters: Set<() => void> }
  >();

  start() {
    const operation: AttachmentAddOperation = {
      cancelled: false,
      attachmentIds: new Set(),
    };
    this.operations.add(operation);
    return operation;
  }

  accept(
    operation: AttachmentAddOperation,
    attachment: Pick<Attachment, "id" | "status">,
  ) {
    if (operation.cancelled) return false;
    operation.attachmentIds.add(attachment.id);
    if (attachment.status.type === "running") {
      const entry = this.uploading.get(attachment.id);
      if (entry?.operation !== operation)
        this.uploading.set(attachment.id, {
          operation,
          waiters: entry?.waiters ?? new Set(),
        });
    } else {
      this.settle(attachment.id, operation);
    }
    return true;
  }

  finish(operation: AttachmentAddOperation) {
    this.operations.delete(operation);
    for (const attachmentId of operation.attachmentIds)
      this.settle(attachmentId, operation);
  }

  isCancelled(operation: AttachmentAddOperation) {
    return operation.cancelled;
  }

  cancel(attachmentId: string) {
    for (const operation of [...this.operations]) {
      if (!operation.attachmentIds.has(attachmentId)) continue;
      operation.cancelled = true;
      this.operations.delete(operation);
    }
    this.settle(attachmentId);
  }

  cancelAll() {
    for (const operation of this.operations) {
      operation.cancelled = true;
    }
    this.operations.clear();
    for (const attachmentId of [...this.uploading.keys()])
      this.settle(attachmentId);
  }

  whenSendable(attachmentId: string): Promise<void> | undefined {
    const entry = this.uploading.get(attachmentId);
    if (!entry) return undefined;
    return new Promise((resolve) => entry.waiters.add(resolve));
  }

  // An attachment id outlives the add that produced it, so an add that ends
  // after a newer one took the id over must not release its upload.
  private settle(attachmentId: string, operation?: AttachmentAddOperation) {
    const entry = this.uploading.get(attachmentId);
    if (!entry) return;
    if (operation && entry.operation !== operation) return;
    this.uploading.delete(attachmentId);
    for (const resolve of entry.waiters) resolve();
  }
}

export const drainAttachmentAdd = async <T>(
  result: Promise<T> | AsyncIterable<T>,
  accept: (attachment: T) => boolean,
) => {
  if (Symbol.asyncIterator in result) {
    for await (const attachment of result) {
      if (!accept(attachment)) break;
    }
  } else {
    accept(await result);
  }
};
