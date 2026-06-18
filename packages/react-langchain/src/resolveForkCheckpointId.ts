import type { LangChainBaseMessage } from "./types";

type ForkCheckpointHistoryState = {
  values?: Record<string, unknown> | undefined;
  checkpoint?: { checkpoint_id?: string | null | undefined } | undefined;
};

export type ForkCheckpointClient = {
  threads: {
    getHistory: (
      threadId: string,
    ) => Promise<readonly ForkCheckpointHistoryState[]>;
  };
};

/**
 * Resolve the server checkpoint to fork from when regenerating. Walks the
 * thread's checkpoint history and returns the `checkpoint_id` whose persisted
 * messages match `messagesUpToParent` by id. Returns `null` when no checkpoint
 * lines up or message ids are unstable, in which case regeneration is skipped.
 */
export const resolveForkCheckpointId = async (
  client: ForkCheckpointClient,
  threadId: string,
  messagesUpToParent: readonly LangChainBaseMessage[],
  messagesKey: string,
): Promise<string | null> => {
  const history = await client.threads.getHistory(threadId);
  for (const state of history) {
    const stateMessages = state.values?.[messagesKey] as
      | readonly LangChainBaseMessage[]
      | undefined;
    if (!stateMessages || stateMessages.length !== messagesUpToParent.length)
      continue;
    const hasStableIds =
      messagesUpToParent.every((m) => typeof m.id === "string") &&
      stateMessages.every((m) => typeof m.id === "string");
    if (!hasStableIds) continue;
    const isMatch = messagesUpToParent.every(
      (m, i) => m.id === stateMessages[i]?.id,
    );
    if (isMatch) return state.checkpoint?.checkpoint_id ?? null;
  }
  return null;
};
