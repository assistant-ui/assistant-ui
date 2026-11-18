import type { LangChainBaseMessage } from "./types";

type ForkCheckpointHistoryState = {
  values?: Record<string, unknown> | undefined;
  checkpoint?: { checkpoint_id?: string | null | undefined } | undefined;
};

type ForkHistoryCursor = { configurable: { checkpoint_id: string } };

export type ForkCheckpointClient = {
  threads: {
    getHistory: (
      threadId: string,
      options?: { limit?: number; before?: ForkHistoryCursor },
    ) => Promise<readonly ForkCheckpointHistoryState[]>;
  };
};

export const findForkCheckpointInHistory = async (
  client: ForkCheckpointClient,
  threadId: string,
  messagesUpToParent: readonly LangChainBaseMessage[],
  messagesKey: string,
  pageSize = 100,
  minimumPrefixLength = messagesUpToParent.length,
): Promise<string | null> => {
  if (!messagesUpToParent.every((m) => typeof m.id === "string")) return null;

  const scanned = new Set<string>();
  let before: ForkHistoryCursor | undefined;
  let bestCheckpointId: string | null = null;
  let bestLength = minimumPrefixLength - 1;

  for (;;) {
    const page = await client.threads.getHistory(
      threadId,
      before ? { limit: pageSize, before } : { limit: pageSize },
    );

    let oldestCheckpointId: string | undefined;
    let advanced = false;
    for (const state of page) {
      const checkpointId = state.checkpoint?.checkpoint_id;
      if (typeof checkpointId === "string") {
        oldestCheckpointId = checkpointId;
        if (!scanned.has(checkpointId)) {
          scanned.add(checkpointId);
          advanced = true;
        }
      }
      const stateMessages = state.values?.[messagesKey] as
        | readonly LangChainBaseMessage[]
        | undefined;
      if (
        !Array.isArray(stateMessages) ||
        stateMessages.length <= bestLength ||
        stateMessages.length > messagesUpToParent.length
      )
        continue;
      if (!stateMessages.every((m) => typeof m.id === "string")) continue;
      const isMatch = stateMessages.every(
        (m, i) => m.id === messagesUpToParent[i]?.id,
      );
      if (isMatch && checkpointId) {
        if (stateMessages.length === messagesUpToParent.length)
          return checkpointId;
        bestCheckpointId = checkpointId;
        bestLength = stateMessages.length;
      }
    }

    // `advanced` halts paging if the backend ignores `before` and repeats a page
    if (page.length < pageSize || oldestCheckpointId === undefined || !advanced)
      return bestCheckpointId;
    before = { configurable: { checkpoint_id: oldestCheckpointId } };
  }
};
