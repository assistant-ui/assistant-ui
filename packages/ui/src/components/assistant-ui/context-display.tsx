"use client";

import { useAuiState } from "@assistant-ui/react";
import { useThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import type { ThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/radix/tooltip";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react";

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (tokens >= 1_000)
    return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${tokens}`;
};

const getUsagePercent = (
  totalTokens: number | undefined,
  modelContextWindow: number,
): number => {
  if (!totalTokens) return 0;
  return Math.min((totalTokens / modelContextWindow) * 100, 100);
};

type UsageSeverity = "normal" | "warning" | "critical";

const getUsageSeverity = (percent: number): UsageSeverity => {
  if (percent > 85) return "critical";
  if (percent >= 65) return "warning";
  return "normal";
};

const getStrokeColor = (percent: number): string => {
  const severity = getUsageSeverity(percent);
  if (severity === "critical") return "stroke-red-500";
  if (severity === "warning") return "stroke-amber-500";
  return "stroke-foreground";
};

const getBarColor = (percent: number): string => {
  const severity = getUsageSeverity(percent);
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-500";
  return "bg-foreground";
};

type ContextDisplayContextValue = {
  usage: ThreadTokenUsage | undefined;
  totalTokens: number;
  percent: number;
  modelContextWindow: number;
};

const ContextDisplayContext = createContext<ContextDisplayContextValue | null>(
  null,
);

function useContextDisplay(): ContextDisplayContextValue {
  const ctx = useContext(ContextDisplayContext);
  if (!ctx) {
    throw new Error("ContextDisplay.* must be used within ContextDisplay.Root");
  }
  return ctx;
}

type PresetProps = {
  modelContextWindow: number;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  usage?: ThreadTokenUsage | undefined;
};

type ContextDisplayRootProps = {
  modelContextWindow: number;
  children: ReactNode;
  usage?: ThreadTokenUsage | undefined;
};

function ContextDisplayRootBase({
  modelContextWindow,
  children,
  usage,
}: {
  modelContextWindow: number;
  children: ReactNode;
  usage: ThreadTokenUsage | undefined;
}) {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const rawTokens = usage?.totalTokens ?? 0;
  const [tokenState, setTokenState] = useState({
    threadId,
    totalTokens: rawTokens > 0 ? rawTokens : 0,
    usage,
  });

  useEffect(() => {
    setTokenState((prev) => {
      if (prev.threadId !== threadId) {
        return {
          threadId,
          totalTokens: rawTokens > 0 ? rawTokens : 0,
          usage,
        };
      }
      if (rawTokens > 0 && rawTokens !== prev.totalTokens) {
        return { ...prev, totalTokens: rawTokens, usage };
      }
      if (usage !== prev.usage) {
        return { ...prev, usage };
      }
      return prev;
    });
  }, [threadId, rawTokens, usage]);

  const totalTokens = tokenState.totalTokens;
  const percent = getUsagePercent(totalTokens, modelContextWindow);

  const contextValue = useMemo(
    () => ({
      usage: tokenState.usage,
      totalTokens,
      percent,
      modelContextWindow,
    }),
    [tokenState.usage, totalTokens, percent, modelContextWindow],
  );

  return (
    <ContextDisplayContext.Provider value={contextValue}>
      <Tooltip>{children}</Tooltip>
    </ContextDisplayContext.Provider>
  );
}

function ContextDisplayRootInternal({
  modelContextWindow,
  children,
}: {
  modelContextWindow: number;
  children: ReactNode;
}) {
  const usage = useThreadTokenUsage();
  return (
    <ContextDisplayRootBase
      modelContextWindow={modelContextWindow}
      usage={usage}
    >
      {children}
    </ContextDisplayRootBase>
  );
}

function ContextDisplayRoot(props: ContextDisplayRootProps) {
  if (props.usage !== undefined) {
    return (
      <ContextDisplayRootBase
        modelContextWindow={props.modelContextWindow}
        usage={props.usage}
      >
        {props.children}
      </ContextDisplayRootBase>
    );
  }
  return (
    <ContextDisplayRootInternal modelContextWindow={props.modelContextWindow}>
      {props.children}
    </ContextDisplayRootInternal>
  );
}

function ContextDisplayTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <TooltipTrigger asChild>
      <button
        type="button"
        data-slot="context-display-trigger"
        className={cn(
          "inline-flex items-center rounded-md transition-colors",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </TooltipTrigger>
  );
}

type ContextSegment = {
  label: string;
  tokens: number;
};

const getContextSegments = (
  usage: ThreadTokenUsage | undefined,
): ContextSegment[] => {
  if (!usage) return [];
  return [
    { label: "Input", tokens: usage.inputTokens ?? 0 },
    { label: "Cached input", tokens: usage.cachedInputTokens ?? 0 },
    { label: "Output", tokens: usage.outputTokens ?? 0 },
    { label: "Reasoning", tokens: usage.reasoningTokens ?? 0 },
  ].filter((segment) => segment.tokens > 0);
};

function ContextDisplayContent({
  side = "top",
  className,
}: {
  side?: "top" | "bottom" | "left" | "right" | undefined;
  className?: string;
}) {
  const { usage, totalTokens, percent, modelContextWindow } =
    useContextDisplay();
  const segments = getContextSegments(usage);

  return (
    <TooltipContent
      side={side}
      sideOffset={8}
      data-slot="context-display-popover"
      className={cn(
        "bg-popover text-popover-foreground w-56 rounded-lg border p-3 text-left shadow-md [&_span>svg]:hidden!",
        className,
      )}
    >
      <div className="text-xs">
        <div className="flex items-baseline justify-between gap-6 whitespace-nowrap">
          <span className="font-medium">Context usage</span>
          <span className="text-muted-foreground tabular-nums">
            {formatTokenCount(Math.min(totalTokens, modelContextWindow))} of{" "}
            {formatTokenCount(modelContextWindow)}
          </span>
        </div>
        <div className="bg-muted mt-2.5 h-1 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full w-(--usage-width) rounded-full transition-[width] duration-300",
              totalTokens > 0 && "min-w-1",
              getBarColor(percent),
            )}
            style={{ "--usage-width": `${percent}%` } as React.CSSProperties}
          />
        </div>
        {segments.length > 0 && (
          <div className="mt-3 grid gap-1.5">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-baseline justify-between gap-6"
              >
                <span className="text-muted-foreground">{segment.label}</span>
                <span className="tabular-nums">
                  {formatTokenCount(segment.tokens)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipContent>
  );
}

const RING_SIZE = 18;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function RingVisual() {
  const { percent } = useContextDisplay();

  return (
    <svg
      aria-hidden="true"
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="-rotate-90"
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        className="stroke-muted"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={
          RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE
        }
        className={cn(
          "transition-[stroke-dashoffset,stroke] duration-300",
          getStrokeColor(percent),
        )}
      />
    </svg>
  );
}

function RingPercentLabel() {
  const { percent } = useContextDisplay();
  return <span className="font-mono tabular-nums">{Math.round(percent)}%</span>;
}

const ContextDisplayRing: FC<PresetProps> = ({
  modelContextWindow,
  className,
  side,
  usage,
}) => (
  <ContextDisplayRoot modelContextWindow={modelContextWindow} usage={usage}>
    <ContextDisplayTrigger
      className={cn(
        "text-muted-foreground hover:text-foreground gap-1.5 px-1.5 py-1 text-xs",
        className,
      )}
      aria-label="Context usage"
    >
      <RingVisual />
      <RingPercentLabel />
    </ContextDisplayTrigger>
    <ContextDisplayContent side={side} />
  </ContextDisplayRoot>
);

function BarVisual() {
  const { percent, totalTokens } = useContextDisplay();

  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getBarColor(percent),
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-muted-foreground text-[10px] tabular-nums">
        {formatTokenCount(totalTokens)} ({Math.round(percent)}%)
      </span>
    </div>
  );
}

const ContextDisplayBar: FC<PresetProps> = ({
  modelContextWindow,
  className,
  side,
  usage,
}) => (
  <ContextDisplayRoot modelContextWindow={modelContextWindow} usage={usage}>
    <ContextDisplayTrigger
      className={cn("px-2 py-1", className)}
      aria-label="Context usage"
    >
      <BarVisual />
    </ContextDisplayTrigger>
    <ContextDisplayContent side={side} />
  </ContextDisplayRoot>
);

function TextVisual() {
  const { totalTokens, modelContextWindow } = useContextDisplay();

  return (
    <>
      {formatTokenCount(totalTokens)} / {formatTokenCount(modelContextWindow)}
    </>
  );
}

const ContextDisplayText: FC<PresetProps> = ({
  modelContextWindow,
  className,
  side,
  usage,
}) => (
  <ContextDisplayRoot modelContextWindow={modelContextWindow} usage={usage}>
    <ContextDisplayTrigger
      aria-label="Context usage"
      className={cn(
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground px-2 py-1 font-mono text-xs tabular-nums",
        className,
      )}
    >
      <TextVisual />
    </ContextDisplayTrigger>
    <ContextDisplayContent side={side} />
  </ContextDisplayRoot>
);

const ContextDisplay = {} as {
  Root: typeof ContextDisplayRoot;
  Trigger: typeof ContextDisplayTrigger;
  Content: typeof ContextDisplayContent;
  Ring: typeof ContextDisplayRing;
  Bar: typeof ContextDisplayBar;
  Text: typeof ContextDisplayText;
};

ContextDisplay.Root = ContextDisplayRoot;
ContextDisplay.Trigger = ContextDisplayTrigger;
ContextDisplay.Content = ContextDisplayContent;
ContextDisplay.Ring = ContextDisplayRing;
ContextDisplay.Bar = ContextDisplayBar;
ContextDisplay.Text = ContextDisplayText;

export {
  ContextDisplay,
  ContextDisplayRoot,
  ContextDisplayTrigger,
  ContextDisplayContent,
  ContextDisplayRing,
  ContextDisplayBar,
  ContextDisplayText,
};
