export type AttachmentAddOperation = {
  cancelled: boolean;
  attachmentIds: Set<string>;
};

export class AttachmentAddOperations {
  private readonly operations = new Set<AttachmentAddOperation>();

  start() {
    const operation: AttachmentAddOperation = {
      cancelled: false,
      attachmentIds: new Set(),
    };
    this.operations.add(operation);
    return operation;
  }

  accept(operation: AttachmentAddOperation, attachmentId: string) {
    if (operation.cancelled) return false;
    operation.attachmentIds.add(attachmentId);
    return true;
  }

  finish(operation: AttachmentAddOperation) {
    this.operations.delete(operation);
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
  }

  cancelAll() {
    for (const operation of this.operations) {
      operation.cancelled = true;
    }
    this.operations.clear();
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
