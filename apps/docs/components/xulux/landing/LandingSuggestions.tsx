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
import {
  XULUX_SUGGESTION_GROUPS,
  type XuluxSuggestion,
  type XuluxSuggestionGroupLabel,
} from "./xulux-suggestions";

const GROUP_ICONS: Record<XuluxSuggestionGroupLabel, ReactNode> = {
  "New app": <SparklesIcon />,
  Templates: <LayoutTemplateIcon />,
  Learn: <BookOpenIcon />,
  Cloud: <CloudIcon />,
};

const suggestionChipClass =
  "aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors [&_svg]:size-4";

type Props = {
  onSelectPrompt: (
    prompt: string,
    suggestion: Pick<XuluxSuggestion, "id" | "label"> & {
      group: XuluxSuggestionGroupLabel;
    },
  ) => void;
  disabled?: boolean;
};

export function LandingSuggestions({ onSelectPrompt, disabled }: Props) {
  const analyticsCtx = useXuluxAnalytics();
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const expandedGroup = XULUX_SUGGESTION_GROUPS.find(
    (group) => group.label === expandedLabel,
  );

  return (
    <div className="aui-thread-welcome-suggestions mt-4 flex w-full flex-col gap-2">
      <div className="w-full scrollbar-none overflow-x-auto">
        <div className="mx-auto flex w-max max-w-full items-center gap-2 px-1">
          {XULUX_SUGGESTION_GROUPS.map((group) => (
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
              {GROUP_ICONS[group.label]}
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
                    id: option.id,
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
