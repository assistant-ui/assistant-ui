import { RefObject, useState } from "react";
import { ThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { AssistantCloud, CloudAPIError } from "assistant-cloud";
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

  /**
   * Enhanced error logging with proper error type detection.
   * Uses HTTP status codes and error types instead of fragile string matching.
   */
  private _logLoadError(
    error: unknown,
    context: { remoteId?: string; format?: string },
  ) {
    if (error instanceof CloudAPIError) {
      const cloudError = error as CloudAPIError;
      const errorDetails = {
        message: cloudError.message,
        status: cloudError.status,
        statusText: cloudError.statusText,
        responseBody: cloudError.responseBody,
        ...context,
      };

      // Use proper error type detection based on HTTP status codes
      if (cloudError.isAuthenticationError) {
        console.error("Authentication error detected:", errorDetails);
      } else if (cloudError.isPermissionError) {
        console.error("Permission error detected:", errorDetails);
      } else if (cloudError.isRateLimitError) {
        console.error("Rate limit error detected (retry-able):", errorDetails);
      } else if (cloudError.isServerError) {
        console.error("Server error detected (retry-able):", errorDetails);
      } else if (cloudError.isNotFoundError) {
        console.error("Resource not found error detected:", errorDetails);
      } else if (cloudError.isClientError) {
        console.error("Client error detected:", errorDetails);
      } else {
        console.error("Unknown HTTP error:", errorDetails);
      }
    } else if (error instanceof Error) {
      // Handle non-HTTP errors (network issues, etc.)
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        ...context,
      };

      // Check for common network error patterns
      if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND")
      ) {
        console.error("Network error detected (retry-able):", errorDetails);
      } else {
        console.error("Unknown error type:", errorDetails);
      }
    } else {
      console.error("Non-Error object thrown:", { error, ...context });
    }
  }

  /**
   * Private helper method to create messages with consistent error handling and ID mapping.
   * Follows DRY principle by extracting the common pattern used in append() and _appendWithFormat().
   */
  private async _createMessage(
    remoteId: string,
    params: {
      parent_id: string | null;
      format: string;
      content: ReadonlyJSONObject;
    },
    messageId: string,
  ) {
    if (!this.cloudRef.current) {
      console.warn("Cloud reference not available");
      throw new Error("Cloud reference not available");
    }

    const taskPromise = this.cloudRef.current.threads.messages.create(
      remoteId,
      params,
    );

    const task = taskPromise.then(({ message_id }) => {
      this._getIdForLocalId[messageId] = message_id;
      return message_id;
    });

    this._getIdForLocalId[messageId] = task;
    await task;
  }

  /**
   * Error handling strategy:
   * - Message operations throw errors for proper caller handling
   * - Cloud reference checks throw errors to prevent invalid operations
   * - Promise rejections propagate naturally without redundant catch blocks
   */
  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.store.threadListItem().initialize();

    return this._createMessage(
      remoteId,
      {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format: "aui/v0",
        content: auiV0Encode(message),
      },
      message.id,
    );
  }

  async load() {
    const remoteId = this.store.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    try {
      if (!this.cloudRef.current) {
        console.warn("Cloud reference not available");
        return { messages: [] };
      }
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
      this._logLoadError(error, { remoteId });
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
    const { remoteId } = await this.store.threadListItem().initialize();

    return this._createMessage(
      remoteId,
      {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format,
        content: content as ReadonlyJSONObject,
      },
      messageId,
    );
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
      if (!this.cloudRef.current) {
        console.warn("Cloud reference not available");
        return { messages: [] };
      }
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
      this._logLoadError(error, { remoteId, format });
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
