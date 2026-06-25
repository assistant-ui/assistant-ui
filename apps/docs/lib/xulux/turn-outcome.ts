import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";

export type XuluxTurnOutcomeType =
  | "assistant_response_completed"
  | "budget_denied";

export type XuluxTurnOutcomeSeverity = "info" | "warning" | "error";

export type XuluxTurnOutcome = {
  type: XuluxTurnOutcomeType;
  status: "completed";
  severity: XuluxTurnOutcomeSeverity;
  requestId: string;
  capturedAt: string;
  sessionId?: string;
  distinctId?: string;
  userMessageId?: string;
  code?: string;
  statusCode?: number;
  userVisibleMessage?: string;
  technicalSummary?: string;
};

type CreateXuluxTurnOutcomeOptions = Omit<
  XuluxTurnOutcome,
  "capturedAt" | "severity" | "status"
> & {
  capturedAt?: string;
};

export function createXuluxTurnOutcome({
  capturedAt = new Date().toISOString(),
  ...options
}: CreateXuluxTurnOutcomeOptions): XuluxTurnOutcome {
  return {
    ...options,
    status: "completed",
    severity:
      options.type === "assistant_response_completed" ? "info" : "warning",
    capturedAt,
  };
}

export function getLatestUserMessageId(messages: readonly UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && typeof message.id === "string") {
      return message.id;
    }
  }
  return "";
}

export function createXuluxDiagnosticMessageResponse({
  messages,
  text,
  outcome,
}: {
  messages: UIMessage[];
  text: string;
  outcome: XuluxTurnOutcome;
}): Response {
  const textPartId = `text_${outcome.requestId}`;
  const stream = createUIMessageStream<UIMessage>({
    originalMessages: messages,
    execute: ({ writer }) => {
      writer.write({
        type: "start",
        messageMetadata: { custom: { xulux: { outcome } } },
      });
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: text });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
