import type { RespondToToolApprovalOptions } from "@assistant-ui/core";

export type ToolApprovalStore = {
  getSnapshot: () => ReadonlyMap<string, RespondToToolApprovalOptions>;
  subscribe: (listener: () => void) => () => void;
  claim: (response: RespondToToolApprovalOptions) => boolean;
  release: (approvalId: string) => void;
  reconcile: (activeApprovalIds: ReadonlySet<string>) => void;
};

const stores = new WeakMap<object, ToolApprovalStore>();

export const createToolApprovalStore = (): ToolApprovalStore => {
  let responses: ReadonlyMap<string, RespondToToolApprovalOptions> = new Map();
  const listeners = new Set<() => void>();
  const claimedApprovalIds = new Set<string>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const release = (approvalId: string) => {
    const wasClaimed = claimedApprovalIds.delete(approvalId);
    if (!responses.has(approvalId)) {
      if (wasClaimed) notify();
      return;
    }
    const nextResponses = new Map(responses);
    nextResponses.delete(approvalId);
    responses = nextResponses;
    notify();
  };

  return {
    getSnapshot: () => responses,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    claim: (response) => {
      if (
        claimedApprovalIds.has(response.approvalId) ||
        responses.has(response.approvalId)
      )
        return false;
      claimedApprovalIds.add(response.approvalId);
      const nextResponses = new Map(responses);
      nextResponses.set(response.approvalId, response);
      responses = nextResponses;
      notify();
      return true;
    },
    release,
    reconcile: (activeApprovalIds) => {
      for (const approvalId of responses.keys()) {
        if (!activeApprovalIds.has(approvalId)) release(approvalId);
      }
    },
  };
};

export const getToolApprovalStore = (identity: object): ToolApprovalStore => {
  const existing = stores.get(identity);
  if (existing) return existing;
  const created = createToolApprovalStore();
  stores.set(identity, created);
  return created;
};
