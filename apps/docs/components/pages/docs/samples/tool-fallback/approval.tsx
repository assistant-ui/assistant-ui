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

import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ToolWithApproval() {
  const [approved, setApproved] = useState<boolean>();

  return (
    <ToolFallbackRoot defaultOpen>
      <ToolFallbackTrigger
        toolName="delete_file"
        status={
          approved === undefined
            ? { type: "requires-action", reason: "interrupt" }
            : { type: "complete" }
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
