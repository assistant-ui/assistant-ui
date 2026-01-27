import { RefObject, useState } from "react";
import { ThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import {
  AssistantCloud,
  CloudMessagePersistence,
  createFormattedPersistence,
} from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "../runtime-cores/adapters/thread-history/MessageFormatAdapter";
import { GenericThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { AssistantClient, useAui } from "@assistant-ui/store";
import { ThreadListItemMethods } from "../../types/scopes";

// Global WeakMap to store CloudMessagePersistence instances per thread list item
const globalPersistenceMap = new WeakMap<
  ThreadListItemMethods,
  CloudMessagePersistence
>();

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private cloudRef: RefObject<AssistantCloud>,
    private aui: AssistantClient,
  ) {}

  private get persistence(): CloudMessagePersistence {
    const threadListItem = this.aui.threadListItem();
    if (!globalPersistenceMap.has(threadListItem)) {
      globalPersistenceMap.set(
        threadListItem,
        new CloudMessagePersistence(this.cloudRef.current),
      );
    }
    return globalPersistenceMap.get(threadListItem)!;
  }

  withFormat<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const self = this;
    return {
      async append(item: MessageFormatItem<TMessage>) {
        const { remoteId } = await self.aui.threadListItem().initialize();
        const formatted = createFormattedPersistence(
          self.persistence,
          formatAdapter,
        );
        await formatted.append(remoteId, item);
      },
      async load(): Promise<MessageFormatRepository<TMessage>> {
        const remoteId = self.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };
        const formatted = createFormattedPersistence(
          self.persistence,
          formatAdapter,
        );
        return formatted.load(remoteId);
      },
    };
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.aui.threadListItem().initialize();
    await this.persistence.append(
      remoteId,
      message.id,
      parentId,
      "aui/v0",
      auiV0Encode(message),
    );
  }

  async load() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    const messages = await this.persistence.load(remoteId, "aui/v0");
    return {
      messages: messages
        .filter(
          (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
        )
        .map(auiV0Decode)
        .reverse(),
    };
  }
}

export const useAssistantCloudThreadHistoryAdapter = (
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter => {
  const aui = useAui();
  const [adapter] = useState(
    () => new AssistantCloudThreadHistoryAdapter(cloudRef, aui),
  );

  return adapter;
};
