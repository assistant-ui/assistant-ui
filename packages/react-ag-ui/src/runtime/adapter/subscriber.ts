"use client";

import type { AgUiEvent } from "../types";
import { parseAgUiEvent } from "../event-parser";
import type { Logger } from "../logger";

type Dispatch = (event: AgUiEvent) => void;

type Subscriber = {
  onTextMessageStartEvent?: (payload: { event: unknown }) => void;
  onTextMessageContentEvent?: (payload: { event: unknown }) => void;
  onTextMessageEndEvent?: (payload: { event: unknown }) => void;
  onReasoningStartEvent?: (payload: { event: unknown }) => void;
  onReasoningEndEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageStartEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageContentEvent?: (payload: { event: unknown }) => void;
  onReasoningMessageEndEvent?: (payload: { event: unknown }) => void;
  onReasoningEncryptedValueEvent?: (payload: { event: unknown }) => void;
  onToolCallStartEvent?: (payload: { event: unknown }) => void;
  onToolCallArgsEvent?: (payload: { event: unknown }) => void;
  onToolCallEndEvent?: (payload: { event: unknown }) => void;
  onToolCallResultEvent?: (payload: { event: unknown }) => void;
  onActivitySnapshotEvent?: (payload: { event: unknown }) => void;
  onActivityDeltaEvent?: (payload: { event: unknown }) => void;
  onStateSnapshotEvent?: (payload: { event: unknown }) => void;
  onStateDeltaEvent?: (payload: { event: unknown }) => void;
  onMessagesSnapshotEvent?: (payload: { event: unknown }) => void;
  onCustomEvent?: (payload: { event: unknown }) => void;
  onRawEvent?: (payload: { event: unknown }) => void;
  onSubagentStartedEvent?: (payload: { event: unknown }) => void;
  onSubagentFinishedEvent?: (payload: { event: unknown }) => void;
  onSubagentErrorEvent?: (payload: { event: unknown }) => void;
  onRunFinishedEvent?: (payload: { event: unknown }) => void;
  onRunErrorEvent?: (payload: { event: unknown }) => void;
  onStepStartedEvent?: (payload: { event: unknown }) => void;
  onStepFinishedEvent?: (payload: { event: unknown }) => void;
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
  const parsed = parseAgUiEvent(raw, parseOptions);
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
  const { dispatch, logger, onRunFailed } = options;
  let runFinishedDispatched = false;
  const dispatchIfValid = (raw: unknown, type: AgUiEvent["type"]) => {
    const event = ensureEvent(raw, type, logger);
    if (!event) return;
    dispatch(event);
  };
  return {
    onTextMessageStartEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_START"),
    onTextMessageContentEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_CONTENT"),
    onTextMessageEndEvent: ({ event }) =>
      dispatchIfValid(event, "TEXT_MESSAGE_END"),
    onReasoningStartEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_START"),
    onReasoningEndEvent: ({ event }) => dispatchIfValid(event, "REASONING_END"),
    onReasoningMessageStartEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_START"),
    onReasoningMessageContentEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_CONTENT"),
    onReasoningMessageEndEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_MESSAGE_END"),
    onReasoningEncryptedValueEvent: ({ event }) =>
      dispatchIfValid(event, "REASONING_ENCRYPTED_VALUE"),
    onToolCallStartEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_START"),
    onToolCallArgsEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_ARGS"),
    onToolCallEndEvent: ({ event }) => dispatchIfValid(event, "TOOL_CALL_END"),
    onToolCallResultEvent: ({ event }) =>
      dispatchIfValid(event, "TOOL_CALL_RESULT"),
    onActivitySnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "ACTIVITY_SNAPSHOT"),
    onActivityDeltaEvent: ({ event }) =>
      dispatchIfValid(event, "ACTIVITY_DELTA"),
    onStateSnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "STATE_SNAPSHOT"),
    onStateDeltaEvent: ({ event }) => dispatchIfValid(event, "STATE_DELTA"),
    onMessagesSnapshotEvent: ({ event }) =>
      dispatchIfValid(event, "MESSAGES_SNAPSHOT"),
    onCustomEvent: ({ event }) => dispatchIfValid(event, "CUSTOM"),
    onRawEvent: ({ event }) => dispatchIfValid(event, "RAW"),
    onSubagentStartedEvent: ({ event }) =>
      dispatchIfValid(event, "SUBAGENT_STARTED"),
    onSubagentFinishedEvent: ({ event }) =>
      dispatchIfValid(event, "SUBAGENT_FINISHED"),
    onSubagentErrorEvent: ({ event }) =>
      dispatchIfValid(event, "SUBAGENT_ERROR"),
    onRunFinishedEvent: ({ event }) => {
      if (runFinishedDispatched) return;
      const parsed = ensureEvent(event, "RUN_FINISHED", logger);
      if (!parsed) return;
      runFinishedDispatched = true;
      dispatch(parsed);
    },
    onRunErrorEvent: ({ event }) => {
      const parsed = ensureEvent(event, "RUN_ERROR", logger);
      if (!parsed || parsed.type !== "RUN_ERROR") return;
      runFinishedDispatched = true;
      dispatch(parsed);

      const error = Object.assign(
        new Error(parsed.message ?? "Run failed"),
        parsed.code === undefined ? {} : { code: parsed.code },
      );
      onRunFailed?.(error);
    },
    onStepStartedEvent: ({ event }) =>
      logger?.debug?.("[agui] step boundary ignored", event),
    onStepFinishedEvent: ({ event }) =>
      logger?.debug?.("[agui] step boundary ignored", event),
    onRunFailed: ({ error }) => {
      if (runFinishedDispatched) return;
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
