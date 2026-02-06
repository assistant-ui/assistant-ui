"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { ChevronDownIcon, RotateCcwIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtText,
  ChainOfThoughtTrace,
  type TraceNode,
} from "@/components/assistant-ui/chain-of-thought-v2";
import { CollapsibleTrigger } from "@/components/ui/collapsible";

// ============================================================================
// Shared data constants
// ============================================================================

function CitationBadge({
  favicon,
  domain,
  path,
}: {
  favicon: string;
  domain: string;
  path?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
      <span className="flex size-4 items-center justify-center rounded bg-background text-[10px]">
        {favicon}
      </span>
      <span className="text-muted-foreground">
        {domain}
        {path ? (
          <span className="text-muted-foreground/60">/{path}</span>
        ) : null}
      </span>
    </span>
  );
}

const WEB_SEARCH_RESULTS_OUTPUT: ReactNode = (
  <div className="space-y-2">
    <div className="text-muted-foreground/70">Selected 5 top results</div>
    <div className="flex flex-wrap gap-1.5">
      <CitationBadge
        favicon="📚"
        domain="assistant-ui.com"
        path="docs/streaming"
      />
      <CitationBadge favicon="📝" domain="ux-patterns.dev" path="timelines" />
      <CitationBadge favicon="🔧" domain="react-traces.io" path="nested" />
      <CitationBadge favicon="✨" domain="motion.design" path="shimmer" />
      <CitationBadge favicon="📖" domain="disclosure-ux.org" />
    </div>
  </div>
);

const RESULT_SCORING_OUTPUT: ReactNode = (
  <div className="space-y-2">
    <div className="text-muted-foreground/70">
      Scoring results for relevance before summarizing.
    </div>
    <pre className="rounded-md bg-muted/60 p-2 font-mono text-[11px] text-foreground/80 leading-relaxed">
      <code>{`const scored = results
  .map((r) => ({ ...r, score: score(r, intent) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);`}</code>
    </pre>
  </div>
);

const STREAMING_ROOT_STEPS = [
  {
    id: "plan",
    label: "Planning approach",
    type: "text",
    output: "Drafting a response strategy tailored to the user request.",
  },
  {
    id: "search",
    label: "Searching for references",
    type: "search",
    toolName: "search",
    output: WEB_SEARCH_RESULTS_OUTPUT,
  },
  {
    id: "score",
    label: "Scoring sources",
    type: "code",
    toolName: "code",
    output: RESULT_SCORING_OUTPUT,
  },
  {
    id: "narrate-1",
    label: "Thinking out loud",
    type: "text",
    output:
      "I've gathered and ranked the sources. Next I'll synthesize the key points before drafting.",
  },
  {
    id: "synthesize",
    label: "Merging subagent findings",
    type: "tool",
    toolName: "merge",
    output: "Combined 5 research threads into a unified brief.",
  },
  {
    id: "compose",
    label: "Drafting response",
    type: "tool",
    toolName: "write",
    output: "Generated a 3-paragraph summary with inline citations.",
  },
  {
    id: "narrate-2",
    label: "Thinking out loud",
    type: "text",
    output:
      "The structure looks solid. Running a final quality pass before sending.",
  },
  {
    id: "quality",
    label: "Validating output",
    type: "code",
    toolName: "validate",
    output: "All assertions passed: length, tone, citation coverage.",
  },
  {
    id: "done",
    label: "Audited onboarding",
    type: "text",
    output: "Response verified and ready to deliver.",
  },
] as const;

// ============================================================================
// Parallel agent data
// ============================================================================

const PARALLEL_ROOT_DELAY_MS = 2000;
const PARALLEL_AGENT_DELAYS: Record<string, number> = {
  researcher: 900,
  planner: 1050,
  critic: 850,
  verifier: 980,
  writer: 920,
};
const PARALLEL_AGENT_START_DELAY_MS = 600;

const PARALLEL_AGENTS = [
  {
    id: "researcher",
    label: "Researcher",
    steps: [
      {
        id: "brief",
        label: "Reviewing task brief",
        type: "text",
        output: "Summarizing the task scope and expected output.",
      },
      {
        id: "sources",
        label: "Collecting sources",
        type: "search",
        toolName: "search",
        output: WEB_SEARCH_RESULTS_OUTPUT,
      },
      {
        id: "outline",
        label: "Drafting outline",
        type: "code",
        toolName: "code",
        output: RESULT_SCORING_OUTPUT,
      },
      {
        id: "synthesize",
        label: "Synthesizing findings",
        type: "text",
        output: "Condensing the findings into concise points.",
      },
      {
        id: "validate",
        label: "Validating sources",
        type: "text",
        output: "Checking sources for accuracy and recency.",
      },
      {
        id: "handoff",
        label: "Handoff notes",
        type: "text",
        output: "Packaging findings for the main response.",
      },
    ],
  },
  {
    id: "planner",
    label: "Planner",
    steps: [
      {
        id: "intent",
        label: "Clarifying user intent",
        type: "text",
        output: "Confirming the desired outcome and audience.",
      },
      {
        id: "constraints",
        label: "Capturing constraints",
        type: "text",
        output: "Listing key constraints that must be respected.",
      },
      {
        id: "sequence",
        label: "Sequencing tasks",
        type: "text",
        output: "Ordering tasks for efficient execution.",
      },
      {
        id: "handoff",
        label: "Preparing handoff",
        type: "text",
        output: "Packaging instructions for the execution phase.",
      },
      {
        id: "timeline",
        label: "Estimating timeline",
        type: "text",
        output: "Estimating effort and pacing for the response.",
      },
      {
        id: "fallbacks",
        label: "Defining fallbacks",
        type: "text",
        output: "Adding fallback plans for missing data.",
      },
    ],
  },
  {
    id: "critic",
    label: "Critic",
    steps: [
      {
        id: "scan",
        label: "Scanning for gaps",
        type: "text",
        output: "Looking for missing details or assumptions.",
      },
      {
        id: "risks",
        label: "Flagging risks",
        type: "text",
        output: "Highlighting potential issues to address.",
      },
      {
        id: "verify",
        label: "Verifying output",
        type: "text",
        output: "Cross-checking output for consistency.",
      },
      {
        id: "notes",
        label: "Drafting notes",
        type: "text",
        output: "Drafting review notes for the main response.",
      },
      {
        id: "consistency",
        label: "Consistency scan",
        type: "text",
        output: "Checking for conflicting statements.",
      },
      {
        id: "rewrite",
        label: "Rewrite suggestions",
        type: "text",
        output: "Suggesting tightened or clearer phrasing.",
      },
    ],
  },
  {
    id: "verifier",
    label: "Verifier",
    steps: [
      {
        id: "consistency",
        label: "Checking consistency",
        type: "text",
        output: "Ensuring reasoning matches stated constraints.",
      },
      {
        id: "edge-cases",
        label: "Reviewing edge cases",
        type: "text",
        output: "Looking for gaps in handling edge scenarios.",
      },
      {
        id: "coverage",
        label: "Coverage check",
        type: "text",
        output: "Confirming all requested points are addressed.",
      },
      {
        id: "confidence",
        label: "Confidence pass",
        type: "text",
        output: "Summarizing confidence and caveats.",
      },
      {
        id: "fact-check",
        label: "Fact check",
        type: "text",
        output: "Confirming factual claims and references.",
      },
      {
        id: "final-check",
        label: "Final verification",
        type: "text",
        output: "Ensuring the answer matches the request.",
      },
    ],
  },
  {
    id: "writer",
    label: "Writer",
    steps: [
      {
        id: "tone",
        label: "Setting tone",
        type: "text",
        output: "Choosing an appropriate tone for the response.",
      },
      {
        id: "draft",
        label: "Drafting copy",
        type: "text",
        output: "Writing the response based on the outline.",
      },
      {
        id: "trim",
        label: "Trimming verbosity",
        type: "text",
        output: "Removing redundant phrasing and tightening.",
      },
      {
        id: "polish",
        label: "Final polish",
        type: "text",
        output: "Final grammatical and clarity sweep.",
      },
      {
        id: "structure",
        label: "Structure pass",
        type: "text",
        output: "Ensuring headings and flow read cleanly.",
      },
      {
        id: "tone-align",
        label: "Tone alignment",
        type: "text",
        output: "Aligning tone with the target audience.",
      },
    ],
  },
] as const;

// ============================================================================
// useStreamingParallelTrace hook
// ============================================================================

function useStreamingParallelTrace() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [rootProgress, setRootProgress] = useState(-1);
  const [agentProgress, setAgentProgress] = useState(() =>
    Object.fromEntries(PARALLEL_AGENTS.map((agent) => [agent.id, -1])),
  );
  const rootIntervalRef = useRef<number | null>(null);
  const agentIntervalsRef = useRef<Record<string, number | null>>({});
  const agentStartTimeoutRef = useRef<number | null>(null);
  const isProgressing = isStreaming || isManual;
  const rootLastIndex = STREAMING_ROOT_STEPS.length - 1;
  const allAgentsDone = PARALLEL_AGENTS.every(
    (agent) => (agentProgress[agent.id] ?? -1) >= agent.steps.length - 1,
  );
  const rootDone = rootProgress >= rootLastIndex && rootProgress >= 0;

  useEffect(() => {
    if (!isStreaming) {
      if (rootIntervalRef.current !== null) {
        window.clearInterval(rootIntervalRef.current);
        rootIntervalRef.current = null;
      }
      if (agentStartTimeoutRef.current !== null) {
        window.clearTimeout(agentStartTimeoutRef.current);
        agentStartTimeoutRef.current = null;
      }
      Object.values(agentIntervalsRef.current).forEach((intervalId) => {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
        }
      });
      agentIntervalsRef.current = {};
      return;
    }

    rootIntervalRef.current = window.setInterval(() => {
      setRootProgress((current) => {
        if (current >= rootLastIndex) {
          if (rootIntervalRef.current !== null) {
            window.clearInterval(rootIntervalRef.current);
            rootIntervalRef.current = null;
          }
          return current;
        }
        return current + 1;
      });
    }, PARALLEL_ROOT_DELAY_MS);

    agentStartTimeoutRef.current = window.setTimeout(() => {
      setAgentProgress((current) => {
        const next = { ...current };
        PARALLEL_AGENTS.forEach((agent) => {
          if (next[agent.id] < 0) {
            next[agent.id] = 0;
          }
        });
        return next;
      });

      PARALLEL_AGENTS.forEach((agent) => {
        const delay = PARALLEL_AGENT_DELAYS[agent.id] ?? 1000;
        agentIntervalsRef.current[agent.id] = window.setInterval(() => {
          setAgentProgress((current) => {
            const currentIndex = current[agent.id] ?? -1;
            if (currentIndex >= agent.steps.length - 1) {
              const intervalId = agentIntervalsRef.current[agent.id];
              if (intervalId !== null) {
                window.clearInterval(intervalId);
                agentIntervalsRef.current[agent.id] = null;
              }
              return current;
            }
            return { ...current, [agent.id]: currentIndex + 1 };
          });
        }, delay);
      });
    }, PARALLEL_AGENT_START_DELAY_MS);

    return () => {
      if (rootIntervalRef.current !== null) {
        window.clearInterval(rootIntervalRef.current);
        rootIntervalRef.current = null;
      }
      if (agentStartTimeoutRef.current !== null) {
        window.clearTimeout(agentStartTimeoutRef.current);
        agentStartTimeoutRef.current = null;
      }
      Object.values(agentIntervalsRef.current).forEach((intervalId) => {
        if (intervalId !== null) {
          window.clearInterval(intervalId);
        }
      });
      agentIntervalsRef.current = {};
    };
  }, [isStreaming, rootLastIndex]);

  useEffect(() => {
    if (!isStreaming) return;
    if (rootDone && allAgentsDone) {
      setIsStreaming(false);
    }
  }, [allAgentsDone, isStreaming, rootDone]);

  const buildRootSteps = useCallback(() => {
    if (!hasStarted || rootProgress < 0) return [];
    return STREAMING_ROOT_STEPS.slice(0, rootProgress + 1).map(
      (step, index) => ({
        kind: "step" as const,
        id: step.id,
        label: step.label,
        type: step.type as any,
        toolName: "toolName" in step ? step.toolName : undefined,
        output: step.output
          ? {
              content: step.output,
              status:
                isProgressing && index === rootProgress
                  ? "streaming"
                  : "complete",
            }
          : undefined,
        status:
          isProgressing && index === rootProgress ? "running" : "complete",
      }),
    );
  }, [hasStarted, isProgressing, rootProgress]);

  const buildAgentSteps = useCallback(
    (agent: (typeof PARALLEL_AGENTS)[number]) => {
      const latestIndex = agentProgress[agent.id] ?? -1;
      if (!hasStarted || latestIndex < 0) return [];
      return agent.steps.slice(0, latestIndex + 1).map((step, index) => ({
        kind: "step" as const,
        id: step.id,
        label: step.label,
        type: step.type as any,
        output: step.output
          ? {
              content: step.output,
              status:
                isProgressing && index === latestIndex
                  ? "streaming"
                  : "complete",
            }
          : undefined,
        status: isProgressing && index === latestIndex ? "running" : "complete",
      }));
    },
    [agentProgress, hasStarted, isProgressing],
  );

  const rootSteps = buildRootSteps();
  const rootBefore = rootSteps.length > 0 ? [rootSteps[0]!] : [];
  const rootAfter = rootSteps.length > 1 ? rootSteps.slice(1) : [];

  const anyAgentStarted = Object.values(agentProgress).some(
    (value) => value >= 0,
  );
  const showParallelGroup = hasStarted && anyAgentStarted;
  const anyAgentRunning = isProgressing && showParallelGroup && !allAgentsDone;

  // Count how many subagents are complete
  const completedAgentCount = PARALLEL_AGENTS.filter(
    (agent) => (agentProgress[agent.id] ?? -1) >= agent.steps.length - 1,
  ).length;
  const totalAgentCount = PARALLEL_AGENTS.length;

  const trace = useMemo<TraceNode[]>(() => {
    if (!hasStarted) return [];
    return [
      ...rootBefore,
      ...(showParallelGroup
        ? ([
            {
              kind: "group",
              id: "agent-parallel",
              label: "Gathering research from multiple perspectives",
              status: anyAgentRunning ? "running" : "complete",
              summary: {
                latestLabel: anyAgentRunning
                  ? `${completedAgentCount} of ${totalAgentCount} subagents complete`
                  : `${totalAgentCount} subagents complete`,
                latestType: "tool" as const,
                toolName: `${totalAgentCount} subagents`,
              },
              children: PARALLEL_AGENTS.map((agent) => {
                const steps = buildAgentSteps(agent);
                const latestStep = steps[steps.length - 1];
                return {
                  kind: "group",
                  id: `agent-${agent.id}-parallel`,
                  label: agent.label,
                  status: latestStep?.status ?? "complete",
                  variant: "subagent",
                  summary: latestStep
                    ? {
                        latestLabel: latestStep.label,
                        latestType: latestStep.type,
                      }
                    : undefined,
                  children: steps,
                } as TraceNode;
              }),
            },
          ] as TraceNode[])
        : []),
      ...rootAfter,
    ];
  }, [
    rootBefore,
    rootAfter,
    showParallelGroup,
    anyAgentRunning,
    buildAgentSteps,
    hasStarted,
    completedAgentCount,
  ]);

  const start = useCallback(() => {
    setIsManual(false);
    setRootProgress(0);
    setAgentProgress(
      Object.fromEntries(PARALLEL_AGENTS.map((agent) => [agent.id, -1])),
    );
    setHasStarted(true);
    setIsStreaming(true);
  }, []);

  const stepOnce = useCallback(() => {
    setIsStreaming(false);
    setIsManual(true);
    setHasStarted(true);

    if (rootProgress < 0) {
      setRootProgress(0);
      return;
    }

    const anyAgentsStarted = Object.values(agentProgress).some(
      (value) => value >= 0,
    );

    if (!anyAgentsStarted) {
      setAgentProgress(
        Object.fromEntries(PARALLEL_AGENTS.map((agent) => [agent.id, 0])),
      );
      return;
    }

    setRootProgress((current) =>
      current >= rootLastIndex ? current : current + 1,
    );
    setAgentProgress((current) => {
      const next = { ...current };
      PARALLEL_AGENTS.forEach((agent) => {
        const currentIndex = next[agent.id] ?? -1;
        next[agent.id] =
          currentIndex >= agent.steps.length - 1
            ? currentIndex
            : currentIndex + 1;
      });
      return next;
    });
  }, [agentProgress, rootLastIndex, rootProgress]);

  const reset = useCallback(() => {
    setIsStreaming(false);
    setIsManual(false);
    setHasStarted(false);
    setRootProgress(-1);
    setAgentProgress(
      Object.fromEntries(PARALLEL_AGENTS.map((agent) => [agent.id, -1])),
    );
  }, []);

  return {
    trace,
    isStreaming,
    isManual,
    start,
    stepOnce,
    reset,
  };
}

// ============================================================================
// Headline transition components
// ============================================================================

const HEADLINE_OUT_MS = 200;
const HEADLINE_IN_MS = 320;
const HEADLINE_TRANSITION_MS = HEADLINE_IN_MS;

function TraceHeadlineTransition({
  label,
  active,
  isOpen,
}: {
  label?: ReactNode;
  active?: boolean;
  isOpen?: boolean;
}) {
  const [currentLabel, setCurrentLabel] = useState(label);
  const [previousLabel, setPreviousLabel] = useState<ReactNode | null>(null);
  const [labelKey, setLabelKey] = useState(0);
  const labelRef = useRef(label);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (Object.is(labelRef.current, label)) return;

    setPreviousLabel(labelRef.current ?? null);
    setCurrentLabel(label);
    setLabelKey((value) => value + 1);
    labelRef.current = label;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setPreviousLabel(null);
    }, HEADLINE_TRANSITION_MS);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [label]);

  if (currentLabel == null && previousLabel == null) return null;
  const isTransitioning = previousLabel != null;
  const shimmerClass = active
    ? "shimmer shimmer-invert shimmer-angle-30"
    : undefined;

  // Inline chevron that transitions with each headline
  const inlineChevron = (
    <ChevronDownIcon
      className={cn(
        "ml-1.5 inline-block size-4 shrink-0 align-middle",
        "transition-transform duration-200",
        isOpen ? "rotate-0" : "-rotate-90",
      )}
    />
  );

  return (
    <div className="aui-chain-of-thought-trace-summary shimmer-container relative min-h-[1.25rem] overflow-hidden">
      <div className="relative h-5">
        {previousLabel != null && (
          <span
            key={`prev-${labelKey}`}
            className={cn(
              "aui-chain-of-thought-trace-summary-prev absolute inset-0 flex items-center",
              "truncate text-left",
              isTransitioning &&
                "fade-out-0 animate-out fill-mode-both ease-out",
              "motion-reduce:animate-none",
            )}
            style={{ animationDuration: `${HEADLINE_OUT_MS}ms` }}
          >
            <span className={cn("inline-flex items-center", shimmerClass)}>
              {previousLabel}
              {inlineChevron}
            </span>
          </span>
        )}
        {currentLabel != null && (
          <span
            key={`current-${labelKey}`}
            className={cn(
              "aui-chain-of-thought-trace-summary-current absolute inset-0 flex items-center",
              "truncate text-left",
              isTransitioning && "fade-in-0 animate-in fill-mode-both ease-out",
              "motion-reduce:animate-none",
            )}
            style={{ animationDuration: `${HEADLINE_IN_MS}ms` }}
          >
            <span className={cn("inline-flex items-center", shimmerClass)}>
              {currentLabel}
              {inlineChevron}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function ChainOfThoughtCyclingTrigger({
  label,
  active,
}: {
  label?: ReactNode;
  active?: boolean;
}) {
  // Track open state from parent Collapsible via data attribute
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const observer = new MutationObserver(() => {
      const state = trigger.getAttribute("data-state");
      setIsOpen(state === "open");
    });

    observer.observe(trigger, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
    // Initial state
    setIsOpen(trigger.getAttribute("data-state") === "open");

    return () => observer.disconnect();
  }, []);

  return (
    <CollapsibleTrigger
      ref={triggerRef}
      data-slot="chain-of-thought-trigger"
      className={cn(
        "aui-chain-of-thought-trigger",
        "group/trigger flex w-full items-center gap-2 py-1 text-left",
        "text-muted-foreground text-sm transition-colors hover:text-foreground",
      )}
    >
      <span
        data-slot="chain-of-thought-trigger-label"
        className="aui-chain-of-thought-trigger-label-wrapper min-w-0 flex-1 leading-5"
      >
        <TraceHeadlineTransition
          label={label}
          active={active}
          isOpen={isOpen}
        />
      </span>
    </CollapsibleTrigger>
  );
}

// ============================================================================
// Utilities
// ============================================================================

function getLatestTraceStepLabel(trace: TraceNode[]): ReactNode | undefined {
  const visit = (node: TraceNode): ReactNode | undefined => {
    if (node.kind === "step") {
      if (node.label != null) return node.label;
      if (node.toolName) return `Tool: ${node.toolName}`;
      return undefined;
    }
    // For groups, prefer using the summary label if available
    // This allows parent groups (like subagent containers) to show
    // aggregate status like "3 of 5 subagents complete"
    if (node.summary?.latestLabel != null) {
      return node.summary.latestLabel;
    }
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const label = visit(node.children[i]!);
      if (label != null) return label;
    }
    return undefined;
  };

  for (let i = trace.length - 1; i >= 0; i -= 1) {
    const label = visit(trace[i]!);
    if (label != null) return label;
  }
  return undefined;
}

function StreamingTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startTime]);

  return (
    <div className="rounded-md bg-muted px-2 py-1.5">
      <span className="text-muted-foreground text-xs">Elapsed: {elapsed}s</span>
    </div>
  );
}

// ============================================================================
// Full-bleed demo sample
// ============================================================================

/**
 * Full-bleed sample with mock chat thread shell and right sidebar for controls.
 * Flow: User message -> Assistant text streams -> CoT appears below with headline
 * Features: Duration tracking, crossfade headlines, "Audited onboarding (Ns)" final label
 */
export function ChainOfThoughtHeadlineStreamingFullBleedSample() {
  const { trace, isStreaming, isManual, start, stepOnce, reset } =
    useStreamingParallelTrace();
  const hasStarted = trace.length > 0 || isStreaming;

  // Track streaming duration
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null);
  const wasStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      if (!wasStreamingRef.current) {
        startTimeRef.current = Date.now();
        setDurationSec(undefined);
      }
    } else if (wasStreamingRef.current && startTimeRef.current != null) {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
      setDurationSec(elapsedSec);
      startTimeRef.current = null;
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Reset duration when resetting
  const handleReset = useCallback(() => {
    reset();
    setDurationSec(undefined);
    startTimeRef.current = null;
    wasStreamingRef.current = false;
  }, [reset]);

  // Build headline with duration suffix when complete
  const baseHeadline = useMemo(
    () => getLatestTraceStepLabel(trace) ?? "Reasoning",
    [trace],
  );
  const headline = useMemo(() => {
    if (isStreaming || durationSec == null) return baseHeadline;
    // Append duration to final headline
    if (typeof baseHeadline === "string") {
      return `${baseHeadline} (${durationSec}s)`;
    }
    return baseHeadline;
  }, [baseHeadline, durationSec, isStreaming]);

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Thread container - main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
            {/* User message (with bubble) */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
                <p>
                  Can you research the latest developments in quantum computing
                  and summarize the key breakthroughs from multiple sources?
                </p>
              </div>
            </div>

            {/* Assistant message (no bubble) */}
            <div className="flex justify-start">
              <div className="max-w-[80%] space-y-3">
                {/* Assistant text response - streams in first */}
                <p className="text-sm leading-relaxed">
                  Based on my research across multiple sources, here are the key
                  breakthroughs in quantum computing: IBM recently achieved a
                  1,000+ qubit processor, Google demonstrated quantum error
                  correction advances, and several startups are making progress
                  on room-temperature quantum systems.
                </p>

                {/* CoT component - appears after text, always has headline */}
                {hasStarted ? (
                  <ChainOfThoughtRoot
                    defaultOpen={false}
                    className="mb-0 border-0 p-0"
                  >
                    <ChainOfThoughtCyclingTrigger
                      label={headline}
                      active={isStreaming}
                    />
                    <ChainOfThoughtContent aria-busy={isStreaming}>
                      <ChainOfThoughtTrace
                        trace={trace}
                        maxDepth={3}
                        autoScroll={false}
                        scrollable={false}
                        allowGroupExpand
                      />
                    </ChainOfThoughtContent>
                  </ChainOfThoughtRoot>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar with controls */}
      <div className="flex w-56 shrink-0 flex-col gap-4 border-l bg-muted/30 p-4">
        <div className="space-y-1">
          <h3 className="font-medium text-foreground text-sm">
            Simulation Controls
          </h3>
          <p className="text-muted-foreground text-xs">
            Control the trace streaming demo
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            onClick={start}
            disabled={isStreaming}
            className="w-full"
          >
            {isStreaming ? "Streaming..." : "Start"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={stepOnce}
            disabled={isStreaming}
            className="w-full"
          >
            Step
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Reset
          </Button>
        </div>

        {isManual ? (
          <div className="rounded-md bg-muted px-2 py-1.5">
            <span className="text-muted-foreground text-xs">Manual mode</span>
          </div>
        ) : null}

        {durationSec != null && !isStreaming ? (
          <div className="rounded-md bg-muted px-2 py-1.5">
            <span className="text-muted-foreground text-xs">
              Completed in {durationSec}s
            </span>
          </div>
        ) : null}

        {isStreaming && startTimeRef.current != null ? (
          <StreamingTimer startTime={startTimeRef.current} />
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Concurrent Streaming Stress Test
// ============================================================================

function ConcurrentStreamingInstance({
  id,
  delay,
}: {
  id: number;
  delay: number;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState("");
  const fullText = `This is instance ${id} streaming its content. Each instance operates independently with its own timing and state. The delay was ${delay}ms.`;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const startTimeout = setTimeout(() => {
      setIsStreaming(true);
      setText("");
      let i = 0;
      interval = setInterval(
        () => {
          if (i < fullText.length) {
            setText(fullText.slice(0, i + 1));
            i++;
          } else {
            setIsStreaming(false);
            if (interval) {
              clearInterval(interval);
              interval = undefined;
            }
          }
        },
        20 + Math.random() * 20,
      );
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [delay, fullText]);

  return (
    <ChainOfThoughtRoot
      variant={id % 2 === 0 ? "outline" : "muted"}
      defaultOpen
      className="mb-0"
    >
      <ChainOfThoughtTrigger active={isStreaming} label={`Stream ${id}`} />
      <ChainOfThoughtContent aria-busy={isStreaming}>
        <ChainOfThoughtText>
          {text || (
            <span className="text-muted-foreground/50 italic">
              Starting in {delay}ms...
            </span>
          )}
        </ChainOfThoughtText>
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

export function ChainOfThoughtConcurrentStreamingSample() {
  const [key, setKey] = useState(0);
  const instances = [
    { id: 1, delay: 0 },
    { id: 2, delay: 300 },
    { id: 3, delay: 600 },
    { id: 4, delay: 900 },
    { id: 5, delay: 1200 },
  ];

  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setKey((k) => k + 1)}
        >
          <RotateCcwIcon className="mr-1.5 size-3" />
          Restart All
        </Button>
        <span className="text-muted-foreground text-xs">
          5 instances streaming with staggered start times
        </span>
      </div>

      <div key={key} className="flex flex-col gap-2">
        {instances.map((inst) => (
          <ConcurrentStreamingInstance
            key={inst.id}
            id={inst.id}
            delay={inst.delay}
          />
        ))}
      </div>
    </SampleFrame>
  );
}
