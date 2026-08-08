"use client";

import { ComposerPrimitive } from "@assistant-ui/react";
import {
  ArrowUpIcon,
  ChartColumnIcon,
  CloudSunIcon,
  CodeIcon,
  PencilLineIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  WelcomeSuggestionsPicker,
  WelcomeSuggestionsPills,
  WelcomeSuggestionsRoot,
  WelcomeSuggestionsStack,
  type SuggestionEntry,
} from "@/components/assistant-ui/welcome-suggestions";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { cn } from "@/lib/utils";
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

const FLAT_SUGGESTIONS: SuggestionEntry[] = [
  { label: "Summarize the key tradeoffs between REST and GraphQL" },
  { label: "Draft a friendly reminder for tomorrow's design review" },
  { label: "Explain the difference between debounce and throttle" },
  { label: "Suggest a memorable name for an open-source charting library" },
];

const Hint = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) => (
  <div
    data-hint
    className={cn(
      "text-muted-foreground/60 pointer-events-none mt-2 flex items-start gap-1.5 pl-5 select-none",
      className,
    )}
  >
    <svg
      aria-hidden
      viewBox="0 0 24 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0"
    >
      <path d="M21.5 25.5 C 12 24.5, 6.5 17, 5.5 5.5" />
      <path d="m1.5 10.5 4-6.5 5 5" />
    </svg>
    <span className="translate-y-2.5 -rotate-2 [font-family:'Segoe_Print','Bradley_Hand','Comic_Sans_MS',cursive] text-[17px]">
      {children}
    </span>
  </div>
);

const SampleComposer = () => (
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
);

const ToggleChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    onPointerDown={(e) => e.preventDefault()}
    className={cn(
      "rounded-full border px-2 py-px font-mono text-[10px] transition-colors",
      active
        ? "border-border bg-muted text-foreground"
        : "border-border/50 text-muted-foreground/60 hover:text-muted-foreground",
    )}
  >
    {children}
  </button>
);

const VariantColumn = ({
  label,
  hint,
  hintClassName,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  hintClassName?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cn(
      "mx-auto flex w-full max-w-[540px] min-w-0 flex-col gap-2",
      className,
    )}
  >
    <span className="text-muted-foreground/70 px-1 text-xs font-medium">
      {label}
    </span>
    <SampleRuntimeProvider messages={[]}>
      <div className="flex w-full flex-col gap-3">
        <SampleComposer />
        <div className="min-h-56 [&:has([data-open])_[data-hint]]:hidden">
          {children}
          {hint && <Hint className={hintClassName}>{hint}</Hint>}
        </div>
      </div>
    </SampleRuntimeProvider>
  </div>
);

export const WelcomeSuggestionsSample = () => {
  const [compact, setCompact] = useState(false);
  const [separators, setSeparators] = useState(true);
  const [chevron, setChevron] = useState(true);
  const [glyph, setGlyph] = useState<"none" | "send" | "enter">("send");
  const density = compact ? "compact" : "comfortable";

  return (
    <SampleFrame className="bg-muted/40 h-auto p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="flex flex-wrap justify-end gap-1">
          <ToggleChip active={compact} onClick={() => setCompact((v) => !v)}>
            compact
          </ToggleChip>
          <ToggleChip
            active={separators}
            onClick={() => setSeparators((v) => !v)}
          >
            separators
          </ToggleChip>
          <div className="bg-border/60 mx-1 w-px self-stretch" />
          <ToggleChip active={chevron} onClick={() => setChevron((v) => !v)}>
            chevron
          </ToggleChip>
          {(["send", "enter"] as const).map((value) => (
            <ToggleChip
              key={value}
              active={glyph === value}
              onClick={() => setGlyph((g) => (g === value ? "none" : value))}
            >
              {value}
            </ToggleChip>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <VariantColumn
            label="Pills + picker (default for groups)"
            hint={<>press ↓ or click a pill, then ← → move, ↓ opens</>}
            hintClassName="ml-[50%] -mr-[190px] -translate-x-[190px]"
          >
            <WelcomeSuggestionsRoot suggestions={SUGGESTIONS}>
              <WelcomeSuggestionsPills />
              <WelcomeSuggestionsPicker
                density={density}
                separators={separators}
                indicator={glyph}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
          <VariantColumn
            label="Stacked"
            hint={<>press ↓ or click a row, then ↑ ↓ move, → opens</>}
            className="max-lg:order-last"
          >
            <WelcomeSuggestionsRoot suggestions={SUGGESTIONS}>
              <WelcomeSuggestionsStack
                density={density}
                separators={separators}
                indicator={glyph}
                chevron={chevron}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
          <VariantColumn
            label="Flat entries (default: stacked)"
            className="lg:col-span-2"
          >
            <WelcomeSuggestionsRoot suggestions={FLAT_SUGGESTIONS}>
              <WelcomeSuggestionsStack
                density={density}
                separators={separators}
                indicator={glyph}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
        </div>
      </div>
    </SampleFrame>
  );
};
