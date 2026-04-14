"use client";

import { WrenchIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-slot="directive-text-chip"
      className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 font-medium text-[13px] text-primary leading-none"
    >
      <WrenchIcon className="size-3 shrink-0" />
      {children}
    </span>
  );
}

export function DirectiveTextSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <span className="text-muted-foreground text-xs">User message</span>
        <div className="rounded-2xl bg-muted px-4 py-2.5 text-foreground text-sm">
          Use <Chip>Get Weather</Chip> to check today's forecast in Tokyo.
        </div>
      </div>
      <div className="flex w-full max-w-md flex-col items-end gap-2">
        <span className="text-muted-foreground text-xs">Another example</span>
        <div className="rounded-2xl bg-muted px-4 py-2.5 text-foreground text-sm">
          Ask <Chip>Search</Chip> for recent updates on <Chip>Calendar</Chip>.
        </div>
      </div>
    </SampleFrame>
  );
}
