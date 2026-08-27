"use client";

import { Source } from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

const variants = [
  ["Outline (default)", "outline"],
  ["Ghost", "ghost"],
  ["Muted", "muted"],
  ["Secondary", "secondary"],
  ["Info", "info"],
  ["Warning", "warning"],
  ["Success", "success"],
  ["Destructive", "destructive"],
] as const;

export function SourcesVariantsSample() {
  return (
    <SampleFrame className="grid h-auto gap-4 p-6 sm:grid-cols-2">
      {variants.map(([label, variant]) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {label}
          </span>
          <Source variant={variant} href="https://assistant-ui.com">
            assistant-ui.com
          </Source>
        </div>
      ))}
    </SampleFrame>
  );
}
