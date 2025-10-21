import { RefObject, useState } from "react";
import { ThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { AssistantCloud } from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "../runtime-cores/adapters/thread-history/MessageFormatAdapter";
import { GenericThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  AssistantApi,
  useAssistantApi,
} from "../../context/react/AssistantApiContext";
import { ThreadListItemClientApi } from "../../client/types/ThreadListItem";

// Global WeakMap to store message ID mappings across adapter instances
const globalMessageIdMapping = new WeakMap<
  ThreadListItemClientApi,
  Record<string, string | Promise<string>>
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
    private store: AssistantApi,
  ) {}

  private get _getIdForLocalId(): Record<string, string | Promise<string>> {
    if (!globalMessageIdMapping.has(this.store.threadListItem())) {
      globalMessageIdMapping.set(this.store.threadListItem(), {});
    }
    return globalMessageIdMapping.get(this.store.threadListItem())!;
  }

  withFormat<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    return new FormattedThreadHistoryAdapter(this, formatAdapter);
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    try {
      if (!this.cloudRef.current) {
        console.warn("Cloud reference not available");
        return Promise.resolve();
      }
      const { remoteId } = await this.store.threadListItem().initialize();
      const task = this.cloudRef.current.threads.messages
        .create(remoteId, {
          parent_id: parentId
            ? ((await this._getIdForLocalId[parentId]) ?? parentId)
            : null,
          format: "aui/v0",
          content: auiV0Encode(message),
        })
        .then(({ message_id }) => {
          this._getIdForLocalId[message.id] = message_id;
          return message_id;
        })
        .catch((error) => {
          console.warn("Failed to append message to cloud:", error);
          // Use original message ID as fallback to maintain referential integrity
          this._getIdForLocalId[message.id] = message.id;
          return message.id;
        });

      this._getIdForLocalId[message.id] = task;

      return task.then(() => {});
    } catch (error) {
      console.warn("Failed to append message to cloud:", error);
      // Return a resolved promise to prevent the error from propagating
      return Promise.resolve();
    }
  }

  async load() {
    const remoteId = this.store.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    try {
      const { messages } = await this.cloudRef.current.threads.messages.list(
        remoteId,
        {
          format: "aui/v0",
        },
      );
      const payload = {
        messages: messages
          .filter(
            (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
          )
          .map(auiV0Decode)
          .reverse(),
      };
      return payload;
    } catch (error) {
      console.warn("Failed to load cloud messages:", error);
      return { messages: [] };
    }
  }

  // Internal methods for FormattedThreadHistoryAdapter
  async _appendWithFormat<T>(
    parentId: string | null,
    messageId: string,
    format: string,
    content: T,
  ) {
    if (!this.cloudRef.current) {
      console.warn("Cloud reference not available");
      return Promise.resolve();
    }
    const { remoteId } = await this.store.threadListItem().initialize();

    const task = this.cloudRef.current.threads.messages
      .create(remoteId, {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format,
        content: content as ReadonlyJSONObject,
      })
      .then(({ message_id }) => {
        this._getIdForLocalId[messageId] = message_id;
        return message_id;
      })
      .catch((error) => {
        console.warn("Failed to append message to cloud:", error);
        // Use original message ID as fallback to maintain referential integrity
        this._getIdForLocalId[messageId] = messageId;
        return messageId;
      });

    return task.then(() => {});
  }

  async _loadWithFormat<TMessage, TStorageFormat>(
    format: string,
    decoder: (
      message: MessageStorageEntry<TStorageFormat>,
    ) => MessageFormatItem<TMessage>,
  ): Promise<MessageFormatRepository<TMessage>> {
    const remoteId = this.store.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    try {
      const { messages } = await this.cloudRef.current.threads.messages.list(
        remoteId,
        {
          format,
        },
      );

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
    } catch (error) {
      console.warn("Failed to load cloud messages with format:", error);
      return { messages: [] };
    }
  }
}

export const useAssistantCloudThreadHistoryAdapter = (
  cloudRef: RefObject<AssistantCloud>,
): ThreadHistoryAdapter => {
  const store = useAssistantApi();
  const [adapter] = useState(
    () => new AssistantCloudThreadHistoryAdapter(cloudRef, store),
  );

  return adapter;
};
