import type { LangChainBaseMessage } from "./types";
import {
  findForkCheckpointInHistory,
  type ForkCheckpointClient,
} from "./findForkCheckpointInHistory";

type MessageMetadataSnapshot =
  | ReadonlyMap<string, { readonly parentCheckpointId: string | undefined }>
  | undefined;

/**
 * Hydration seeds every message with the head's parent checkpoint, so only the
 * head's recorded fork checkpoint is reliable; older turns are matched against
 * server history by message id. A `null` `parentId` edits the first human
 * message and forks from the thread's initial (empty-message) checkpoint.
 */
export const resolveForkCheckpoint = async (
  client: ForkCheckpointClient,
  threadId: string,
  messages: readonly LangChainBaseMessage[],
  parentId: string | null,
  sourceId: string | null | undefined,
  metadata: MessageMetadataSnapshot,
  messagesKey: string,
): Promise<string | null> => {
  const lastMessage = messages[messages.length - 1];
  let checkpointId: string | null =
    sourceId != null && lastMessage?.id === sourceId
      ? (metadata?.get(sourceId)?.parentCheckpointId ?? null)
      : null;

  if (!checkpointId) {
    const parentIndex =
      parentId == null ? -1 : messages.findIndex((m) => m.id === parentId);
    if (parentId != null && parentIndex === -1) return null;
    try {
      checkpointId = await findForkCheckpointInHistory(
        client,
        threadId,
        messages.slice(0, parentIndex + 1),
        messagesKey,
      );
    } catch {
      return null;
    }
  }

  return checkpointId;
};
