"use client";

import { useEffect, useReducer } from "react";
import type { VariantProps } from "class-variance-authority";
import { PlayIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/reasoning";
import type { reasoningVariants } from "@/components/assistant-ui/reasoning-variants";

function ReasoningDemo({ variant }: VariantProps<typeof reasoningVariants>) {
  return (
    <ReasoningRoot variant={variant} className="mb-0">
      <ReasoningTrigger />
      <ReasoningContent>
        <ReasoningText>
          <p>Let me think about this step by step…</p>
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
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
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

const STREAMING_REASONING_TEXT =
  "Let me think about this step by step…\n\nFirst, I need to analyze the problem carefully. The key factors to consider are the constraints and requirements.\n\nAfter evaluating all options, the best approach would be to implement a solution that balances performance and maintainability.";

type ReasoningGroupState = {
  isStreaming: boolean;
  isOpen: boolean;
  streamedText: string;
  index: number;
};

type ReasoningGroupAction =
  | { type: "start" }
  | { type: "toggleOpen"; value: boolean }
  | { type: "tick" };

const initialReasoningGroupState: ReasoningGroupState = {
  isStreaming: false,
  isOpen: false,
  streamedText: "",
  index: 0,
};

function reasoningGroupReducer(
  state: ReasoningGroupState,
  action: ReasoningGroupAction,
): ReasoningGroupState {
  switch (action.type) {
    case "start":
      return {
        isStreaming: true,
        isOpen: true,
        streamedText: "",
        index: 0,
      };
    case "toggleOpen":
      return { ...state, isOpen: action.value };
    case "tick": {
      const nextIndex = state.index + 1;
      if (nextIndex > STREAMING_REASONING_TEXT.length) {
        return { ...state, isStreaming: false };
      }
      return {
        ...state,
        index: nextIndex,
        streamedText: STREAMING_REASONING_TEXT.slice(0, nextIndex),
      };
    }
  }
}

function ReasoningGroupDemo() {
  const [{ isStreaming, isOpen, streamedText }, dispatch] = useReducer(
    reasoningGroupReducer,
    initialReasoningGroupState,
  );

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      dispatch({ type: "tick" });
    }, 20);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStart = () => {
    dispatch({ type: "start" });
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
          {isStreaming ? "Streaming…" : "Start Reasoning"}
        </Button>
      </div>
      <ReasoningRoot
        variant="muted"
        open={isOpen}
        onOpenChange={(value) => dispatch({ type: "toggleOpen", value })}
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
