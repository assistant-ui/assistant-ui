import type { ServerEvent } from "../../../augment/types";
import { asRecord } from "./guards";

export function messageIdFromEvent(event: ServerEvent): string {
  const payloadMessage = asRecord(asRecord(event.payload).message);
  return typeof payloadMessage.id === "string"
    ? payloadMessage.id
    : `assistant-${event.threadId ?? event.sessionId}`;
}

export function toolCallIdFromPayload(
  payload: Record<string, any>,
): string | null {
  return typeof payload.toolCallId === "string"
    ? payload.toolCallId
    : typeof payload.id === "string"
      ? payload.id
      : null;
}

export function subagentIdFromPayload(
  payload: Record<string, any>,
  event: ServerEvent,
): string {
  return String(
    payload.subagentId ??
      payload.agentId ??
      payload.toolCallId ??
      `subagent-${event.id}`,
  );
}
