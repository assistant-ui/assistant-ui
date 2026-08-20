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
  const [approved, setApproved] = useState<boolean>();

  return (
    <ToolFallbackRoot open={open} onOpenChange={setOpen}>
      <ToolFallbackTrigger
        toolName="delete_file"
        status={
          approved === undefined
            ? { type: "requires-action", reason: "interrupt" }
            : approved
              ? { type: "complete" }
              : { type: "incomplete", reason: "cancelled" }
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
        {approved === undefined ? (
          <ToolFallbackApproval
            interrupt={{ type: "human", payload: {} }}
            resume={(payload) => {
              const { approved: isApproved } = payload as {
                approved: boolean;
              };
              setApproved(isApproved);
            }}
          />
        ) : (
          <ToolFallbackResult
            result={
              approved ? "Approved by user" : "User denied tool execution"
            }
          />
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
