import {
  ExportedMessageRepository,
  type ExportedMessageRepository as ExportedMessageRepositoryType,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/core";
import { fromThreadMessageLike } from "@assistant-ui/core";
import type { AcpThreadMessage, AcpThreadState } from "./acpThreadState";

const FALLBACK_STATUS = { type: "complete", reason: "unknown" } as const;

export const toThreadMessageLike = (
  message: AcpThreadMessage,
): ThreadMessageLike =>
  message.role === "assistant"
    ? {
        id: message.id,
        role: "assistant",
        createdAt: new Date(message.createdAt),
        status: message.status,
        content: message.content,
      }
    : {
        id: message.id,
        role: "user",
        createdAt: new Date(message.createdAt),
        content: message.content,
        attachments: message.attachments,
      };

export const toThreadMessage = (message: AcpThreadMessage): ThreadMessage =>
  fromThreadMessageLike(
    toThreadMessageLike(message),
    message.id,
    FALLBACK_STATUS,
  );

export function projectAcpThreadRepository(
  state: AcpThreadState,
): ExportedMessageRepositoryType {
  return ExportedMessageRepository.fromBranchableArray(
    state.messageOrder.flatMap((id) => {
      const message = state.messagesById[id];
      return message
        ? [
            {
              message: toThreadMessageLike(message),
              parentId: message.parentId,
            },
          ]
        : [];
    }),
    { headId: state.headId },
  );
}
