"use client";

import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackApproval,
} from "@/components/assistant-ui/tool-fallback";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function ToolFallbackSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackRoot>
        <ToolFallbackTrigger
          toolName="get_weather"
          status={{ type: "complete" }}
        />
        <ToolFallbackContent>
          <ToolFallbackArgs
            argsText={JSON.stringify({ location: "San Francisco" }, null, 2)}
          />
          <ToolFallbackResult
            result={{ temperature: 72, condition: "Sunny", humidity: 45 }}
          />
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </SampleFrame>
  );
}

export function ToolFallbackRunningSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackRoot>
        <ToolFallbackTrigger
          toolName="search_web"
          status={{ type: "running" }}
        />
        <ToolFallbackContent>
          <ToolFallbackArgs
            argsText={JSON.stringify({ query: "latest news" }, null, 2)}
          />
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </SampleFrame>
  );
}

export function ToolFallbackCancelledSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackRoot className="border-muted-foreground/30 bg-muted/30">
        <ToolFallbackTrigger
          toolName="long_running_task"
          status={{ type: "incomplete", reason: "cancelled" }}
        />
        <ToolFallbackContent>
          <ToolFallbackArgs
            argsText={JSON.stringify({ task: "process_data" }, null, 2)}
            className="opacity-60"
          />
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </SampleFrame>
  );
}

export function ToolFallbackRequiresActionSample() {
  return (
    <SampleFrame className="flex h-auto items-center p-6">
      <ToolFallbackRoot defaultOpen>
        <ToolFallbackTrigger
          toolName="delete_file"
          status={{ type: "requires-action", reason: "interrupt" }}
        />
        <ToolFallbackContent>
          <ToolFallbackArgs
            argsText={JSON.stringify(
              { path: "/tmp/work-in-progress.txt" },
              null,
              2,
            )}
          />
          <ToolFallbackApproval
            addResult={() => {}}
            resume={() => {}}
            interrupt={{ type: "human", payload: {} }}
          />
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </SampleFrame>
  );
}
