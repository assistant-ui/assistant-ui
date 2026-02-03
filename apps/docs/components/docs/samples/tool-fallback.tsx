"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "lucide-react";
import type { ToolCallMessagePartStatus } from "@assistant-ui/react";
import {
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
} from "@/components/assistant-ui/tool-fallback";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";

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

function ToolFallbackStreamingDemo() {
  const [status, setStatus] = useState<ToolCallMessagePartStatus>({
    type: "complete",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [streamedArgs, setStreamedArgs] = useState("");
  const [result, setResult] = useState<object | undefined>(undefined);

  const fullArgs = JSON.stringify({ location: "San Francisco" }, null, 2);
  const fullResult = { temperature: 72, condition: "Sunny", humidity: 45 };

  const isRunning = status.type === "running";

  useEffect(() => {
    if (!isRunning) return;

    setIsOpen(true);
    setStreamedArgs("");
    setResult(undefined);

    let index = 0;
    const argsInterval = setInterval(() => {
      if (index < fullArgs.length) {
        setStreamedArgs(fullArgs.slice(0, index + 1));
        index++;
      } else {
        clearInterval(argsInterval);
        // Simulate tool execution delay
        setTimeout(() => {
          setResult(fullResult);
          setStatus({ type: "complete" });
        }, 500);
      }
    }, 30);

    return () => clearInterval(argsInterval);
  }, [isRunning, fullArgs]);

  const handleStart = () => {
    setStreamedArgs("");
    setResult(undefined);
    setStatus({ type: "running" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isRunning}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isRunning ? "Running..." : "Start Tool Call"}
        </Button>
      </div>
      <ToolFallbackRoot open={isOpen} onOpenChange={setIsOpen}>
        <ToolFallbackTrigger toolName="get_weather" status={status} />
        <ToolFallbackContent>
          {streamedArgs ? (
            <ToolFallbackArgs argsText={streamedArgs} />
          ) : (
            <div className="px-4 text-muted-foreground/50 italic">
              Click &quot;Start Tool Call&quot; to see the streaming effect
            </div>
          )}
          {result && <ToolFallbackResult result={result} />}
        </ToolFallbackContent>
      </ToolFallbackRoot>
    </div>
  );
}

export function ToolFallbackStreamingSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ToolFallbackStreamingDemo />
    </SampleFrame>
  );
}
