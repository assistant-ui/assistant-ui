"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMastraWorkflow } from "@assistant-ui/react-mastra";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  SquareIcon,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { mastraClient } from "../app/MyRuntimeProvider";

type ReleaseInput = { project: string; summary: string };
type ResumeInput = { approved: boolean; note: string };
type SuspendPayload = {
  stage: "review" | "publish";
  title: string;
  description: string;
};
type ReleaseResult = {
  project: string;
  summary: string;
  outcome: "published" | "changes-requested";
};

const RUN_STORAGE_KEY = "assistant-ui.mastra.workflow-run";

const readStoredRunId = () => {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(RUN_STORAGE_KEY) ?? undefined;
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "running")
    return <LoaderCircleIcon className="size-3.5 animate-spin" />;
  if (status === "success") return <CheckCircle2Icon className="size-3.5" />;
  if (status === "failed") return <AlertCircleIcon className="size-3.5" />;
  return <CircleIcon className="size-3.5" />;
};

export function WorkflowPanel() {
  const [initialRunId, setInitialRunId] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [project, setProject] = useState("Desktop release");
  const [summary, setSummary] = useState(
    "Ship the new Mastra thread and workflow integration.",
  );
  const [note, setNote] = useState("");
  useEffect(() => {
    setInitialRunId(readStoredRunId());
    setIsHydrated(true);
  }, []);

  const workflow = useMastraWorkflow<
    ReleaseInput,
    ResumeInput,
    ReleaseResult,
    SuspendPayload
  >({
    client: mastraClient,
    workflowId: "releaseReviewWorkflow",
    runId: initialRunId,
    resourceId: "assistant-ui-mastra-example",
    onRunIdChange: (runId) => {
      window.localStorage.setItem(RUN_STORAGE_KEY, runId);
    },
  });

  const { state } = workflow;
  const suspendedStep = state.suspendedSteps[0];
  const isRestoring =
    !isHydrated || (Boolean(initialRunId) && state.status === "idle");
  const isRunning = state.status === "running";

  const start = async (event: FormEvent) => {
    event.preventDefault();
    setNote("");
    try {
      await workflow.start({ project, summary });
    } catch {
      // The hook exposes the request error in state.
    }
  };

  const resume = async (approved: boolean) => {
    if (!suspendedStep) return;
    try {
      await workflow.resume(suspendedStep, { approved, note });
      setNote("");
    } catch {
      // The hook exposes the request error in state.
    }
  };

  return (
    <aside className="workflow-panel" aria-label="Release review workflow">
      <div className="workflow-panel__header">
        <div>
          <p className="eyebrow">Durable workflow</p>
          <h2>Release review</h2>
        </div>
        <span
          className={cn(
            "status-pill",
            state.status === "success" && "status-pill--success",
            state.status === "failed" && "status-pill--error",
          )}
        >
          <StatusIcon status={isRestoring ? "running" : state.status} />
          {isRestoring ? "restoring" : state.status}
        </span>
      </div>

      <ol className="workflow-steps" aria-label="Workflow checkpoints">
        <li
          data-active={suspendedStep?.payload.stage === "review" || undefined}
        >
          <span>01</span>
          Review brief
        </li>
        <li
          data-active={suspendedStep?.payload.stage === "publish" || undefined}
        >
          <span>02</span>
          Approve publish
        </li>
      </ol>

      {isRestoring && (
        <div className="workflow-state workflow-state--muted">
          <LoaderCircleIcon className="size-5 animate-spin" />
          <p>Restoring the latest persisted run.</p>
        </div>
      )}

      {!isRestoring &&
        (state.status === "idle" || state.status === "success") && (
          <form className="workflow-form" onSubmit={start}>
            {state.status === "success" && (
              <div className="workflow-result" role="status">
                <CheckCircle2Icon className="size-5" />
                <div>
                  <strong>Workflow complete</strong>
                  <p>
                    {state.result?.project} is {state.result?.outcome}.
                  </p>
                </div>
              </div>
            )}
            <label>
              Project
              <input
                value={project}
                onChange={(event) => setProject(event.target.value)}
                required
              />
            </label>
            <label>
              Release summary
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                required
              />
            </label>
            <Button type="submit" className="w-full">
              {state.status === "success" ? (
                <RotateCcwIcon className="size-4" />
              ) : null}
              {state.status === "success"
                ? "Start another run"
                : "Start review"}
            </Button>
          </form>
        )}

      {isRunning && (
        <div className="workflow-state" role="status">
          <LoaderCircleIcon className="size-5 animate-spin" />
          <div>
            <strong>Mastra is running the next step</strong>
            <p>The run can continue even if this panel unmounts.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void workflow.cancel()}
          >
            <SquareIcon className="size-3" />
            Cancel
          </Button>
        </div>
      )}

      {state.status === "suspended" && suspendedStep && (
        <div className="workflow-checkpoint">
          <p className="eyebrow">Awaiting input</p>
          <h3>{suspendedStep.payload.title}</h3>
          <p>{suspendedStep.payload.description}</p>
          <label>
            Decision note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add context for the next step"
              rows={3}
            />
          </label>
          <div className="workflow-actions">
            <Button onClick={() => void resume(true)}>Approve</Button>
            <Button variant="outline" onClick={() => void resume(false)}>
              Request changes
            </Button>
          </div>
        </div>
      )}

      {state.status === "failed" && (
        <div className="workflow-state workflow-state--error" role="alert">
          <AlertCircleIcon className="size-5" />
          <div>
            <strong>Workflow request failed</strong>
            <p>{state.error?.message}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void workflow.refresh()}
          >
            Retry
          </Button>
        </div>
      )}

      {state.status === "canceled" && (
        <div className="workflow-state workflow-state--muted">
          <SquareIcon className="size-5" />
          <p>The workflow run was cancelled.</p>
        </div>
      )}

      <div className="workflow-panel__footer">
        <span>Run</span>
        <code>{state.runId?.slice(0, 12) ?? "not started"}</code>
      </div>
    </aside>
  );
}
