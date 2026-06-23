"use client";

import { useState, type ReactNode } from "react";
import {
  BookOpenIcon,
  CloudIcon,
  LayoutTemplateIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import {
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";
import { cn } from "@/lib/utils";

type SuggestionGroupLabel = "New app" | "Templates" | "Learn" | "Cloud";

type SuggestionGroup = {
  label: SuggestionGroupLabel;
  icon: ReactNode;
  options: { label: string; prompt: string }[];
};

const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    label: "New app",
    icon: <SparklesIcon />,
    options: [
      {
        label: "ChatGPT style",
        prompt:
          "Build me a ChatGPT-style chat app with assistant-ui — empty state, composer, and message layout.",
      },
      {
        label: "docs assistant",
        prompt:
          "Build a SaaS product docs site with a sidebar assistant for onboarding guides and release notes.",
      },
      {
        label: "website copilot",
        prompt:
          "Build a marketing website with an on-page copilot that explains each page and suggests next steps.",
      },
    ],
  },
  {
    label: "Templates",
    icon: <LayoutTemplateIcon />,
    options: [
      {
        label: "ChatGPT",
        prompt:
          "Open the ChatGPT Style Assistant demo and show me the live preview with download.",
      },
      {
        label: "Claude",
        prompt:
          "Open the Claude Style Assistant demo and show me the live preview with download.",
      },
      {
        label: "Grok",
        prompt:
          "Open the Grok Style Assistant demo and show me the live preview with download.",
      },
    ],
  },
  {
    label: "Learn",
    icon: <BookOpenIcon />,
    options: [
      {
        label: "Thread component",
        prompt: "How do I set up the assistant-ui Thread component?",
      },
      {
        label: "AI SDK runtime",
        prompt: "How do I connect assistant-ui to the Vercel AI SDK?",
      },
      {
        label: "tool UI",
        prompt: "How do I render custom tool UIs in assistant-ui?",
      },
    ],
  },
  {
    label: "Cloud",
    icon: <CloudIcon />,
    options: [
      {
        label: "thread persistence",
        prompt:
          "How do I add thread persistence and chat history with Assistant Cloud?",
      },
      {
        label: "AI SDK + UI",
        prompt:
          "How do I set up Assistant Cloud with useChatRuntime, Thread, and ThreadList?",
      },
      {
        label: "authorization",
        prompt:
          "How do I set up user authorization and workspaces for Assistant Cloud?",
      },
    ],
  },
];

const suggestionChipClass =
  "aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

type Props = {
  onSelectPrompt: (
    prompt: string,
    suggestion: { group: SuggestionGroupLabel; label: string },
  ) => void;
  disabled?: boolean;
};

export function LandingSuggestions({ onSelectPrompt, disabled }: Props) {
  const analyticsCtx = useXuluxAnalytics();
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const expandedGroup = SUGGESTION_GROUPS.find(
    (group) => group.label === expandedLabel,
  );

  return (
    <div className="aui-thread-welcome-suggestions mt-4 flex w-full flex-col gap-2">
      <div className="w-full scrollbar-none overflow-x-auto">
        <div className="mx-auto flex w-max max-w-full items-center gap-2 px-1">
          {SUGGESTION_GROUPS.map((group) => (
            <Button
              key={group.label}
              type="button"
              variant="ghost"
              disabled={disabled}
              className={cn(
                suggestionChipClass,
                group.label === expandedLabel && "bg-muted",
              )}
              onClick={() =>
                setExpandedLabel(
                  group.label === expandedLabel ? null : group.label,
                )
              }
            >
              {group.icon}
              {group.label}
            </Button>
          ))}
        </div>
      </div>
      {expandedGroup && (
        <div
          key={expandedGroup.label}
          className="fade-in slide-in-from-top-1 animate-in w-full scrollbar-none overflow-x-auto duration-200"
        >
          <div className="mx-auto flex w-max max-w-full items-center gap-2 px-1">
            {expandedGroup.options.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="ghost"
                disabled={disabled}
                className={suggestionChipClass}
                onClick={() => {
                  analytics.xulux.suggestionSelected(
                    withXuluxContext(analyticsCtx, {
                      group: expandedGroup.label,
                      label: option.label,
                      message_length: option.prompt.length,
                    }),
                  );
                  onSelectPrompt(option.prompt, {
                    group: expandedGroup.label,
                    label: option.label,
                  });
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
