"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChartColumnIcon,
  CloudSunIcon,
  CodeIcon,
  PencilLineIcon,
} from "lucide-react";
import { useEffect } from "react";
import {
  useWelcomeSuggestions,
  WelcomeSuggestionsPicker,
  WelcomeSuggestionsPills,
  WelcomeSuggestionsRoot,
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
      { label: "this weekend", prompt: "Will it rain this weekend?" },
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
      {
        label: "A pull request description",
        prompt:
          "Write a pull request description for a change that adds keyboard navigation to a menu",
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
      {
        label: "Monorepo tradeoffs",
        prompt: "When is a monorepo the wrong choice?",
      },
    ],
  },
  {
    label: "Code",
    icon: <CodeIcon />,
    suggestions: [
      {
        label: "A debounce hook",
        prompt: "Write a useDebounce React hook in TypeScript",
      },
      {
        label: "Type a fetch wrapper",
        prompt: "Write a typed fetch wrapper with error handling",
      },
      {
        label: "Explain a regex",
        prompt: "Explain what this regex does: ^(?=.*\\d)(?=.*[a-z]).{8,}$",
      },
    ],
  },
];

const PreviewFirstItem = () => {
  const { moveHighlight } = useWelcomeSuggestions();
  // Deferred: child effects run before the state hook's typing-detection
  // effect, which would read the still-empty composer against the ref
  // moveHighlight sets as a user edit and close the picker.
  useEffect(() => {
    const timer = setTimeout(() => moveHighlight(1), 0);
    return () => clearTimeout(timer);
  }, [moveHighlight]);
  return null;
};

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
          <div className="min-h-56">
            <WelcomeSuggestionsRoot suggestions={SUGGESTIONS} defaultOpen="Weather">
              <WelcomeSuggestionsPills />
              <WelcomeSuggestionsPicker />
              <PreviewFirstItem />
            </WelcomeSuggestionsRoot>
          </div>
        </div>
      </SampleRuntimeProvider>
    </SampleFrame>
  );
};
