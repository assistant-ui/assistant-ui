import type { AdkEvent, AdkEventActions, AdkEventPart } from "../types";

/**
 * The ADK SDK Event type. Intentionally loose to avoid requiring @google/adk.
 */
type AdkSdkEvent = {
  id?: string;
  invocationId?: string;
  author?: string;
  branch?: string;
  partial?: boolean;
  turnComplete?: boolean;
  interrupted?: boolean;
  finishReason?: string;
  timestamp?: number;
  content?: {
    role?: string;
    parts?: Array<Record<string, unknown>>;
  };
  actions?: Record<string, unknown>;
  longRunningToolIds?: string[];
  errorCode?: string;
  errorMessage?: string;
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
  customMetadata?: Record<string, unknown>;
};

const convertSdkPart = (part: Record<string, unknown>): AdkEventPart => {
  const result: Record<string, unknown> = {};
  if ("text" in part && typeof part.text === "string") result.text = part.text;
  if ("thought" in part && typeof part.thought === "boolean")
    result.thought = part.thought;
  if ("functionCall" in part && part.functionCall)
    result.functionCall = part.functionCall;
  if ("functionResponse" in part && part.functionResponse)
    result.functionResponse = part.functionResponse;
  if ("executableCode" in part && part.executableCode)
    result.executableCode = part.executableCode;
  if ("codeExecutionResult" in part && part.codeExecutionResult)
    result.codeExecutionResult = part.codeExecutionResult;
  if ("inlineData" in part && part.inlineData)
    result.inlineData = part.inlineData;
  if ("fileData" in part && part.fileData) result.fileData = part.fileData;
  return result as AdkEventPart;
};

const convertSdkActions = (
  actions: Record<string, unknown>,
): AdkEventActions => {
  const result: Record<string, unknown> = {};
  if (actions.stateDelta != null) result.stateDelta = actions.stateDelta;
  if (actions.artifactDelta != null)
    result.artifactDelta = actions.artifactDelta;
  if (actions.transferToAgent != null)
    result.transferToAgent = actions.transferToAgent;
  if (actions.escalate != null) result.escalate = actions.escalate;
  if (actions.skipSummarization != null)
    result.skipSummarization = actions.skipSummarization;
  if (actions.requestedAuthConfigs != null)
    result.requestedAuthConfigs = actions.requestedAuthConfigs;
  if (actions.requestedToolConfirmations != null)
    result.requestedToolConfirmations = actions.requestedToolConfirmations;
  return result as AdkEventActions;
};

const convertSdkEvent = (event: AdkSdkEvent): AdkEvent => {
  const result: Record<string, unknown> = { id: event.id ?? "" };
  if (event.invocationId != null) result.invocationId = event.invocationId;
  if (event.author != null) result.author = event.author;
  if (event.branch != null) result.branch = event.branch;
  if (event.partial != null) result.partial = event.partial;
  if (event.turnComplete != null) result.turnComplete = event.turnComplete;
  if (event.interrupted != null) result.interrupted = event.interrupted;
  if (event.finishReason != null) result.finishReason = event.finishReason;
  if (event.timestamp != null) result.timestamp = event.timestamp;
  if (event.content) {
    const content: Record<string, unknown> = {};
    if (event.content.role != null) content.role = event.content.role;
    if (event.content.parts)
      content.parts = event.content.parts.map(convertSdkPart);
    result.content = content;
  }
  if (event.actions) result.actions = convertSdkActions(event.actions);
  if (event.longRunningToolIds)
    result.longRunningToolIds = event.longRunningToolIds;
  if (event.errorCode != null) result.errorCode = event.errorCode;
  if (event.errorMessage != null) result.errorMessage = event.errorMessage;
  if (event.groundingMetadata != null)
    result.groundingMetadata = event.groundingMetadata;
  if (event.citationMetadata != null)
    result.citationMetadata = event.citationMetadata;
  if (event.usageMetadata != null) result.usageMetadata = event.usageMetadata;
  if (event.customMetadata != null)
    result.customMetadata = event.customMetadata;
  return result as AdkEvent;
};

export type AdkEventStreamOptions = {
  onError?: (error: unknown) => void;
};

/**
 * Converts an AsyncGenerator of ADK SDK Events into an SSE Response.
 *
 * @example
 * ```ts
 * import { adkEventStream } from '@assistant-ui/react-google-adk/server';
 * const events = runner.runAsync({ userId, sessionId, newMessage });
 * return adkEventStream(events);
 * ```
 */
export const adkEventStream = (
  events: AsyncGenerator<AdkSdkEvent, void, undefined>,
  options?: AdkEventStreamOptions,
): Response => {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      // Initial SSE comment to keep connection alive through proxies
      controller.enqueue(encoder.encode(":ok\n\n"));
      try {
        for await (const event of events) {
          if (cancelled) break;
          const wireEvent = convertSdkEvent(event);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(wireEvent)}\n\n`),
          );
        }
      } catch (e) {
        if (!cancelled) {
          options?.onError?.(e);
          const errorEvent: AdkEvent = {
            id: "",
            errorCode: "STREAM_ERROR",
            errorMessage:
              e instanceof Error ? e.message : "Unknown stream error",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
          );
        }
      } finally {
        controller.close();
      }
    },
    async cancel() {
      cancelled = true;
      await events.return?.(undefined as any);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
