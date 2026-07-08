"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDownIcon, LightbulbIcon } from "lucide-react";
import {
  useScrollLock,
  useAuiState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

const ReasoningPreviewContext = createContext(false);

const reasoningVariants = cva(
  cn(
    "aui-reasoning-root relative w-full",
    "animate-in fade-in-0 slide-in-from-top-1 duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
  ),
  {
    variants: {
      variant: {
        outline: "mb-4 rounded-lg border px-3 py-2",
        ghost: "",
        muted: "bg-muted/50 mb-4 rounded-lg px-3 py-2",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    /**
     * Whether the reasoning is currently streaming. When provided, it
     * supersedes `defaultOpen`: the disclosure auto-opens while streaming
     * with a bottom-pinned live preview, auto-collapses when streaming
     * ends, and the first manual toggle takes over permanently.
     */
    streaming?: boolean;
  };

function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const initialOpenRef = useRef(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled
    ? controlledOpen
    : (userOpen ?? streaming ?? initialOpenRef.current);
  const isAutoMode = isControlled || userOpen === null;
  const isPreview = streaming === true && isOpen && isAutoMode;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll();
      if (!isControlled) {
        setUserOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "group/reasoning-root",
        reasoningVariants({ variant, className }),
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      <ReasoningPreviewContext.Provider value={isPreview}>
        {children}
      </ReasoningPreviewContext.Provider>
      <div
        aria-hidden
        data-slot="reasoning-connector"
        className="aui-reasoning-connector bg-border absolute start-[11.5px] top-[26px] -bottom-1.5 hidden w-px"
      />
    </Collapsible>
  );
}

function ReasoningFade({
  side = "bottom",
  className,
  ...props
}: React.ComponentProps<"div"> & { side?: "top" | "bottom" }) {
  if (side === "top") {
    return (
      <div
        data-slot="reasoning-fade"
        className={cn(
          "aui-reasoning-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-8",
          "bg-[linear-gradient(to_bottom,var(--color-background),transparent)]",
          "group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.5),transparent)]",
          "fade-in-0 animate-in",
          "duration-(--animation-duration)",
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <div
      data-slot="reasoning-fade"
      className={cn(
        "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8",
        "bg-[linear-gradient(to_top,var(--color-background),transparent)]",
        "group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_top,hsl(var(--muted)/0.5),transparent)]",
        "fade-in-0 animate-in",
        "duration-(--animation-duration)",
        className,
      )}
      {...props}
    />
  );
}

function ReasoningTrigger({
  active,
  duration,
  label = "Reasoning",
  expandable = true,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & {
  active?: boolean;
  duration?: number;
  label?: React.ReactNode;
  expandable?: boolean;
}) {
  const durationText = duration ? `${duration}s` : "";

  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "aui-reasoning-trigger group/trigger flex w-full items-start",
        className,
      )}
      {...props}
    >
      <span
        data-slot="reasoning-trigger-icon"
        className="aui-reasoning-trigger-icon text-muted-foreground relative flex h-8 w-6 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "aui-reasoning-trigger-glyph flex items-center justify-center [&>svg]:size-4",
            expandable &&
              "transition-opacity group-hover/trigger:opacity-0 motion-reduce:transition-none",
          )}
        >
          <LightbulbIcon />
        </span>
        {expandable && (
          <span
            data-slot="reasoning-trigger-chevron"
            className="aui-reasoning-trigger-chevron absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/trigger:opacity-100 motion-reduce:transition-none"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                "group-data-[state=closed]/trigger:-rotate-90",
                "group-data-[state=open]/trigger:rotate-0",
              )}
            />
          </span>
        )}
      </span>
      <span className="aui-reasoning-trigger-line flex min-h-8 min-w-0 flex-1 items-center gap-1.5 py-1 pe-2 text-start">
        <span
          data-slot="reasoning-trigger-label"
          className="aui-reasoning-trigger-label-wrapper text-muted-foreground group-hover/trigger:text-foreground relative shrink-0 text-sm leading-6 transition-colors motion-reduce:transition-none"
        >
          {label}
          {active ? (
            <span
              aria-hidden
              data-slot="reasoning-trigger-shimmer"
              className="aui-reasoning-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
            >
              {label}
            </span>
          ) : null}
        </span>
        {durationText && (
          <span
            data-slot="reasoning-trigger-meta"
            className="aui-reasoning-trigger-meta text-muted-foreground ms-auto flex shrink-0 items-center gap-2 ps-2 text-xs tabular-nums"
          >
            {durationText}
          </span>
        )}
      </span>
    </CollapsibleTrigger>
  );
}

function ReasoningContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  const isPreview = useContext(ReasoningPreviewContext);

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "aui-reasoning-content text-muted-foreground relative overflow-hidden text-sm outline-none",
        "group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
        "data-[state=closed]:animate-collapsible-up",
        "data-[state=open]:animate-collapsible-down",
        "data-[state=closed]:fill-mode-forwards",
        "data-[state=closed]:pointer-events-none",
        "data-[state=open]:duration-(--animation-duration)",
        "data-[state=closed]:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <ReasoningFade side="top" />
      {children}
      {isPreview ? <ReasoningFade /> : null}
    </CollapsibleContent>
  );
}

function ReasoningText({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isPreview = useContext(ReasoningPreviewContext);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPreview) return;
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;
    const pin = () => {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    };
    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [isPreview]);

  return (
    <div
      ref={scrollRef}
      data-slot="reasoning-text"
      className={cn(
        "aui-reasoning-text relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed text-pretty",
        "transform-gpu transition-[transform,opacity] ease-[cubic-bezier(0.32,0.72,0,1)]",
        "motion-reduce:animate-none",
        "group-data-[state=open]/collapsible-content:animate-in",
        "group-data-[state=closed]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-in-0",
        "group-data-[state=closed]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:slide-in-from-top-4",
        "group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
        "group-data-[state=open]/collapsible-content:blur-in-[2px]",
        "group-data-[state=closed]/collapsible-content:blur-out-[2px]",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
      {...props}
    >
      <div ref={contentRef} className="aui-reasoning-text-content space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Reasoning summaries stream as light markdown ("**Title**"); the step row
 * renders plain text, so drop emphasis/code markers for display.
 */
export const stripReasoningMarkdown = (text: string) =>
  text.replace(/\*\*|__|`/g, "").trim();

const ReasoningImpl: ReasoningMessagePartComponent = ({ text, status }) => {
  const running = status?.type === "running";
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  const paragraphs = (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => stripReasoningMarkdown(p).length > 0);
  const headline = stripReasoningMarkdown(paragraphs[0] ?? "") || "Thinking";
  const thoughts = paragraphs.slice(1);

  if (thoughts.length === 0) {
    return (
      <ReasoningRoot variant="ghost">
        <ReasoningTrigger
          label={headline}
          active={running}
          expandable={false}
          disabled
        />
      </ReasoningRoot>
    );
  }

  return (
    <ReasoningRoot
      variant="ghost"
      open={userExpanded ?? running}
      onOpenChange={setUserExpanded}
    >
      <ReasoningTrigger label={headline} active={running} />
      <CollapsibleContent
        data-slot="reasoning-panel"
        className={cn(
          "aui-reasoning-panel relative overflow-hidden outline-none",
          "ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none",
          "data-[state=closed]:animate-collapsible-up",
          "data-[state=open]:animate-collapsible-down",
          "data-[state=closed]:fill-mode-forwards",
          "data-[state=closed]:pointer-events-none",
          "data-[state=open]:duration-(--animation-duration)",
          "data-[state=closed]:duration-(--animation-duration)",
        )}
      >
        <div
          data-slot="reasoning-thoughts"
          className="aui-reasoning-thoughts flex flex-col gap-2.5 ps-6 pe-2 pt-1 pb-2"
        >
          {thoughts.map((thought, i) => (
            <div
              key={i}
              className={cn(
                "aui-reasoning-thought relative",
                "animate-in fade-in-0 slide-in-from-top-1 duration-(--animation-duration) motion-reduce:animate-none",
                i === 0 &&
                  "before:bg-border before:absolute before:-start-[12.5px] before:-top-2.5 before:h-5 before:w-px",
                i < thoughts.length - 1 &&
                  "after:bg-border after:absolute after:-start-[12.5px] after:top-[9px] after:-bottom-5 after:w-px",
              )}
            >
              <span
                aria-hidden
                className="aui-reasoning-thought-dot border-border bg-background ring-background absolute -start-[16.5px] top-[5px] z-10 size-[9px] rounded-full border ring-4"
              />
              <MarkdownTextPrimitive
                remarkPlugins={[remarkGfm]}
                smooth={false}
                preprocess={() => thought}
                className="aui-reasoning-thought-text text-muted-foreground text-sm leading-snug"
              />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </ReasoningRoot>
  );
};

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot streaming={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

const Reasoning = memo(
  ReasoningImpl,
) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ReasoningRoot;
  Trigger: typeof ReasoningTrigger;
  Content: typeof ReasoningContent;
  Text: typeof ReasoningText;
  Fade: typeof ReasoningFade;
};

Reasoning.displayName = "Reasoning";
Reasoning.Root = ReasoningRoot;
Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;
Reasoning.Text = ReasoningText;
Reasoning.Fade = ReasoningFade;

/**
 * @deprecated This wrapper targets the legacy `components.ReasoningGroup`
 * prop on `<MessagePrimitive.Parts>`. Use `<MessagePrimitive.GroupedParts>`
 * with a `groupBy` returning `"group-reasoning"` and compose `ReasoningRoot`
 * / `ReasoningTrigger` / `ReasoningContent` / `ReasoningText` directly.
 * See `thread.tsx` for an example.
 */
const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";

export {
  Reasoning,
  ReasoningGroup,
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
  ReasoningFade,
  reasoningVariants,
};
