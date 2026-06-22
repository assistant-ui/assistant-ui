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
): Promise<string | null> => {
  if (!messagesUpToParent.every((m) => typeof m.id === "string")) return null;

  const scanned = new Set<string>();
  let before: ForkHistoryCursor | undefined;

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
        stateMessages.length !== messagesUpToParent.length
      )
        continue;
      if (!stateMessages.every((m) => typeof m.id === "string")) continue;
      const isMatch = messagesUpToParent.every(
        (m, i) => m.id === stateMessages[i]?.id,
      );
      if (isMatch && checkpointId) return checkpointId;
    }

    // `advanced` halts paging if the backend ignores `before` and repeats a page
    if (page.length < pageSize || oldestCheckpointId === undefined || !advanced)
      return null;
    before = { configurable: { checkpoint_id: oldestCheckpointId } };
  }
};
