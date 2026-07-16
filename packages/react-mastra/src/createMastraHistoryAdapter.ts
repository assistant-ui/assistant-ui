import type { MastraClient } from "@mastra/client-js";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import type {
  MessageFormatRepository,
  ThreadHistoryAdapter,
} from "@assistant-ui/react";

type MastraHistoryAdapterOptions = {
  client: MastraClient;
  agentId: string;
  resourceId: string;
  getThreadId: () => string | undefined;
};

const loadAllMessages = async (
  client: MastraClient,
  agentId: string,
  resourceId: string,
  threadId: string,
) => {
  const thread = client.getMemoryThread({ threadId, agentId });
  const storedThread = await thread.get();
  if (storedThread.resourceId !== resourceId) {
    throw new Error(
      `Mastra thread ${threadId} does not belong to this resource.`,
    );
  }
  const messages = [];
  let page = 0;

  while (true) {
    const result = await thread.listMessages({
      page,
      perPage: 100,
      orderBy: { field: "createdAt", direction: "ASC" },
    });
    messages.push(...result.messages);
    if (!result.hasMore) return messages;
    page += 1;
  }
};

export const createMastraHistoryAdapter = ({
  client,
  agentId,
  resourceId,
  getThreadId,
}: MastraHistoryAdapterOptions): ThreadHistoryAdapter => ({
  async load() {
    return { messages: [] };
  },
  async append() {},
  withFormat: () => ({
    async load<TMessage>(): Promise<MessageFormatRepository<TMessage>> {
      const threadId = getThreadId();
      if (!threadId) return { messages: [] };

      const storedMessages = await loadAllMessages(
        client,
        agentId,
        resourceId,
        threadId,
      );
      const messages = toAISdkMessages(storedMessages, { version: "v6" });
      let parentId: string | null = null;
      const repository = messages.map((message) => {
        const item = {
          parentId,
          message: message as TMessage,
        };
        parentId = message.id;
        return item;
      });

      return {
        headId: parentId,
        messages: repository,
      };
    },
    async append() {
      // Mastra persists chat messages while the agent stream is running.
    },
  }),
});
