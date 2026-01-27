"use client";

import { useEffect, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { PlayIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
  reasoningVariants,
} from "@/components/assistant-ui/reasoning";

function ReasoningDemo({ variant }: VariantProps<typeof reasoningVariants>) {
  return (
    <ReasoningRoot variant={variant} className="mb-0">
      <ReasoningTrigger />
      <ReasoningContent>
        <ReasoningText>
          <p>Let me think about this step by step...</p>
          <p>
            First, I need to consider the main factors involved in this problem.
          </p>
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
}

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ReasoningDemo variant={variant} />
    </div>
  );
}

export function ReasoningSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <VariantRow label="Outline (default)" variant="outline" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}

function ReasoningGroupDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const fullText =
    "Let me think about this step by step...\n\nFirst, I need to analyze the problem carefully. The key factors to consider are the constraints and requirements.\n\nAfter evaluating all options, the best approach would be to implement a solution that balances performance and maintainability.";

  useEffect(() => {
    if (!isStreaming) return;

    setIsOpen(true);
    setStreamedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setStreamedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStart = () => {
    setStreamedText("");
    setIsStreaming(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Streaming..." : "Start Reasoning"}
        </Button>
      </div>
      <ReasoningRoot
        variant="muted"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mb-0"
      >
        <ReasoningTrigger active={isStreaming} />
        <ReasoningContent>
          <ReasoningText className="whitespace-pre-wrap">
            {streamedText || (
              <span className="text-muted-foreground/50 italic">
                Click &quot;Start Reasoning&quot; to see the streaming effect
              </span>
            )}
          </ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    </div>
  );
}

export function ReasoningGroupSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ReasoningGroupDemo />
    </SampleFrame>
  );
}
