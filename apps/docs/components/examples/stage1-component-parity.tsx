"use client";

import { useCallback, useRef, useState } from "react";

type ComponentLifecycle =
  | "mounting"
  | "active"
  | "complete"
  | "error"
  | "cancelled";

type ComponentSnapshot = {
  instanceId: string;
  name: string;
  lifecycle: ComponentLifecycle;
  seq: number;
  state: Record<string, unknown>;
};

type ComponentPath = readonly ["components", string, ...string[]];

type Stage1Operation =
  | { type: "set"; path: ComponentPath; value: unknown }
  | { type: "append-text"; path: ComponentPath; value: string };

const INITIAL_COMPONENT: ComponentSnapshot = {
  instanceId: "card_1",
  name: "status-card",
  lifecycle: "mounting",
  seq: 1,
  state: {
    summary: "",
  },
};

const STAGE1_REPLAY_BATCHES: readonly (readonly Stage1Operation[])[] = [
  [
    { type: "set", path: ["components", "card_1", "seq"], value: 2 },
    {
      type: "set",
      path: ["components", "card_1", "lifecycle"],
      value: "active",
    },
    {
      type: "append-text",
      path: ["components", "card_1", "state", "summary"],
      value: "Ready.",
    },
  ],
  [
    { type: "set", path: ["components", "card_1", "seq"], value: 1 },
    {
      type: "set",
      path: ["components", "card_1", "lifecycle"],
      value: "complete",
    },
  ],
];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const setAtPath = (
  source: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
  appendText: boolean,
) => {
  if (path.length === 0) {
    return source;
  }

  const next = { ...source };
  let cursor: Record<string, unknown> = next;

  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!;
    const existing = cursor[segment];
    const child = isRecord(existing) ? { ...existing } : {};
    cursor[segment] = child;
    cursor = child;
  }

  const leaf = path[path.length - 1]!;
  if (appendText) {
    const previous = cursor[leaf];
    cursor[leaf] =
      `${typeof previous === "string" ? previous : ""}${String(value)}`;
  } else {
    cursor[leaf] = value;
  }

  return next;
};

const applyStage1Batch = (
  current: ComponentSnapshot,
  operations: readonly Stage1Operation[],
): { next: ComponentSnapshot; log: string } => {
  const scopedOperations = operations.filter(
    (operation) => operation.path[1] === current.instanceId,
  );

  if (scopedOperations.length === 0) {
    return { next: current, log: "ignored patch batch for unknown instance" };
  }

  const seqOp = scopedOperations.find(
    (operation) => operation.type === "set" && operation.path[2] === "seq",
  );

  if (!seqOp || typeof seqOp.value !== "number") {
    return {
      next: current,
      log: `ignored patch batch without numeric seq for ${current.instanceId}`,
    };
  }

  const incomingSeq = seqOp.value;
  if (incomingSeq <= current.seq) {
    return {
      next: current,
      log: `dropped stale seq ${incomingSeq} for ${current.instanceId}`,
    };
  }

  let next: ComponentSnapshot = {
    ...current,
    seq: incomingSeq,
    state: { ...current.state },
  };

  for (const operation of scopedOperations) {
    const key = operation.path[2];
    const nestedPath = operation.path.slice(3);

    if (operation.type === "set" && key === "seq") {
      continue;
    }

    if (key === "lifecycle" && operation.type === "set") {
      if (typeof operation.value === "string") {
        next = { ...next, lifecycle: operation.value as ComponentLifecycle };
      }
      continue;
    }

    if (key !== "state") {
      continue;
    }

    if (operation.type === "set" && nestedPath.length === 0) {
      if (isRecord(operation.value)) {
        next = { ...next, state: { ...operation.value } };
      }
      continue;
    }

    if (nestedPath.length === 0) {
      continue;
    }

    next = {
      ...next,
      state: setAtPath(
        next.state,
        nestedPath,
        operation.value,
        operation.type === "append-text",
      ),
    };
  }

  return {
    next,
    log: `applied seq ${incomingSeq} for ${current.instanceId}`,
  };
};

export const Stage1ComponentParity = () => {
  const [component, setComponent] = useState(INITIAL_COMPONENT);
  const [logs, setLogs] = useState<string[]>([
    "idle: click replay to stream deterministic component-state patches",
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const replayIdRef = useRef(0);
  const componentRef = useRef(INITIAL_COMPONENT);

  const runReplay = useCallback(async () => {
    const replayId = replayIdRef.current + 1;
    replayIdRef.current = replayId;
    setIsRunning(true);

    componentRef.current = INITIAL_COMPONENT;
    setComponent(INITIAL_COMPONENT);
    setLogs([
      `run ${replayId}: mounted ${INITIAL_COMPONENT.instanceId} (seq ${INITIAL_COMPONENT.seq}, lifecycle ${INITIAL_COMPONENT.lifecycle})`,
    ]);

    for (const operations of STAGE1_REPLAY_BATCHES) {
      await sleep(120);

      if (replayIdRef.current !== replayId) {
        return;
      }

      const result = applyStage1Batch(componentRef.current, operations);
      componentRef.current = result.next;
      setComponent(result.next);
      setLogs((previous) => [...previous, `run ${replayId}: ${result.log}`]);
    }

    if (replayIdRef.current === replayId) {
      setIsRunning(false);
      setLogs((previous) => [...previous, `run ${replayId}: replay complete`]);
    }
  }, []);

  const summary =
    typeof component.state.summary === "string" ? component.state.summary : "";

  return (
    <div className="not-prose rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Component state replay fixture</p>
          <p className="text-muted-foreground text-xs">
            Simulates a message card receiving streaming updates, then safely
            ignoring an older out-of-order update.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runReplay()}
          disabled={isRunning}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Run Replay
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Instance</p>
          <p className="font-mono text-sm">{component.instanceId}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Lifecycle</p>
          <p
            data-testid="stage1-card-card_1-lifecycle"
            className="font-mono text-sm"
          >
            {component.lifecycle}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Seq</p>
          <p data-testid="stage1-card-card_1-seq" className="font-mono text-sm">
            {component.seq}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">State.summary</p>
        <p
          data-testid="stage1-card-card_1-summary"
          className="font-mono text-sm"
        >
          {summary || "(empty)"}
        </p>
      </div>

      <div className="mt-3 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Replay log</p>
        <ol
          data-testid="stage1-log"
          className="mt-2 list-decimal space-y-1 pl-4 font-mono text-xs"
        >
          {logs.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};
