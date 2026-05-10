import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud, AssistantCloudRunReport } from "assistant-cloud";
import {
  type FinishReason,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import {
  extractRunTelemetry,
  type RunTelemetryData,
} from "./extractRunTelemetry";

export type TelemetryFinishEvent = {
  finishReason?: FinishReason;
  isAbort: boolean;
  isDisconnect: boolean;
  isError: boolean;
};

export class CloudTelemetryReporter {
  private reported = new Set<string>();

  constructor(private cloud: AssistantCloud) {}

  async reportFromMessages(
    threadId: string,
    messages: UIMessage[],
    event?: TelemetryFinishEvent,
  ): Promise<void> {
    if (!this.cloud.telemetry.enabled) return;

    // mid-loop checkpoint: ai sdk's sendAutomaticallyWhen will resubmit and a
    // later onFinish will fire on the same assistantMessageId with the final state.
    if (
      event?.finishReason === "tool-calls" &&
      lastAssistantMessageIsCompleteWithToolCalls({ messages })
    ) {
      return;
    }

    const extracted = extractRunTelemetry(messages);
    if (!extracted) return;

    const dedupeKey = `${threadId}:${extracted.assistantMessageId}`;
    if (this.reported.has(dedupeKey)) return;

    const status = event ? deriveStatus(event, extracted) : extracted.status;

    // keep in sync with assistant-cloud createRunSchema (apps/aui-cloud-api/src/endpoints/runs/create.ts).
    const initial: AssistantCloudRunReport = {
      thread_id: threadId,
      status,
      ...(extracted.totalSteps != null
        ? { total_steps: extracted.totalSteps }
        : undefined),
      ...(extracted.toolCalls
        ? { tool_calls: extracted.toolCalls }
        : undefined),
      ...(extracted.inputTokens != null
        ? { input_tokens: extracted.inputTokens }
        : undefined),
      ...(extracted.outputTokens != null
        ? { output_tokens: extracted.outputTokens }
        : undefined),
      ...(extracted.reasoningTokens != null
        ? { reasoning_tokens: extracted.reasoningTokens }
        : undefined),
      ...(extracted.cachedInputTokens != null
        ? { cached_input_tokens: extracted.cachedInputTokens }
        : undefined),
      ...(extracted.modelId ? { model_id: extracted.modelId } : undefined),
      ...(extracted.outputText != null
        ? { output_text: extracted.outputText }
        : undefined),
    };

    const { beforeReport } = this.cloud.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.reported.add(dedupeKey);
    await this.cloud.runs.report(report).catch(() => {});
  }
}

function deriveStatus(
  event: TelemetryFinishEvent,
  extracted: RunTelemetryData,
): AssistantCloudRunReport["status"] {
  if (event.isError) return "error";
  if (event.isAbort || event.isDisconnect) return "incomplete";
  switch (event.finishReason) {
    case "stop":
    case "tool-calls":
      return "completed";
    case "length":
    case "content-filter":
      return "incomplete";
    case "error":
      return "error";
    default:
      return extracted.status;
  }
}
