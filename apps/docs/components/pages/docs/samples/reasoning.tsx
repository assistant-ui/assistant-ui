"use client";

import type { VariantProps } from "class-variance-authority";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
  type reasoningVariants,
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

function ReasoningStreamingThread() {
  const runtime = useLocalRuntime({
    // The first run yields partial reasoning and stays running until the
    // user stops it. Follow-up prompts finish with a short reply.
    async *run({ messages, abortSignal }) {
      if (messages.length > 1) {
        yield {
          content: [
            {
              type: "reasoning",
              text: "A short reply is enough here; the streamed run above already shows the live reasoning state.",
            },
            {
              type: "text",
              text: "This is a demo. The streamed run above shows how reasoning parts render while a response is active.",
            },
          ],
        };
        return;
      }
      yield {
        content: [
          {
            type: "reasoning",
            text: "Weighing the trade-offs between the available approaches...",
          },
        ],
      };
      yield {
        content: [
          {
            type: "reasoning",
            text: "Weighing the trade-offs between the available approaches...\n\nA smaller change surface is easier to review and revert, so I will rank the options by how little they touch.",
          },
        ],
      };
      await new Promise<void>((resolve) => {
        abortSignal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
  });

  // Defer the append one tick so the strict-mode mount/unmount cycle cannot
  // abort the run before the first yield. The cleanup cancels the timer if
  // the sample unmounts first.
  const startRun = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const timeout = setTimeout(() => {
        if (runtime.thread.getState().messages.length > 0) return;
        runtime.thread.append("Compare the available approaches.");
      }, 0);
      return () => clearTimeout(timeout);
    },
    [runtime],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div ref={startRun} className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

export function ReasoningStreamingSample() {
  return (
    <SampleFrame className="bg-muted/40 h-120 overflow-hidden">
      <ReasoningStreamingThread />
    </SampleFrame>
  );
}
