import { RefObject, useState } from "react";
import { ThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { AssistantCloud, CloudMessagePersistence } from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "../runtime-cores/adapters/thread-history/MessageFormatAdapter";
import { GenericThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ReadonlyJSONObject } from "assistant-stream/utils";
import { AssistantClient, useAui } from "@assistant-ui/store";
import { ThreadListItemMethods } from "../../types/scopes";

// Global WeakMap to store CloudMessagePersistence instances per thread list item
const globalPersistenceMap = new WeakMap<
  ThreadListItemMethods,
  CloudMessagePersistence
>();

class FormattedThreadHistoryAdapter<TMessage, TStorageFormat>
  implements GenericThreadHistoryAdapter<TMessage>
{
  constructor(
    private parent: AssistantCloudThreadHistoryAdapter,
    private formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {}

  async append(item: MessageFormatItem<TMessage>) {
    // Encode the message using the format adapter
    const encoded = this.formatAdapter.encode(item);
    const messageId = this.formatAdapter.getId(item.message);

    // Delegate to parent's internal append method with the encoded format
    return this.parent._appendWithFormat(
      item.parentId,
      messageId,
      this.formatAdapter.format,
      encoded,
    );
  }

  async load(): Promise<MessageFormatRepository<TMessage>> {
    // Delegate to parent's internal load method with format filter
    return this.parent._loadWithFormat(
      this.formatAdapter.format,
      (message: MessageStorageEntry<TStorageFormat>) =>
        this.formatAdapter.decode(message),
    );
  }
}

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
    return new FormattedThreadHistoryAdapter(this, formatAdapter);
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

  // Internal methods for FormattedThreadHistoryAdapter
  async _appendWithFormat<T>(
    parentId: string | null,
    messageId: string,
    format: string,
    content: T,
  ) {
    const { remoteId } = await this.aui.threadListItem().initialize();
    await this.persistence.append(
      remoteId,
      messageId,
      parentId,
      format,
      content as ReadonlyJSONObject,
    );
  }

  async _loadWithFormat<TMessage, TStorageFormat>(
    format: string,
    decoder: (
      message: MessageStorageEntry<TStorageFormat>,
    ) => MessageFormatItem<TMessage>,
  ): Promise<MessageFormatRepository<TMessage>> {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    const messages = await this.persistence.load(remoteId, format);

    return {
      messages: messages
        .filter((m) => m.format === format)
        .map((m) =>
          decoder({
            id: m.id,
            parent_id: m.parent_id,
            format: m.format,
            content: m.content as TStorageFormat,
          }),
        )
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
