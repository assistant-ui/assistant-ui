"use client";

import { useEffect, useState } from "react";
import {
  DotMatrix,
  dotMatrixStates,
  type DotMatrixState,
} from "@/components/assistant-ui/dot-matrix";
import { Button } from "@/components/ui/button";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function DotMatrixSample() {
  return (
    <SampleFrame className="grid h-auto grid-cols-3 gap-x-4 gap-y-8 p-10 sm:grid-cols-5">
      {dotMatrixStates.map((state) => (
        <div key={state} className="flex flex-col items-center gap-3">
          <DotMatrix state={state} className="size-8" />
          <span className="text-muted-foreground font-mono text-xs">
            {state}
          </span>
        </div>
      ))}
    </SampleFrame>
  );
}

export function DotMatrixLifecycleSample() {
  const lifecycle = [
    "idle",
    "connecting",
    "loading",
    "thinking",
    "streaming",
    "success",
  ] as const satisfies readonly DotMatrixState[];
  const [step, setStep] = useState(0);
  const state = lifecycle[step % lifecycle.length]!;

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-10">
      <div className="flex items-center gap-3">
        <DotMatrix state={state} className="size-10" />
        <span className="text-muted-foreground font-mono text-sm">{state}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setStep((s) => s + 1)}>
          Next state
        </Button>
        <Button
          variant="outline"
          onClick={() => setStep(0)}
          disabled={state === "idle"}
        >
          Reset
        </Button>
      </div>
    </SampleFrame>
  );
}

export function DotMatrixInlineSample() {
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setRunning((r) => !r), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-10">
      <div className="flex items-center gap-2 text-sm">
        <DotMatrix state={running ? "loading" : "success"} />
        {running ? "Generating response…" : "Done"}
      </div>
      <div className="bg-foreground text-background flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
        <DotMatrix state={running ? "thinking" : "success"} />
        {running ? "Thinking…" : "Done"}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <DotMatrix state={running ? "recording" : "stopped"} />
        {running ? "Recording…" : "Stopped"}
      </div>
    </SampleFrame>
  );
}

export function DotMatrixSizesSample() {
  return (
    <SampleFrame className="flex h-auto items-end justify-center gap-8 p-10">
      {(["size-4", "size-6", "size-10", "size-16"] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-3">
          <DotMatrix state="loading" className={size} />
          <span className="text-muted-foreground font-mono text-xs">
            {size}
          </span>
        </div>
      ))}
    </SampleFrame>
  );
}
