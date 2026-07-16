"use client";

import type {
  GetWorkflowRunByIdResponse,
  WorkflowRunResult,
} from "@mastra/client-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MastraSuspendedStep,
  MastraWorkflowResumeOptions,
  MastraWorkflowStartOptions,
  MastraWorkflowState,
  UseMastraWorkflowOptions,
} from "./types";

type WorkflowSource = WorkflowRunResult | GetWorkflowRunByIdResponse;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toError = (value: unknown): Error | undefined => {
  if (value === undefined) return undefined;
  if (value instanceof Error) return value;
  if (isRecord(value) && typeof value.message === "string") {
    return new Error(value.message);
  }
  return new Error(String(value));
};

const findResumeIndex = (
  source: WorkflowSource,
  stepId: string,
  fallback?: number,
) => {
  const labels = source.resumeLabels;
  if (!labels) return fallback;
  return (
    Object.values(labels).find(
      (label) =>
        label.stepId === stepId &&
        (fallback === undefined || label.forEachIndex === fallback),
    )?.forEachIndex ?? fallback
  );
};

const toSuspendedStep = <TSuspend>(
  source: WorkflowSource,
  stepId: string,
  path: string[],
  step: unknown,
  forEachIndex?: number,
): MastraSuspendedStep<TSuspend> | undefined => {
  if (!isRecord(step) || step.status !== "suspended") return undefined;
  return {
    stepId,
    path,
    forEachIndex: findResumeIndex(source, stepId, forEachIndex),
    payload: step.suspendPayload as TSuspend,
  };
};

const getSuspendedSteps = <TSuspend>(
  source: WorkflowSource,
): MastraSuspendedStep<TSuspend>[] => {
  if (source.status !== "suspended" || !source.steps) return [];
  const steps = source.steps as Record<string, unknown>;

  if ("suspended" in source) {
    return source.suspended.flatMap((path) => {
      const stepId = path.at(-1);
      if (!stepId) return [];
      const step = steps[stepId];
      if (Array.isArray(step)) {
        return step.flatMap((item, index) => {
          const suspended = toSuspendedStep<TSuspend>(
            source,
            stepId,
            path,
            item,
            index,
          );
          return suspended ? [suspended] : [];
        });
      }
      const suspended = toSuspendedStep<TSuspend>(source, stepId, path, step);
      return suspended ? [suspended] : [];
    });
  }

  return Object.entries(steps).flatMap(([stepId, step]) => {
    if (Array.isArray(step)) {
      return step.flatMap((item, index) => {
        const suspended = toSuspendedStep<TSuspend>(
          source,
          stepId,
          [stepId],
          item,
          index,
        );
        return suspended ? [suspended] : [];
      });
    }
    const suspended = toSuspendedStep<TSuspend>(source, stepId, [stepId], step);
    return suspended ? [suspended] : [];
  });
};

const toWorkflowState = <TResult, TSuspend>(
  runId: string,
  source: WorkflowSource,
): MastraWorkflowState<TResult, TSuspend> => ({
  runId,
  status: source.status,
  result: ("result" in source ? source.result : undefined) as
    | TResult
    | undefined,
  error: toError("error" in source ? source.error : undefined),
  suspendedSteps: getSuspendedSteps<TSuspend>(source),
  raw: source,
});

const idleState = <TResult, TSuspend>(): MastraWorkflowState<
  TResult,
  TSuspend
> => ({
  runId: undefined,
  status: "idle",
  result: undefined,
  error: undefined,
  suspendedSteps: [],
  raw: undefined,
});

export const useMastraWorkflow = <
  TInput extends Record<string, unknown> = Record<string, unknown>,
  TResume extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
  TSuspend = unknown,
>({
  client,
  workflowId,
  runId: controlledRunId,
  resourceId,
  requestContext,
  onRunIdChange,
  onStateChange,
}: UseMastraWorkflowOptions<TResult, TSuspend>) => {
  const [state, setState] =
    useState<MastraWorkflowState<TResult, TSuspend>>(idleState);
  const operationRef = useRef(0);
  const callbacksRef = useRef({ onRunIdChange, onStateChange });
  useEffect(() => {
    callbacksRef.current = { onRunIdChange, onStateChange };
  });
  useEffect(
    () => () => {
      operationRef.current += 1;
    },
    [],
  );

  const commit = useCallback(
    (operation: number, nextState: MastraWorkflowState<TResult, TSuspend>) => {
      if (operationRef.current !== operation) return false;
      setState(nextState);
      callbacksRef.current.onStateChange?.(nextState);
      return true;
    },
    [],
  );

  const fail = useCallback(
    (operation: number, runId: string | undefined, error: unknown) => {
      const normalized = toError(error) ?? new Error("Workflow request failed");
      commit(operation, {
        runId,
        status: "failed",
        result: undefined,
        error: normalized,
        suspendedSteps: [],
        raw: undefined,
      });
      return normalized;
    },
    [commit],
  );

  const refreshRun = useCallback(
    async (runId: string) => {
      const operation = ++operationRef.current;
      try {
        const source = await client
          .getWorkflow(workflowId)
          .runById(runId, { requestContext });
        const nextState = toWorkflowState<TResult, TSuspend>(runId, source);
        commit(operation, nextState);
        return nextState;
      } catch (error) {
        throw fail(operation, runId, error);
      }
    },
    [client, workflowId, requestContext, commit, fail],
  );

  useEffect(() => {
    if (!controlledRunId) return;
    void refreshRun(controlledRunId).catch(() => {});
  }, [controlledRunId, refreshRun]);

  const start = useCallback(
    async (inputData: TInput, options: MastraWorkflowStartOptions = {}) => {
      const operation = ++operationRef.current;
      let runId: string | undefined;
      try {
        const workflow = client.getWorkflow(workflowId);
        const run = await workflow.createRun({ resourceId });
        runId = run.runId;
        callbacksRef.current.onRunIdChange?.(runId);
        commit(operation, {
          runId,
          status: "running",
          result: undefined,
          error: undefined,
          suspendedSteps: [],
          raw: undefined,
        });
        const source = await run.startAsync({
          inputData,
          initialState: options.initialState,
          requestContext: options.requestContext ?? requestContext,
        });
        const nextState = toWorkflowState<TResult, TSuspend>(runId, source);
        commit(operation, nextState);
        return nextState;
      } catch (error) {
        throw fail(operation, runId, error);
      }
    },
    [client, workflowId, resourceId, requestContext, commit, fail],
  );

  const resume = useCallback(
    async (
      step: string | string[] | MastraSuspendedStep<TSuspend>,
      resumeData: TResume,
      options: MastraWorkflowResumeOptions = {},
    ) => {
      const runId = state.runId;
      if (!runId) throw new Error("Cannot resume a workflow without a run ID");
      const operation = ++operationRef.current;
      const suspendedStep = typeof step === "object" && !Array.isArray(step);
      const path = suspendedStep ? step.path : step;
      const forEachIndex = suspendedStep
        ? (options.forEachIndex ?? step.forEachIndex)
        : options.forEachIndex;
      try {
        commit(operation, { ...state, status: "running", error: undefined });
        const run = await client
          .getWorkflow(workflowId)
          .createRun({ runId, resourceId });
        const source = await run.resumeAsync({
          step: path,
          resumeData,
          forEachIndex,
          requestContext: options.requestContext ?? requestContext,
        });
        const nextState = toWorkflowState<TResult, TSuspend>(runId, source);
        commit(operation, nextState);
        return nextState;
      } catch (error) {
        throw fail(operation, runId, error);
      }
    },
    [state, client, workflowId, resourceId, requestContext, commit, fail],
  );

  const cancel = useCallback(async () => {
    const runId = state.runId;
    if (!runId) throw new Error("Cannot cancel a workflow without a run ID");
    const operation = ++operationRef.current;
    try {
      const run = await client
        .getWorkflow(workflowId)
        .createRun({ runId, resourceId });
      await run.cancel();
      const nextState: MastraWorkflowState<TResult, TSuspend> = {
        runId,
        status: "canceled",
        result: undefined,
        error: undefined,
        suspendedSteps: [],
        raw: undefined,
      };
      commit(operation, nextState);
      return nextState;
    } catch (error) {
      throw fail(operation, runId, error);
    }
  }, [state.runId, client, workflowId, resourceId, commit, fail]);

  const refresh = useCallback(() => {
    const runId = state.runId ?? controlledRunId;
    if (!runId) throw new Error("Cannot refresh a workflow without a run ID");
    return refreshRun(runId);
  }, [state.runId, controlledRunId, refreshRun]);

  return { state, start, resume, cancel, refresh };
};
