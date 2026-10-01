import { ContextDisplay } from "@assistant-ui/ui/components/assistant-ui/elements/context-display.aui.tsx";
import { defineSections } from "../types";
import { OpenOnMount } from "./_chat-helpers";

const WINDOW = 128_000;

const usage = (percent: number) => {
  const totalTokens = Math.round((percent / 100) * WINDOW);
  return {
    totalTokens,
    inputTokens: Math.round(totalTokens * 0.55),
    cachedInputTokens: Math.round(totalTokens * 0.3),
    outputTokens: Math.round(totalTokens * 0.1),
    reasoningTokens: Math.round(totalTokens * 0.05),
  };
};

const LEVELS = [
  { label: "Low", percent: 42 },
  { label: "Warning", percent: 72 },
  { label: "Critical", percent: 91 },
];

export default defineSections([
  {
    id: "context-display",
    title: "Context display",
    category: "chat",
    notes:
      "context-display.aui.tsx presets with explicit usage (the wired form reads AI SDK token usage): ring, bar and text at 42%, 72% and 91%.",
    render: () => (
      <div className="flex flex-col gap-3 text-xs">
        {LEVELS.map(({ label, percent }) => (
          <div
            key={label}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <span className="text-muted-foreground w-14">{label}</span>
            <ContextDisplay.Ring
              modelContextWindow={WINDOW}
              usage={usage(percent)}
            />
            <ContextDisplay.Bar
              modelContextWindow={WINDOW}
              usage={usage(percent)}
            />
            <ContextDisplay.Text
              modelContextWindow={WINDOW}
              usage={usage(percent)}
            />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "context-display-open",
    title: "Context display (popover open)",
    category: "chat",
    notes:
      "The bar preset at 72%, its tooltip opened on mount by hovering the trigger; the breakdown portals to the body.",
    render: () => (
      <OpenOnMount
        selector="[data-slot=context-display-trigger]"
        action="hover"
        className="flex h-48 items-end justify-center"
      >
        <ContextDisplay.Bar
          modelContextWindow={WINDOW}
          usage={usage(72)}
          side="top"
        />
      </OpenOnMount>
    ),
  },
]);
