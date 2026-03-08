import type { ChatRegistry } from "../chat/ChatRegistry";

export class ThreadSessionManager {
  async ensureThreadId(
    chatKey: string,
    registry: ChatRegistry,
    createThread: () => Promise<string>,
    onCreated: (threadId: string) => void,
  ): Promise<string> {
    const meta = registry.getOrCreateMeta(chatKey);
    if (meta.threadId) {
      return meta.threadId;
    }

    if (!meta.creatingThread) {
      meta.creatingThread = (async () => {
        try {
          const threadId = await createThread();
          meta.threadId = threadId;
          meta.loaded = true;
          meta.loading = null;
          registry.setThreadId(chatKey, threadId);
          onCreated(threadId);
          return threadId;
        } finally {
          meta.creatingThread = null;
        }
      })();
    }

    return await meta.creatingThread;
  }
}
