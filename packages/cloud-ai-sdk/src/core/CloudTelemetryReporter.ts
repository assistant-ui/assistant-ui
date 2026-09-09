import type { UIMessage } from "@ai-sdk/react";
import {
  type AssistantCloud,
  createRunReport,
  deriveRunOutcome,
  type RunReportStepInit,
  type RunTelemetryUsageInit,
} from "assistant-cloud";
import {
  type FinishReason,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { extractRunTelemetry } from "./extractRunTelemetry";

export type TelemetryFinishEvent = {
  finishReason?: FinishReason;
  isAbort: boolean;
  isDisconnect: boolean;
  isError: boolean;
};

export type TelemetryRunTiming = {
  durationMs?: number;
  firstTokenMs?: number;
};

export class CloudTelemetryReporter {
  private reported = new Set<string>();

  private cloud: AssistantCloud;

  constructor(cloud: AssistantCloud) {
    this.cloud = cloud;
  }

  async reportFromMessages(
    threadId: string,
    messages: UIMessage[],
    event?: TelemetryFinishEvent,
    timing?: TelemetryRunTiming,
    getResolvedRemoteId?: (messageId: string) => string | undefined,
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

    const outcome = event ? deriveRunOutcome(event) : undefined;
    const metadata = getAssistantMetadata(
      messages,
      extracted.assistantMessageId,
    );
    const initial = createRunReport({
      threadId,
      status: outcome?.status ?? extracted.status,
      outcome: outcome?.outcome,
      messageId: getResolvedRemoteId?.(extracted.assistantMessageId),
      traceId:
        typeof metadata?.traceId === "string" ? metadata.traceId : undefined,
      modelId: extracted.modelId,
      provider:
        typeof metadata?.provider === "string" ? metadata.provider : undefined,
      usage: {
        ...(extracted.inputTokens !== undefined
          ? { inputTokens: extracted.inputTokens }
          : undefined),
        ...(extracted.outputTokens !== undefined
          ? { outputTokens: extracted.outputTokens }
          : undefined),
        ...(extracted.reasoningTokens !== undefined
          ? { reasoningTokens: extracted.reasoningTokens }
          : undefined),
        ...(extracted.cachedInputTokens !== undefined
          ? { cachedInputTokens: extracted.cachedInputTokens }
          : undefined),
      },
      steps: createRunReportSteps(
        messages,
        extracted.assistantMessageId,
        extracted.totalSteps,
        event,
      ),
      toolCalls: extracted.toolCalls,
      durationMs: timing?.durationMs,
      firstTokenMs: timing?.firstTokenMs,
      outputText: extracted.outputText,
      telemetry: this.cloud.telemetry,
    });

    const { beforeReport } = this.cloud.telemetry;
    const report = beforeReport ? beforeReport(initial) : initial;
    if (!report) return;

    this.reported.add(dedupeKey);
    await this.cloud.runs.report(report).catch(() => {});
  }
}

function getAssistantMessage(
  messages: UIMessage[],
  assistantMessageId: string,
): UIMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.id === assistantMessageId) return message;
  }
  return undefined;
}

function getAssistantMetadata(
  messages: UIMessage[],
  assistantMessageId: string,
): Record<string, unknown> | undefined {
  const metadata = getAssistantMessage(messages, assistantMessageId)?.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : undefined;
}

function createRunReportSteps(
  messages: UIMessage[],
  assistantMessageId: string,
  totalSteps: number | undefined,
  event: TelemetryFinishEvent | undefined,
): RunReportStepInit[] | undefined {
  if (!totalSteps) return undefined;
  const assistant = getAssistantMessage(messages, assistantMessageId);
  const metadata = assistant?.metadata;
  const metadataSteps =
    metadata &&
    typeof metadata === "object" &&
    Array.isArray((metadata as Record<string, unknown>).steps)
      ? ((metadata as Record<string, unknown>).steps as unknown[])
      : [];
  const steps: RunReportStepInit[] = Array.from(
    { length: totalSteps },
    (_, index) => {
      const step = metadataSteps[index];
      const usage =
        step &&
        typeof step === "object" &&
        (step as Record<string, unknown>).usage &&
        typeof (step as Record<string, unknown>).usage === "object"
          ? ((step as Record<string, unknown>).usage as RunTelemetryUsageInit)
          : undefined;
      return usage ? { usage } : {};
    },
  );

  let stepIndex = -1;
  for (const part of assistant?.parts ?? []) {
    if (part.type === "step-start") {
      stepIndex += 1;
      continue;
    }
    if (
      stepIndex >= 0 &&
      stepIndex < steps.length &&
      typeof (part as Record<string, unknown>).toolCallId === "string"
    ) {
      steps[stepIndex]!.finishReason = "tool-calls";
    }
  }
  const lastStep = steps.at(-1);
  if (lastStep && event?.finishReason !== undefined) {
    lastStep.finishReason = event.finishReason;
  }
  return steps;
}
