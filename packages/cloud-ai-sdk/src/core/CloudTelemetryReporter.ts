import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantCloudRunReport } from "assistant-cloud";
import { extractRunTelemetry } from "./extractRunTelemetry";

export class CloudTelemetryReporter {
  private reported = new Set<string>();

  constructor(private cloud: AssistantCloud) {}

  async reportFromMessages(
    threadId: string,
    messages: UIMessage[],
  ): Promise<void> {
    if (!this.cloud.telemetry.enabled) return;

    const extracted = extractRunTelemetry(messages);
    if (!extracted) return;

    const dedupeKey = `${threadId}:${extracted.assistantMessageId}`;
    if (this.reported.has(dedupeKey)) return;

    // Keep in sync with assistant-cloud createRunSchema
    // (apps/aui-cloud-api/src/endpoints/runs/create.ts).
    const initial: AssistantCloudRunReport = {
      thread_id: threadId,
      status: extracted.status,
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
