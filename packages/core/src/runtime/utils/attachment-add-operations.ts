import type { Attachment } from "../../types/attachment";

export type AttachmentAddOperation = {
  cancelled: boolean;
  attachmentIds: Set<string>;
};

export class AttachmentAddOperations {
  private readonly operations = new Set<AttachmentAddOperation>();
  private readonly uploading = new Map<string, Set<() => void>>();

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
      if (!this.uploading.has(attachment.id))
        this.uploading.set(attachment.id, new Set());
    } else {
      this.settle(attachment.id);
    }
    return true;
  }

  finish(operation: AttachmentAddOperation) {
    this.operations.delete(operation);
    for (const attachmentId of operation.attachmentIds)
      this.settle(attachmentId);
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
    const waiters = this.uploading.get(attachmentId);
    if (!waiters) return undefined;
    return new Promise((resolve) => waiters.add(resolve));
  }

  private settle(attachmentId: string) {
    const waiters = this.uploading.get(attachmentId);
    if (!waiters) return;
    this.uploading.delete(attachmentId);
    for (const resolve of waiters) resolve();
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
