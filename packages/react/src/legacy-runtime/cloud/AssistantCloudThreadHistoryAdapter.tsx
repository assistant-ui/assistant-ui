import { RefObject, useState } from "react";
import { ThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { AssistantCloud, CloudMessagePersistence } from "assistant-cloud";
import { auiV0Decode, auiV0Encode } from "./auiV0";
import {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
} from "../runtime-cores/adapters/thread-history/MessageFormatAdapter";
import { GenericThreadHistoryAdapter } from "../runtime-cores/adapters/thread-history/ThreadHistoryAdapter";
import { ReadonlyJSONObject } from "assistant-stream/utils";
import { AssistantClient, useAui } from "@assistant-ui/store";
import { ThreadListItemMethods } from "../../types/scopes";

const globalPersistence = new WeakMap<
  ThreadListItemMethods,
  CloudMessagePersistence
>();

class AssistantCloudThreadHistoryAdapter implements ThreadHistoryAdapter {
  constructor(
    private cloudRef: RefObject<AssistantCloud>,
    private aui: AssistantClient,
  ) {}

  private get _persistence(): CloudMessagePersistence {
    const key = this.aui.threadListItem();
    if (!globalPersistence.has(key)) {
      globalPersistence.set(
        key,
        new CloudMessagePersistence(this.cloudRef.current),
      );
    }
    return globalPersistence.get(key)!;
  }

  withFormat<TMessage, TStorageFormat>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> {
    const adapter = this;
    return {
      async append(item: MessageFormatItem<TMessage>) {
        const { remoteId } = await adapter.aui.threadListItem().initialize();
        const encoded = formatAdapter.encode(item);

        await adapter._persistence.append(
          remoteId,
          formatAdapter.getId(item.message),
          item.parentId,
          formatAdapter.format,
          encoded as ReadonlyJSONObject,
        );

        if (adapter.cloudRef.current.telemetry.enabled) {
          adapter._maybeReportRun(remoteId, formatAdapter.format, encoded);
        }
      },
      reportTelemetry(
        items: MessageFormatItem<TMessage>[],
        options?: { durationMs?: number },
      ) {
        const encodedContents = items.map((item) => formatAdapter.encode(item));
        adapter._reportBatchTelemetry(
          formatAdapter.format,
          encodedContents,
          options,
        );
      },
      async load(): Promise<MessageFormatRepository<TMessage>> {
        const remoteId = adapter.aui.threadListItem().getState().remoteId;
        if (!remoteId) return { messages: [] };

        const messages = await adapter._persistence.load(
          remoteId,
          formatAdapter.format,
        );

        return {
          messages: messages
            .filter((m) => m.format === formatAdapter.format)
            .map((m) =>
              formatAdapter.decode({
                id: m.id,
                parent_id: m.parent_id,
                format: m.format,
                content: m.content as TStorageFormat,
              }),
            )
            .reverse(),
        };
      },
    };
  }

  async append({ parentId, message }: ExportedMessageRepositoryItem) {
    const { remoteId } = await this.aui.threadListItem().initialize();
    const encoded = auiV0Encode(message);

    await this._persistence.append(
      remoteId,
      message.id,
      parentId,
      "aui/v0",
      encoded,
    );

    if (this.cloudRef.current.telemetry.enabled) {
      this._maybeReportRun(remoteId, "aui/v0", encoded);
    }
  }

  async load() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };
    const messages = await this._persistence.load(remoteId, "aui/v0");
    return {
      messages: messages
        .filter(
          (m): m is typeof m & { format: "aui/v0" } => m.format === "aui/v0",
        )
        .map(auiV0Decode)
        .reverse(),
    };
  }

  private _reportBatchTelemetry<T>(
    format: string,
    contents: T[],
    options?: { durationMs?: number },
  ) {
    if (!this.cloudRef.current.telemetry.enabled) return;

    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return;

    const extracted = extractBatchTelemetry(format, contents);
    if (!extracted) return;

    this._sendReport(remoteId, extracted, options?.durationMs);
  }

  private _maybeReportRun<T>(remoteId: string, format: string, content: T) {
    const extracted = extractTelemetry(format, content);
    if (!extracted) return;

    this._sendReport(remoteId, extracted);
  }

  private _sendReport(
    remoteId: string,
    data: TelemetryData,
    durationMs?: number,
  ) {
    const { toolCalls, promptTokens, completionTokens, status, totalSteps } =
      data;

    const initial: Parameters<typeof this.cloudRef.current.runs.report>[0] = {
      thread_id: remoteId,
      status,
      ...(totalSteps != null ? { total_steps: totalSteps } : undefined),
      ...(toolCalls?.length ? { tool_calls: toolCalls } : undefined),
      ...(promptTokens != null ? { prompt_tokens: promptTokens } : undefined),
      ...(completionTokens != null
        ? { completion_tokens: completionTokens }
        : undefined),
      ...(durationMs != null ? { duration_ms: durationMs } : undefined),
    };

    const { beforeReport } = this.cloudRef.current.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.cloudRef.current.runs.report(report).catch(() => {});
  }
}

type TelemetryData = {
  status: "completed" | "incomplete" | "error";
  toolCalls?: { tool_name: string; tool_call_id: string }[];
  totalSteps?: number;
  promptTokens?: number;
  completionTokens?: number;
};

function extractTelemetry<T>(format: string, content: T): TelemetryData | null {
  if (format === "aui/v0") {
    return extractAuiV0(content);
  }
  if (format === "ai-sdk/v6") {
    return extractAiSdkV6(content);
  }
  return null;
}

function extractBatchTelemetry<T>(
  format: string,
  contents: T[],
): TelemetryData | null {
  if (format === "ai-sdk/v6") {
    return extractAiSdkV6Batch(contents);
  }
  for (let i = contents.length - 1; i >= 0; i--) {
    const result = extractTelemetry(format, contents[i]!);
    if (result) return result;
  }
  return null;
}

function extractAuiV0<T>(content: T): TelemetryData | null {
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

  if (msg.role !== "assistant") return null;

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

  return {
    status:
      statusType === "error"
        ? "error"
        : statusType === "incomplete"
          ? "incomplete"
          : "completed",
    ...(toolCalls?.length ? { toolCalls } : undefined),
    ...(steps?.length != null ? { totalSteps: steps.length } : undefined),
    ...(promptTokens != null ? { promptTokens } : undefined),
    ...(completionTokens != null ? { completionTokens } : undefined),
  };
}

function extractAiSdkV6<T>(content: T): TelemetryData | null {
  const msg = content as {
    role?: string;
    parts?: readonly {
      type: string;
      toolName?: string;
      toolCallId?: string;
    }[];
  };

  if (msg.role !== "assistant") return null;

  const parts = msg.parts ?? [];

  const hasText = parts.some((p) => p.type === "text");

  const toolCalls = parts
    .filter((p) => {
      if (p.type === "tool-call" && p.toolName && p.toolCallId) return true;
      if (p.type.startsWith("tool-") && p.type !== "tool-call" && p.toolCallId)
        return true;
      return false;
    })
    .map((p) => ({
      tool_name: p.toolName ?? p.type.slice(5),
      tool_call_id: p.toolCallId!,
    }));

  const stepCount = parts.filter((p) => p.type === "step-start").length;

  return {
    status: hasText ? "completed" : "incomplete",
    ...(toolCalls.length ? { toolCalls } : undefined),
    ...(stepCount > 0 ? { totalSteps: stepCount } : undefined),
  };
}

function extractAiSdkV6Batch<T>(contents: T[]): TelemetryData | null {
  const allToolCalls: { tool_name: string; tool_call_id: string }[] = [];
  let totalStepCount = 0;
  let hasAssistant = false;
  let hasText = false;

  for (const content of contents) {
    const msg = content as {
      role?: string;
      parts?: readonly {
        type: string;
        toolName?: string;
        toolCallId?: string;
      }[];
    };

    if (msg.role !== "assistant") continue;
    hasAssistant = true;

    const parts = msg.parts ?? [];

    if (!hasText && parts.some((p) => p.type === "text")) {
      hasText = true;
    }

    for (const p of parts) {
      if (p.type === "tool-call" && p.toolName && p.toolCallId) {
        allToolCalls.push({
          tool_name: p.toolName,
          tool_call_id: p.toolCallId,
        });
      } else if (
        p.type.startsWith("tool-") &&
        p.type !== "tool-call" &&
        p.toolCallId
      ) {
        allToolCalls.push({
          tool_name: p.toolName ?? p.type.slice(5),
          tool_call_id: p.toolCallId,
        });
      }
    }

    totalStepCount += parts.filter((p) => p.type === "step-start").length;
  }

  if (!hasAssistant) return null;

  return {
    status: hasText ? "completed" : "incomplete",
    ...(allToolCalls.length ? { toolCalls: allToolCalls } : undefined),
    ...(totalStepCount > 0 ? { totalSteps: totalStepCount } : undefined),
  };
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
