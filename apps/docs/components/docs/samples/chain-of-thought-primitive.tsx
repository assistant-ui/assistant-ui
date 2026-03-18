"use client";

import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  BrainIcon,
  WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import { SampleFrame } from "./sample-frame";

function ReasoningStep({ text }: { text: string }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
        <BrainIcon className="size-3 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm italic leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function ToolCallStep({
  toolName,
  argsText,
  result,
}: {
  toolName: string;
  argsText: string;
  result: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-3 py-2">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2Icon className="size-3 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="group flex w-full items-center gap-1.5 text-left text-sm"
        >
          <WrenchIcon className="size-3 text-muted-foreground" />
          <span className="font-medium">{toolName}</span>
          <ChevronRightIcon
            className={`ml-auto size-3.5 text-muted-foreground transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
        </button>
        {open && (
          <div className="mt-2 overflow-hidden rounded-md border bg-muted/40">
            <div className="px-3 py-2">
              <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Args
              </p>
              <pre className="font-mono text-xs leading-relaxed">
                {argsText}
              </pre>
            </div>
            <div className="border-t px-3 py-2">
              <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Result
              </p>
              <pre className="font-mono text-xs leading-relaxed">{result}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChainOfThoughtPrimitiveSample() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SampleFrame className="flex h-auto items-center justify-center bg-background p-8">
      <div className="mx-auto w-full max-w-lg space-y-3">
        <div className="flex justify-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
            AI
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors hover:bg-muted/50"
              >
                {collapsed ? (
                  <ChevronRightIcon className="size-4 shrink-0" />
                ) : (
                  <ChevronDownIcon className="size-4 shrink-0" />
                )}
                Thinking
              </button>
              {!collapsed && (
                <div className="border-t px-4 pb-3">
                  <div className="space-y-1">
                    <ReasoningStep text="The user wants to know about the weather in Tokyo. I should call the weather tool to get current conditions." />
                    <ToolCallStep
                      toolName="get_weather"
                      argsText={'{ "city": "Tokyo" }'}
                      result={
                        '{ "temp": "22°C", "condition": "Partly cloudy" }'
                      }
                    />
                    <ReasoningStep text="Got the weather data. Let me also check for travel advisories." />
                    <ToolCallStep
                      toolName="search_web"
                      argsText={'{ "query": "Tokyo travel advisory" }'}
                      result={'{ "status": "No advisories" }'}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
              It&apos;s currently 22°C and partly cloudy in Tokyo. Great weather
              for sightseeing — no travel advisories are in effect.
            </div>
          </div>
        </div>
      </div>
    </SampleFrame>
  );
}
