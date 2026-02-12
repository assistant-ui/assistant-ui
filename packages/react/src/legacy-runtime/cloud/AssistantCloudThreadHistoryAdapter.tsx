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
import { AssistantClient, useAui } from "@assistant-ui/store";
import { ThreadListItemMethods } from "../../types/scopes";

// Global WeakMap to store message ID mappings across adapter instances
const globalMessageIdMapping = new WeakMap<
  ThreadListItemMethods,
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
    private aui: AssistantClient,
  ) {}

  private get _getIdForLocalId(): Record<string, string | Promise<string>> {
    if (!globalMessageIdMapping.has(this.aui.threadListItem())) {
      globalMessageIdMapping.set(this.aui.threadListItem(), {});
    }
    return globalMessageIdMapping.get(this.aui.threadListItem())!;
  }

  withFormat<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    return new FormattedThreadHistoryAdapter(this, formatAdapter);
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.aui.threadListItem().initialize();
    const encoded = auiV0Encode(message);
    const task = this.cloudRef.current.threads.messages
      .create(remoteId, {
        parent_id: parentId
          ? ((await this._getIdForLocalId[parentId]) ?? parentId)
          : null,
        format: "aui/v0",
        content: encoded,
      })
      .then(({ message_id }) => {
        this._getIdForLocalId[message.id] = message_id;
        return message_id;
      });

    this._getIdForLocalId[message.id] = task;

    // Fire-and-forget telemetry for assistant messages
    if (this.cloudRef.current.telemetry.enabled) {
      task
        .then(() => {
          this._maybeReportRun(remoteId, "aui/v0", encoded);
        })
        .catch(() => {});
    }

    return task.then(() => {});
  }

  async load() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };
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
  }

  // Internal methods for FormattedThreadHistoryAdapter
  async _appendWithFormat<T>(
    parentId: string | null,
    messageId: string,
    format: string,
    content: T,
  ) {
    const { remoteId } = await this.aui.threadListItem().initialize();

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
      });

    this._getIdForLocalId[messageId] = task;

    // Fire-and-forget telemetry for assistant messages
    if (this.cloudRef.current.telemetry.enabled) {
      task
        .then(() => {
          this._maybeReportRun(remoteId, format, content);
        })
        .catch(() => {});
    }

    return task.then(() => {});
  }

  private _maybeReportRun<T>(remoteId: string, format: string, content: T) {
    if (format !== "aui/v0") return;

    const msg = content as {
      role?: string;
      status?: { type: string };
      content?: readonly {
        type: string;
        toolName?: string;
        toolCallId?: string;
      }[];
      metadata?: {
        steps?: readonly {
          usage?: { promptTokens?: number; completionTokens?: number };
        }[];
      };
    };

    if (msg.role !== "assistant") return;

    const toolCalls = msg.content
      ?.filter((p) => p.type === "tool-call" && p.toolName && p.toolCallId)
      .map((p) => ({ tool_name: p.toolName!, tool_call_id: p.toolCallId! }));

    const steps = msg.metadata?.steps;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    if (steps && steps.length > 0) {
      promptTokens = 0;
      completionTokens = 0;
      for (const step of steps) {
        promptTokens += step.usage?.promptTokens ?? 0;
        completionTokens += step.usage?.completionTokens ?? 0;
      }
    }

    const statusType = msg.status?.type;
    const status: "completed" | "incomplete" | "error" =
      statusType === "error"
        ? "error"
        : statusType === "incomplete"
          ? "incomplete"
          : "completed";

    const initial: Parameters<typeof this.cloudRef.current.runs.report>[0] = {
      thread_id: remoteId,
      status,
      ...(steps?.length != null ? { total_steps: steps.length } : undefined),
      ...(toolCalls?.length ? { tool_calls: toolCalls } : undefined),
      ...(promptTokens != null ? { prompt_tokens: promptTokens } : undefined),
      ...(completionTokens != null
        ? { completion_tokens: completionTokens }
        : undefined),
    };

    const { beforeReport } = this.cloudRef.current.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.cloudRef.current.runs.report(report).catch(() => {});
  }

  async _loadWithFormat<TMessage, TStorageFormat>(
    format: string,
    decoder: (
      message: MessageStorageEntry<TStorageFormat>,
    ) => MessageFormatItem<TMessage>,
  ): Promise<MessageFormatRepository<TMessage>> {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

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
