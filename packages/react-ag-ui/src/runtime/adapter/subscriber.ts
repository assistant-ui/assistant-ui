"use client";

import type { AgUiEvent } from "../types";
import { parseAgUiEvent } from "../event-parser";
import type { Logger } from "../logger";

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
  onReasoningStartEvent?: (payload: { event: unknown }) => void;
  onReasoningEndEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageStartEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageContentEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageEndEvent?: (payload: { event: unknown }) => void;
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallArgsEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onToolCallChunkEvent?: (payload: { event: unknown }) => void;
  onToolCallResultEvent?: (payload: { event: unknown }) => void;
  onActivitySnapshotEvent?: (payload: { event: unknown }) => void;
  onStateSnapshotEvent?: (payload: { event: unknown }) => void;
  onStateDeltaEvent?: (payload: { event: unknown }) => void;
  onMessagesSnapshotEvent?: (payload: { event: unknown }) => void;
  onCustomEvent?: (payload: { event: unknown }) => void;
  onRawEvent?: (payload: { event: unknown }) => void;
  onRunFinishedEvent?: (payload: { event: unknown }) => void;
  onRunFinalized?: () => void;
  onRunFailed?: (payload: { error: Error }) => void;
};

const isAbortError = (error: Error): boolean => {
  if (error.name === "AbortError") return true;
  const message = typeof error.message === "string" ? error.message : "";
  return (
    message === "Fetch is aborted" ||
    message === "signal is aborted without reason" ||
    message === "component unmounted"
  );
};

const ensureEvent = (
  raw: unknown,
  type: AgUiEvent["type"],
  logger?: Logger,
): AgUiEvent | null => {
  const parseOptions = logger ? { logger } : undefined;
  let parsed: AgUiEvent | null;
  if (raw && typeof raw === "object") {
    const payload = raw as Record<string, unknown>;
    if (typeof payload.type === "string") {
      parsed = parseAgUiEvent(payload, parseOptions);
    } else {
      parsed = parseAgUiEvent({ type, ...payload }, parseOptions);
    }
  } else {
    parsed = parseAgUiEvent({ type }, parseOptions);
  }
  return parsed && parsed.type === type ? parsed : null;
};

type SubscriberOptions = {
  dispatch: Dispatch;
  runId: string;
  logger?: Logger;
  onRunFailed?: (error: Error) => void;
};

export const createAgUiSubscriber = (
  options: SubscriberOptions,
): Subscriber => {
  const { dispatch, runId, logger, onRunFailed } = options;
  let runFinishedDispatched = false;
  const dispatchIfValid = (raw: unknown, type: AgUiEvent["type"]) => {
    const event = ensureEvent(raw, type, logger);
    if (!event) return;
    dispatch(event);
  };
  return {
    onEvent: ({ event }) => {
      const typeCandidate =
        event && typeof event === "object"
          ? (event as Record<string, unknown>).type
          : undefined;
      if (typeof typeCandidate === "string") {
        // Typed handlers will receive this via the discriminated callbacks; avoid duplicates.
        return;
      }
      const parsed = parseAgUiEvent(event);
      if (parsed) dispatch(parsed);
    },
    onTextMessageStartEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_START"),
    onTextMessageContentEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_CONTENT"),
    onTextMessageEndEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_END"),
    onTextMessageChunkEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_CHUNK"),
    onThinkingStartEvent: ({ event }) =>
      dispatchIfValid(event, "THINKING_START"),
    onThinkingEndEvent: ({ event }) => dispatchIfValid(event, "THINKING_END"),
    onThinkingTextMessageStartEvent: ({ event }) =>
      dispatchIfValid(event, "THINKING_TEXT_MESSAGE_START"),
    onThinkingTextMessageContentEvent: ({ event }) =>
      dispatchIfValid(event, "THINKING_TEXT_MESSAGE_CONTENT"),
    onThinkingTextMessageEndEvent: ({ event }) =>
      dispatchIfValid(event, "THINKING_TEXT_MESSAGE_END"),
    onReasoningStartEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_START"),
    onReasoningEndEvent: ({ event }) => dispatchIfValid(event, "REASONING_END"),
    onReasoningMessageStartEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_START"),
    onReasoningMessageContentEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_CONTENT"),
    onReasoningMessageEndEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_END"),
    onToolCallStartEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_START"),
    onToolCallArgsEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_ARGS"),
    onToolCallEndEvent: ({ event }) => dispatchIfValid(event, "TOOL_CALL_END"),
    onToolCallChunkEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_CHUNK"),
    onToolCallResultEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_RESULT"),
    onActivitySnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "ACTIVITY_SNAPSHOT"),
    onStateSnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "STATE_SNAPSHOT"),
    onStateDeltaEvent: ({ event }) => dispatchIfValid(event, "STATE_DELTA"),
    onMessagesSnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "MESSAGES_SNAPSHOT"),
    onCustomEvent: ({ event }) => dispatchIfValid(event, "CUSTOM"),
    onRawEvent: ({ event }) => dispatchIfValid(event, "RAW"),
    onRunFinishedEvent: ({ event }) => {
      const parsed = ensureEvent(event, "RUN_FINISHED", logger);
      if (!parsed) return;
      runFinishedDispatched = true;
      dispatch(parsed);
    },
    onRunFinalized: () => {
      if (runFinishedDispatched) return;
      dispatch({ type: "RUN_FINISHED", runId });
    },
    onRunFailed: ({ error }) => {
      runFinishedDispatched = true;
      onRunFailed?.(error);
      if (isAbortError(error)) {
        dispatch({ type: "RUN_CANCELLED" } satisfies AgUiEvent);
        return;
      }
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
