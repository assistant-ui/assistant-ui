import type { AppendMessage } from "../../types/message";
import type { CompleteAttachment } from "../../types/attachment";

export type OptimisticAttachmentSend = (
  message: AppendMessage,
  uploadAttachments: () => Promise<readonly CompleteAttachment[]>,
) => Promise<void>;

// The capability is looked up out of band instead of being declared as a
// runtime member so the published declaration files never name it; a declared
// member would become append-only public API on its first release.
const senders = new WeakMap<object, OptimisticAttachmentSend>();

export const setOptimisticAttachmentSend = (
  runtime: object,
  send: OptimisticAttachmentSend,
): void => {
  senders.set(runtime, send);
};

export const getOptimisticAttachmentSend = (
  runtime: object,
): OptimisticAttachmentSend | undefined => senders.get(runtime);
