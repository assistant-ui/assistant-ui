"use client";

import { useCallback, useRef, useState } from "react";

type InvokePayload = {
  messageId: string;
  instanceId: string;
  action: string;
  payload: unknown;
  ack: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type EmitPayload = {
  messageId: string;
  instanceId: string;
  event: string;
  payload: unknown;
};

type Stage2Summary = {
  invokeOk: string;
  invokeError: string;
  lastEmit: string;
};

const MESSAGE_ID = "m1";
const INSTANCE_ID = "card_1";

const INITIAL_SUMMARY: Stage2Summary = {
  invokeOk: "(pending)",
  invokeError: "(pending)",
  lastEmit: "(pending)",
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const formatError = (value: unknown) => {
  if (value instanceof Error) return value.message;
  return String(value);
};

export const Stage2ComponentParity = () => {
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [logs, setLogs] = useState<string[]>([
    "idle: click replay to run invoke/emit contracts",
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const replayIdRef = useRef(0);

  const onComponentInvoke = useCallback((command: InvokePayload) => {
    setLogs((previous) => [
      ...previous,
      `invoke ${command.action} for ${command.instanceId}`,
    ]);

    if (command.action === "refresh") {
      command.ack({
        ok: true,
        acknowledged: `${command.messageId}:${command.instanceId}`,
      });
      return;
    }

    command.reject(new Error(`backend rejected action "${command.action}"`));
  }, []);

  const onComponentEmit = useCallback((command: EmitPayload) => {
    setLogs((previous) => [
      ...previous,
      `emit ${command.event} for ${command.instanceId}`,
    ]);
    setSummary((previous) => ({
      ...previous,
      lastEmit: `${command.event}:${JSON.stringify(command.payload)}`,
    }));
  }, []);

  const invoke = useCallback(
    (action: string, payload: unknown) =>
      new Promise<unknown>((ack, reject) => {
        onComponentInvoke({
          messageId: MESSAGE_ID,
          instanceId: INSTANCE_ID,
          action,
          payload,
          ack,
          reject,
        });
      }),
    [onComponentInvoke],
  );

  const emit = useCallback(
    (event: string, payload: unknown) => {
      onComponentEmit({
        messageId: MESSAGE_ID,
        instanceId: INSTANCE_ID,
        event,
        payload,
      });
    },
    [onComponentEmit],
  );

  const runReplay = useCallback(async () => {
    const replayId = replayIdRef.current + 1;
    replayIdRef.current = replayId;
    setIsRunning(true);
    setSummary(INITIAL_SUMMARY);
    setLogs([`run ${replayId}: start ${MESSAGE_ID}/${INSTANCE_ID}`]);

    await sleep(120);
    if (replayIdRef.current !== replayId) return;

    const invokeOk = await invoke("refresh", { source: "docs" });
    setSummary((previous) => ({
      ...previous,
      invokeOk: JSON.stringify(invokeOk),
    }));
    setLogs((previous) => [...previous, `run ${replayId}: invoke refresh ack`]);

    await sleep(120);
    if (replayIdRef.current !== replayId) return;

    try {
      await invoke("fail", { source: "docs" });
    } catch (error) {
      setSummary((previous) => ({
        ...previous,
        invokeError: formatError(error),
      }));
      setLogs((previous) => [
        ...previous,
        `run ${replayId}: invoke fail rejected`,
      ]);
    }

    await sleep(120);
    if (replayIdRef.current !== replayId) return;

    emit("selected", { tab: "metrics" });
    setLogs((previous) => [...previous, `run ${replayId}: emit selected sent`]);

    if (replayIdRef.current === replayId) {
      setIsRunning(false);
      setLogs((previous) => [...previous, `run ${replayId}: replay complete`]);
    }
  }, [emit, invoke]);

  return (
    <div className="not-prose rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Stage 2 invoke/emit replay</p>
          <p className="text-muted-foreground text-xs">
            Replays deterministic invoke ack/reject handling and fire-and-forget
            emit routing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runReplay()}
          disabled={isRunning}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          Run Stage 2 Replay
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">invoke success</p>
          <p
            data-testid="stage2-card-card_1-invoke-ok"
            className="font-mono text-xs"
          >
            {summary.invokeOk}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">invoke rejection</p>
          <p
            data-testid="stage2-card-card_1-invoke-error"
            className="font-mono text-xs"
          >
            {summary.invokeError}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">last emit</p>
          <p
            data-testid="stage2-card-card_1-last-emit"
            className="font-mono text-xs"
          >
            {summary.lastEmit}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Replay log</p>
        <ol
          data-testid="stage2-log"
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
