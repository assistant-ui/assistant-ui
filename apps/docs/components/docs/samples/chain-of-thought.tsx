"use client";

import { useState } from "react";
import { ChainOfThought } from "@/components/assistant-ui/chain-of-thought";

type Variant = "ghost" | "muted";
type Phase = "running" | "complete" | "incomplete";

function ExampleTimeline({ phase = "complete" }: { phase?: Phase }) {
  const isRunning = phase === "running";
  const isIncomplete = phase === "incomplete";

  return (
    <ChainOfThought.Timeline
      autoScroll={isRunning}
      autoScrollBehavior="smooth"
      constrainHeight
    >
      <ChainOfThought.Step status="complete" type="text" active={false}>
        <ChainOfThought.StepHeader>Read the question</ChainOfThought.StepHeader>
        <ChainOfThought.StepBody>
          Identified the docs and component API that need to agree.
        </ChainOfThought.StepBody>
      </ChainOfThought.Step>
      <ChainOfThought.Step
        status={isRunning ? "active" : "complete"}
        type="search"
        active={isRunning}
      >
        <ChainOfThought.StepHeader>
          Checked source files
        </ChainOfThought.StepHeader>
        <ChainOfThought.StepBody>
          Compared the runtime component with the grouped message-part path.
        </ChainOfThought.StepBody>
      </ChainOfThought.Step>
      <ChainOfThought.Step
        status={isIncomplete ? "error" : isRunning ? "active" : "complete"}
        type={isIncomplete ? "error" : "complete"}
        active={isRunning}
      >
        <ChainOfThought.StepHeader>
          {isIncomplete ? "Stopped" : isRunning ? "Writing answer" : "Done"}
        </ChainOfThought.StepHeader>
      </ChainOfThought.Step>
    </ChainOfThought.Timeline>
  );
}

function StaticChainOfThought({
  phase = "complete",
  variant = "ghost",
  activityLabel,
}: {
  phase?: Phase;
  variant?: Variant;
  activityLabel?: string;
}) {
  const open = phase === "running";

  return (
    <ChainOfThought.Root variant={variant} defaultOpen={open}>
      <ChainOfThought.Trigger
        phase={phase}
        activityLabel={
          activityLabel ??
          (phase === "running"
            ? "Checking source files"
            : phase === "incomplete"
              ? "Stopped"
              : "Done")
        }
        elapsedSeconds={phase === "running" ? 3 : 12}
      />
      <ChainOfThought.Content aria-busy={phase === "running"}>
        <ExampleTimeline phase={phase} />
      </ChainOfThought.Content>
    </ChainOfThought.Root>
  );
}

export function ChainOfThoughtSample() {
  return (
    <div className="bg-background w-full rounded-lg border p-4">
      <StaticChainOfThought phase="running" variant="muted" />
    </div>
  );
}

export function ChainOfThoughtVariantsSample() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-background rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Ghost</p>
        <StaticChainOfThought variant="ghost" activityLabel="Searched docs" />
      </div>
      <div className="bg-background rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Muted</p>
        <StaticChainOfThought variant="muted" activityLabel="Searched docs" />
      </div>
    </div>
  );
}

export function ChainOfThoughtLocalizationSample() {
  return (
    <div className="bg-background w-full rounded-lg border p-4">
      <ChainOfThought.Root variant="muted" defaultOpen>
        <ChainOfThought.Trigger
          phase="complete"
          reasoningLabel="Razonamiento"
          activityLabel="Consulto los documentos"
          elapsedSeconds={12}
        />
        <ChainOfThought.Content>
          <ExampleTimeline />
        </ChainOfThought.Content>
      </ChainOfThought.Root>
    </div>
  );
}

export function ChainOfThoughtTerminalStatesSample() {
  const [phase, setPhase] = useState<Phase>("complete");

  return (
    <div className="bg-background space-y-3 rounded-lg border p-4">
      <div className="inline-flex rounded-md border p-1">
        {(["running", "complete", "incomplete"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPhase(value)}
            data-active={phase === value}
            className="data-[active=true]:bg-muted rounded px-2 py-1 text-sm capitalize"
          >
            {value}
          </button>
        ))}
      </div>
      <StaticChainOfThought key={phase} phase={phase} variant="muted" />
    </div>
  );
}
