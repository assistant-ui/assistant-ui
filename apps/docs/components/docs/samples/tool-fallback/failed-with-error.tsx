"use client";

import { useState } from "react";
import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackError,
} from "@/components/assistant-ui/tool-fallback";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ToolFallbackErrorSample() {
  const [open, setOpen] = useState(true);
  const status = {
    type: "incomplete",
    reason: "error",
    error: "Weather service returned 503 Service Unavailable",
  } as const;

  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackRoot open={open} onOpenChange={setOpen}>
        <ToolFallbackTrigger toolName="get_weather" status={status} />
        <ToolFallbackContent>
          <ToolFallbackError status={status} />
          <ToolFallbackArgs
            argsText={JSON.stringify({ location: "San Francisco" }, null, 2)}
          />
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </SampleFrame>
  );
}
