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
  type IconReveal,
  type SuggestionEntry,
} from "@/components/assistant-ui/welcome-suggestions";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "@/components/assistant-ui/select";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Switch } from "@/components/ui/switch";
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
  sub,
}: {
  children: ReactNode;
  className?: string | undefined;
  sub?: boolean;
}) => (
  // -mt-1 counters part of the column's gap-3 so the arrow starts near the
  // content above.
  <div
    {...(sub ? { "data-subhint": "" } : { "data-hint": "" })}
    className={cn(
      "text-muted-foreground/60 pointer-events-none -mt-1 flex items-start gap-1.5 pl-5 select-none",
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

const ControlLabel = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <label
    className={cn(
      "text-muted-foreground/70 flex items-center gap-1.5 text-xs",
      className,
    )}
  >
    {children}
  </label>
);

const ControlSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) => (
  <ControlLabel>
    {label}
    <SelectRoot
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v as T);
      }}
      modal={false}
    >
      <SelectTrigger variant="ghost" size="sm" className="h-7 gap-1 px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  </ControlLabel>
);

// composerLast places the composer after the suggestions in the DOM — the
// component reads that order and flips itself; the column only bottom-anchors
// the group so it sits like a viewport-bottom composer.
const VariantColumn = ({
  label,
  hint,
  hintClassName,
  subHint,
  subHintClassName,
  composerLast,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  hintClassName?: string;
  subHint?: ReactNode;
  subHintClassName?: string;
  composerLast?: boolean;
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
      {/* min-h-84 reserves room for the tallest open panel so the columns
          keep one height and the grid never reflows while browsing. */}
      <div
        className={cn(
          "flex w-full flex-col gap-3 [&_[data-subhint]]:hidden [&:has([data-open])_[data-hint]]:hidden [&:has([data-open])_[data-subhint]]:flex",
          composerLast ? "justify-end" : "min-h-84",
        )}
      >
        {!composerLast && <SampleComposer />}
        {children}
        {hint && <Hint className={hintClassName}>{hint}</Hint>}
        {subHint && (
          <Hint sub className={subHintClassName}>
            {subHint}
          </Hint>
        )}
        {composerLast && <SampleComposer />}
      </div>
    </SampleRuntimeProvider>
  </div>
);

type RowHighlight = "ghost" | "text";
type Density = "comfortable" | "compact";

export const WelcomeSuggestionsSample = () => {
  const [density, setDensity] = useState<Density>("comfortable");
  const [separators, setSeparators] = useState(true);
  const [highlight, setHighlight] = useState<RowHighlight>("ghost");
  const [groupIcon, setGroupIcon] = useState<IconReveal>("always");
  const [itemIcon, setItemIcon] = useState<IconReveal>("always");

  return (
    <SampleFrame className="bg-muted/40 h-auto p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          <ControlSelect
            label="highlight"
            value={highlight}
            options={["ghost", "text"]}
            onChange={setHighlight}
          />
          <ControlSelect
            label="density"
            value={density}
            options={["comfortable", "compact"]}
            onChange={setDensity}
          />
          <ControlSelect
            label="group icon"
            value={groupIcon}
            options={["always", "hover", "off"]}
            onChange={setGroupIcon}
          />
          <ControlSelect
            label="item icon"
            value={itemIcon}
            options={["always", "hover", "off"]}
            onChange={setItemIcon}
          />
          <ControlLabel className="gap-2.5 ps-1">
            separators
            <Switch
              size="sm"
              checked={separators}
              onCheckedChange={setSeparators}
            />
          </ControlLabel>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <VariantColumn
            label="Pills + picker (default for groups)"
            hint={<>press ↓ or click, ← → move, ↓ to open</>}
            subHint={<>→ to edit in composer, tab / esc to exit</>}
            hintClassName="ml-[max(0px,calc(50%-190px))]"
            subHintClassName="ml-2"
            className="[&_[data-open]>[aria-hidden]]:hidden [&_[data-slot$=welcome-picker]]:static [&_[data-slot$=welcome-picker]]:mx-[2.5%]"
          >
            <WelcomeSuggestionsRoot suggestions={SUGGESTIONS}>
              <WelcomeSuggestionsPills />
              <WelcomeSuggestionsPicker
                highlight={highlight}
                density={density}
                separators={separators}
                itemIcon={itemIcon}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
          <VariantColumn
            label="Stacked"
            hint={<>press ↓ or click, ↑ ↓ move, → to open</>}
            hintClassName="ml-2"
            subHint={<>→ to edit in composer, tab / esc to exit</>}
            subHintClassName="ml-2"
          >
            <WelcomeSuggestionsRoot suggestions={SUGGESTIONS}>
              <WelcomeSuggestionsStack
                highlight={highlight}
                density={density}
                separators={separators}
                groupIcon={groupIcon}
                itemIcon={itemIcon}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
          <VariantColumn
            label="Flat suggestion list (default for flat entries)"
            composerLast
            className="lg:col-span-2"
          >
            <WelcomeSuggestionsRoot suggestions={FLAT_SUGGESTIONS}>
              <WelcomeSuggestionsStack
                highlight={highlight}
                density={density}
                separators={separators}
                itemIcon={itemIcon}
              />
            </WelcomeSuggestionsRoot>
          </VariantColumn>
        </div>
      </div>
    </SampleFrame>
  );
};
