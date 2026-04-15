"use client";

import { WrenchIcon } from "lucide-react";
import { Badge } from "@/components/assistant-ui/badge";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="info"
      size="sm"
      data-slot="directive-text-chip"
      className="items-baseline text-[13px] leading-none [&_svg]:self-center"
    >
      <WrenchIcon />
      {children}
    </Badge>
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
