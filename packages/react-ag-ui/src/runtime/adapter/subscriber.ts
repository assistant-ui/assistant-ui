"use client";

import type { AgUiEvent } from "../types";
import { parseAgUiEvent } from "../event-parser";

type Dispatch = (event: AgUiEvent) => void;

type Subscriber = {
  onEvent?: (payload: { event: unknown }) => void;
  onTextMessageStartEvent?: (payload: { event: unknown }) => void;
  onTextMessageContentEvent?: (payload: { event: unknown }) => void;
  onTextMessageEndEvent?: (payload: { event: unknown }) => void;
  onTextMessageChunkEvent?: (payload: { event: unknown }) => void;
  onThinkingStartEvent?: (payload: { event: unknown }) => void;
  onThinkingEndEvent?: (payload: { event: unknown }) => void;
  onThinkingTextMessageStartEvent?: (payload: { event: unknown }) => void;
  onThinkingTextMessageContentEvent?: (payload: { event: unknown }) => void;
  onThinkingTextMessageEndEvent?: (payload: { event: unknown }) => void;
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallArgsEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onToolCallChunkEvent?: (payload: { event: unknown }) => void;
  onToolCallResultEvent?: (payload: { event: unknown }) => void;
  onStateSnapshotEvent?: (payload: { event: unknown }) => void;
  onStateDeltaEvent?: (payload: { event: unknown }) => void;
  onMessagesSnapshotEvent?: (payload: { event: unknown }) => void;
  onCustomEvent?: (payload: { event: unknown }) => void;
  onRawEvent?: (payload: { event: unknown }) => void;
  onRunFinalized?: () => void;
  onRunFailed?: (payload: { error: Error }) => void;
};

const ensureEvent = (
  raw: unknown,
  type: AgUiEvent["type"],
): AgUiEvent | null => {
  if (raw && typeof raw === "object") {
    const payload = raw as Record<string, unknown>;
    if (typeof payload["type"] === "string") {
      return parseAgUiEvent(payload);
    }
    return parseAgUiEvent({ type, ...payload });
  }
  return parseAgUiEvent({ type });
};

const dispatchIfValid = (
  dispatch: Dispatch,
  raw: unknown,
  type: AgUiEvent["type"],
) => {
  const event = ensureEvent(raw, type);
  if (!event) return;
  dispatch(event);
};

type SubscriberOptions = {
  dispatch: Dispatch;
  runId: string;
  onRunFailed?: (error: Error) => void;
};

export const createAgUiSubscriber = (
  options: SubscriberOptions,
): Subscriber => {
  const { dispatch, runId, onRunFailed } = options;
  return {
    onEvent: ({ event }) => {
      const typeCandidate =
        event && typeof event === "object"
          ? (event as Record<string, unknown>)["type"]
          : undefined;
      if (typeof typeCandidate === "string") {
        // Typed handlers will receive this via the discriminated callbacks; avoid duplicates.
        return;
      }
      const parsed = parseAgUiEvent(event);
      if (parsed) dispatch(parsed);
    },
    onTextMessageStartEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TEXT_MESSAGE_START"),
    onTextMessageContentEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TEXT_MESSAGE_CONTENT"),
    onTextMessageEndEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TEXT_MESSAGE_END"),
    onTextMessageChunkEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TEXT_MESSAGE_CHUNK"),
    onThinkingStartEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "THINKING_START"),
    onThinkingEndEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "THINKING_END"),
    onThinkingTextMessageStartEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "THINKING_TEXT_MESSAGE_START"),
    onThinkingTextMessageContentEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "THINKING_TEXT_MESSAGE_CONTENT"),
    onThinkingTextMessageEndEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "THINKING_TEXT_MESSAGE_END"),
    onToolCallStartEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TOOL_CALL_START"),
    onToolCallArgsEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TOOL_CALL_ARGS"),
    onToolCallEndEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TOOL_CALL_END"),
    onToolCallChunkEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TOOL_CALL_CHUNK"),
    onToolCallResultEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "TOOL_CALL_RESULT"),
    onStateSnapshotEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "STATE_SNAPSHOT"),
    onStateDeltaEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "STATE_DELTA"),
    onMessagesSnapshotEvent: ({ event }) =>
      dispatchIfValid(dispatch, event, "MESSAGES_SNAPSHOT"),
    onCustomEvent: ({ event }) => dispatchIfValid(dispatch, event, "CUSTOM"),
    onRawEvent: ({ event }) => dispatchIfValid(dispatch, event, "RAW"),
    onRunFinalized: () => dispatch({ type: "RUN_FINISHED", runId }),
    onRunFailed: ({ error }) => {
      onRunFailed?.(error);
      const message =
        typeof error.message === "string" ? error.message : "Run failed";
      const code =
        typeof (error as any)?.code === "string"
          ? (error as any).code
          : undefined;
      dispatch({
        type: "RUN_ERROR" as const,
        ...(message !== undefined ? { message } : {}),
        ...(code !== undefined ? { code } : {}),
      } satisfies AgUiEvent);
    },
  };
};

export type AgUiSubscriber = ReturnType<typeof createAgUiSubscriber>;
