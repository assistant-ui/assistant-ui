type ThreadData = {
  externalId: string | undefined;
};

type ThreadListItem = {
  source: unknown;
  initialize: () => Promise<ThreadData>;
};

export const createCloudThreadListAdapterCreateFallback = (
  create: (() => Promise<ThreadData>) | undefined,
  threadListItem: ThreadListItem,
): (() => Promise<ThreadData>) =>
  async function createThread() {
    if (create) return create();
    if (threadListItem.source) return threadListItem.initialize();
    return { externalId: undefined };
  };
