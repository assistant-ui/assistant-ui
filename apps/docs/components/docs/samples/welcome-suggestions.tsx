"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChartColumnIcon,
  CloudSunIcon,
  PencilLineIcon,
} from "lucide-react";
import {
  ThreadWelcomeSuggestions,
  type SuggestionEntry,
} from "@/components/assistant-ui/welcome-suggestions";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

const SUGGESTIONS: SuggestionEntry[] = [
  {
    label: "Weather",
    icon: <CloudSunIcon />,
    suggestions: [
      {
        label: "in San Francisco",
        prompt: "What's the weather in San Francisco?",
      },
      { label: "in Singapore", prompt: "What's the weather in Singapore?" },
      { label: "in Tokyo", prompt: "What's the weather in Tokyo?" },
    ],
  },
  {
    label: "Write",
    icon: <PencilLineIcon />,
    suggestions: [
      {
        label: "A product announcement",
        prompt: "Draft a short product announcement for a new dark mode",
      },
      {
        label: "Release notes",
        prompt:
          "Write release notes for a bugfix release of a React component library",
      },
    ],
  },
  {
    label: "Analyze",
    icon: <ChartColumnIcon />,
    suggestions: [
      {
        label: "React vs Vue vs Svelte",
        prompt: "Compare React, Vue, and Svelte in a table",
      },
      {
        label: "Pros and cons of SSR",
        prompt: "What are the pros and cons of server-side rendering?",
      },
    ],
  },
];

export const WelcomeSuggestionsSample = () => {
  return (
    <SampleFrame className="bg-muted/40 flex h-auto min-h-72 items-center justify-center p-6">
      <SampleRuntimeProvider messages={[]}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <ComposerPrimitive.Root
            data-slot="composer"
            className="border-border bg-background dark:border-muted-foreground/15 relative flex w-full flex-col rounded-3xl border shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)]"
          >
            <ComposerPrimitive.Input
              placeholder="Ask anything..."
              className="field-sizing-content min-h-10 w-full resize-none bg-transparent px-5 pt-4 pb-3 text-sm leading-relaxed focus:outline-none"
              rows={1}
            />
            <div className="flex items-center justify-end px-3 pb-3">
              <ComposerPrimitive.Send className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30">
                <ArrowUpIcon className="size-4" />
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
          <div className="min-h-40">
            <ThreadWelcomeSuggestions suggestions={SUGGESTIONS} />
          </div>
        </div>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
};
