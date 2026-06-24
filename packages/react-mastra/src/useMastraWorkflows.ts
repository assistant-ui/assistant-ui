"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MastraWorkflowCommand,
  MastraWorkflowConfig,
  MastraWorkflowInterrupt,
  MastraWorkflowState,
} from "./types";

type WorkflowEvent = {
  type: string;
  data?: unknown;
  timestamp?: string;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const recordValue = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const workflowStatus = (status: unknown): MastraWorkflowState["status"] => {
  if (status === "success" || status === "completed") return "completed";
  if (status === "suspended") return "suspended";
  if (status === "error" || status === "failed") return "error";
  return "running";
};

const firstSuspendedStep = (suspended: unknown): string | undefined => {
  if (!Array.isArray(suspended)) return undefined;
  const first = suspended[0];
  if (typeof first === "string") return first;
  if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  return undefined;
};

const suspendPayloadForStep = (value: unknown, current: string): unknown => {
  const payload = recordValue(value, "suspendPayload");
  return isRecord(payload) ? payload[current] : undefined;
};

const stepSuspendPayload = (value: unknown, current: string): unknown => {
  const steps = recordValue(value, "steps");
  const step = isRecord(steps) ? steps[current] : undefined;
  return recordValue(step, "suspendPayload");
};

const getSuspendData = (data: JsonRecord, current: string) => {
  const result = recordValue(data, "result");
  return (
    data["suspendData"] ??
    suspendPayloadForStep(data, current) ??
    suspendPayloadForStep(result, current) ??
    stepSuspendPayload(result, current) ??
    stepSuspendPayload(data, current) ??
    (isRecord(result) &&
    recordValue(result, "status") == null &&
    recordValue(result, "steps") == null
      ? result
      : undefined)
  );
};

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const workflowStateFromResponse = (
  data: JsonRecord,
  fallback: {
    context: Record<string, unknown>;
    current: string;
    event: string;
  },
): MastraWorkflowState => {
  const result = recordValue(data, "result");
  const status = workflowStatus(data["status"]);
  const current =
    stringValue(data["current"]) ??
    stringValue(data["currentStep"]) ??
    firstSuspendedStep(data["suspended"]) ??
    firstSuspendedStep(recordValue(result, "suspended")) ??
    fallback.current;

  return {
    id: stringValue(data["runId"]) ?? stringValue(data["id"]) ?? "",
    current,
    status,
    context: fallback.context,
    history: [
      {
        from: "none",
        to: current,
        event: fallback.event,
        timestamp: new Date().toISOString(),
      },
    ],
    suspendData:
      status === "suspended" ? getSuspendData(data, current) : undefined,
    timestamp: new Date().toISOString(),
  };
};

export const useMastraWorkflows = (config: MastraWorkflowConfig) => {
  const [workflowState, setWorkflowState] =
    useState<MastraWorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const apiBase = useMemo(
    () => config.apiUrl ?? "/api/workflow",
    [config.apiUrl],
  );
  const eventsBase = useMemo(
    () => config.eventsUrl ?? `${apiBase}/events`,
    [apiBase, config.eventsUrl],
  );

  const applyState = useCallback(
    (state: MastraWorkflowState) => {
      setWorkflowState(state);
      setIsRunning(state.status === "running");
      setIsSuspended(state.status === "suspended");
      config.onStateChange?.(state);
      if (state.interrupt) config.onInterrupt?.(state.interrupt);
      return state;
    },
    [config],
  );

  const startWorkflow = useCallback(
    async (initialContext?: Record<string, unknown>) => {
      const context = { ...config.context, ...initialContext };
      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        const error = new Error(data.error ?? "Failed to start workflow");
        config.onError?.(error);
        throw error;
      }

      return applyState(
        workflowStateFromResponse(data, {
          context,
          current: config.initialState ?? "start",
          event: "start",
        }),
      );
    },
    [apiBase, applyState, config],
  );

  const suspendWorkflow = useCallback(async () => {
    if (!workflowState) return undefined;
    return applyState({ ...workflowState, status: "suspended" });
  }, [applyState, workflowState]);

  const resumeWorkflow = useCallback(
    async (input?: unknown) => {
      if (!workflowState) return undefined;

      const response = await fetch(`${apiBase}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: workflowState.id,
          stepId: workflowState.current,
          resumeData: input,
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        const error = new Error(data.error ?? "Failed to resume workflow");
        config.onError?.(error);
        throw error;
      }

      const next = workflowStateFromResponse(data, {
        context: {
          ...workflowState.context,
          ...(input !== undefined && { resumeInput: input }),
        },
        current: workflowState.current,
        event: "resume",
      });
      next.history = [
        ...workflowState.history,
        {
          from: workflowState.current,
          to: next.current,
          event: "resume",
          timestamp: new Date().toISOString(),
        },
      ];
      return applyState(next);
    },
    [apiBase, applyState, config, workflowState],
  );

  const sendCommand = useCallback(
    async (command: MastraWorkflowCommand) => {
      if (!workflowState) return undefined;
      if (command.resume !== undefined) return resumeWorkflow(command.resume);
      if (command.transition) {
        return resumeWorkflow({
          transition: command.transition,
          context: command.context,
        });
      }
      return workflowState;
    },
    [resumeWorkflow, workflowState],
  );

  const transitionTo = useCallback(
    async (targetState: string, context?: Record<string, unknown>) =>
      sendCommand({
        transition: targetState,
        ...(context && { context }),
      }),
    [sendCommand],
  );

  const workflowStateId = workflowState?.id;

  const eventHandlersRef = useRef({
    onStateChange: config.onStateChange,
    onError: config.onError,
  });
  eventHandlersRef.current = {
    onStateChange: config.onStateChange,
    onError: config.onError,
  };

  useEffect(() => {
    if (!workflowStateId) return;

    let active = true;
    const abortController = new AbortController();

    const connect = async () => {
      try {
        const response = await fetch(`${eventsBase}/${workflowStateId}`, {
          signal: abortController.signal,
        });
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const raw = trimmed.slice(5).trim();
            if (raw === "[DONE]") return;

            const event = JSON.parse(raw) as WorkflowEvent;
            if (event.type === "heartbeat") continue;

            setWorkflowState((current) => {
              if (!current) return current;
              if (event.type === "workflow-complete") {
                const completed = {
                  ...current,
                  status: "completed" as const,
                  timestamp: event.timestamp ?? new Date().toISOString(),
                };
                setIsRunning(false);
                setIsSuspended(false);
                eventHandlersRef.current.onStateChange?.(completed);
                return completed;
              }

              if (event.type === "error") {
                const errorState = {
                  ...current,
                  status: "error" as const,
                  timestamp: event.timestamp ?? new Date().toISOString(),
                };
                setIsRunning(false);
                setIsSuspended(false);
                eventHandlersRef.current.onStateChange?.(errorState);
                return errorState;
              }

              if (event.type !== "workflow-state-update") return current;

              const data = isRecord(event.data) ? event.data : {};
              const status = workflowStatus(data["status"]);
              const currentStep =
                stringValue(data["currentStep"]) ?? current.current;
              const updated: MastraWorkflowState = {
                ...current,
                current: currentStep,
                status,
                suspendData: data["suspended"]
                  ? stepSuspendPayload(data, currentStep)
                  : undefined,
                timestamp: event.timestamp ?? new Date().toISOString(),
              };
              setIsRunning(status === "running");
              setIsSuspended(status === "suspended");
              eventHandlersRef.current.onStateChange?.(updated);
              return updated;
            });
          }
        }
      } catch (error) {
        if (abortController.signal.aborted || !active) return;
        eventHandlersRef.current.onError?.(
          error instanceof Error
            ? error
            : new Error("Workflow event subscription failed"),
        );
      }
    };

    void connect();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [eventsBase, workflowStateId]);

  return {
    workflowState,
    isRunning,
    isSuspended,
    startWorkflow,
    suspendWorkflow,
    resumeWorkflow,
    sendCommand,
    transitionTo,
  };
};

export const useMastraWorkflowInterrupt = () => {
  const [interrupt, setInterrupt] = useState<MastraWorkflowInterrupt | null>(
    null,
  );

  return {
    interrupt,
    setWorkflowInterrupt: setInterrupt,
  };
};
