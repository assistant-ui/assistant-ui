import type { UIMessage } from "@ai-sdk/react";
import {
  type AssistantCloud,
  CloudRunReporter,
  deriveRunOutcome,
  describeRunError,
} from "assistant-cloud";
import { extractAISDKRunTelemetry } from "assistant-cloud/ai-sdk";
import {
  type FinishReason,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";

export type TelemetryFinishEvent = {
  finishReason?: FinishReason;
  isAbort: boolean;
  isDisconnect: boolean;
  isError: boolean;
  error?: unknown;
};

export type TelemetryRunTiming = {
  durationMs?: number;
  firstTokenMs?: number;
};

export class CloudTelemetryReporter {
  private readonly reporter: CloudRunReporter;

  constructor(cloud: AssistantCloud) {
    this.reporter = new CloudRunReporter(cloud);
  }

  async reportFromMessages(
    threadId: string,
    messages: UIMessage[],
    event?: TelemetryFinishEvent,
    timing?: TelemetryRunTiming,
    getResolvedRemoteId?: (messageId: string) => string | undefined,
  ): Promise<void> {
    // mid-loop checkpoint: ai sdk's sendAutomaticallyWhen will resubmit and a
    // later onFinish will fire on the same assistantMessageId with the final state.
    if (
      event?.finishReason === "tool-calls" &&
      lastAssistantMessageIsCompleteWithToolCalls({ messages })
    ) {
      return;
    }

    const lastAssistantMessage = getLastAssistantMessage(messages);
    if (!lastAssistantMessage) return;

    const extracted = extractAISDKRunTelemetry([lastAssistantMessage]);
    if (!extracted) return;

    const assistantMessageId = extracted.assistantMessageId;
    if (!assistantMessageId) return;

    const lastStep = extracted.steps?.at(-1);
    if (lastStep && event?.finishReason !== undefined) {
      lastStep.finishReason = event.finishReason;
    }

    const outcome = event
      ? deriveRunOutcome(event, extracted.status)
      : undefined;
    const metadata = extracted.metadata;
    await this.reporter.report(
      {
        threadId,
        status: outcome?.status ?? extracted.status,
        outcome: outcome?.outcome,
        ...describeRunError(event?.error),
        messageId: getResolvedRemoteId?.(assistantMessageId),
        traceId:
          typeof metadata?.traceId === "string" ? metadata.traceId : undefined,
        modelId: extracted.modelId,
        provider:
          typeof metadata?.provider === "string"
            ? metadata.provider
            : undefined,
        usage: extracted.usage,
        steps: extracted.steps,
        toolCalls: extracted.toolCalls,
        durationMs: timing?.durationMs,
        firstTokenMs: timing?.firstTokenMs,
        outputText: extracted.outputText,
      },
      `${threadId}:${assistantMessageId}`,
    );
  }
}

function getLastAssistantMessage(messages: UIMessage[]): UIMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role === "assistant") return message;
  }
  return undefined;
}
