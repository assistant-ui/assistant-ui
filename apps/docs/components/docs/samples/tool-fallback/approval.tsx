"use client";

import { useState } from "react";
import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackApproval,
} from "@/components/assistant-ui/tool-fallback";

import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ToolWithApproval() {
  const [open, setOpen] = useState(true);
  const [decision, setDecision] = useState<string>();

  return (
    <ToolFallbackRoot open={open} onOpenChange={setOpen}>
      <ToolFallbackTrigger
        toolName="delete_file"
        status={
          decision
            ? { type: "complete" }
            : { type: "requires-action", reason: "interrupt" }
        }
      />
      <ToolFallbackContent>
        <ToolFallbackArgs
          argsText={JSON.stringify(
            { path: "/tmp/work-in-progress.txt" },
            null,
            2,
          )}
        />
        {decision === undefined ? (
          <ToolFallbackApproval
            interrupt={{ type: "human", payload: {} }}
            resume={(payload) => {
              const { approved } = payload as { approved: boolean };
              setDecision(
                approved ? "Approved by user" : "User denied tool execution",
              );
            }}
          />
        ) : (
          <ToolFallbackResult result={decision} />
        )}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
}

export function ToolFallbackApprovalSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolWithApproval />
    </SampleFrame>
  );
}
