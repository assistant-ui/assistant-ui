"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { ChevronDownIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import {
  ChainOfThought,
  type ChainOfThoughtStrings,
  type TraceGroup,
  type TraceNode,
  type TraceStatus,
  type StepType,
} from "@/components/assistant-ui/chain-of-thought";
import {
  ChainOfThoughtStringsContext,
  mergeChainOfThoughtStrings,
} from "@/components/assistant-ui/chain-of-thought/strings";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Trace fixtures
// ---------------------------------------------------------------------------

const makeStep = ({
  id,
  label,
  status,
  type,
  output,
  toolName,
  detail,
}: {
  id: string;
  label: string;
  status: TraceStatus;
  type: StepType;
  output: string;
  toolName?: string;
  detail?: string;
}): TraceNode => ({
  kind: "step",
  id,
  label,
  status,
  type,
  output,
  ...(toolName ? { toolName } : {}),
  ...(detail ? { detail } : {}),
});

const makeGroup = ({
  id,
  label,
  status,
  children,
  variant,
}: {
  id: string;
  label: string;
  status: TraceStatus;
  children: TraceNode[];
  variant?: TraceGroup["variant"];
}): TraceNode => ({
  kind: "group",
  id,
  label,
  status,
  children,
  ...(variant ? { variant } : {}),
});

const RESEARCH_SEARCH_RUNNING = makeStep({
  id: "research-search",
  label: "Tool: search_web",
  status: "running",
  type: "search",
  toolName: "search_web",
  output: "Searching for recent breakthroughs...",
});
const RESEARCH_SEARCH_COMPLETE = makeStep({
  id: "research-search",
  label: "Tool: search_web",
  status: "complete",
  type: "search",
  toolName: "search_web",
  output: "Found 6 relevant sources.",
});
const RESEARCH_FILTER_RUNNING = makeStep({
  id: "research-filter",
  label: "Tool: filter_sources",
  status: "running",
  type: "tool",
  toolName: "filter_sources",
  output: "Filtering for peer-reviewed and post-2024 sources...",
});
const RESEARCH_FILTER_COMPLETE = makeStep({
  id: "research-filter",
  label: "Tool: filter_sources",
  status: "complete",
  type: "tool",
  toolName: "filter_sources",
  output: "Kept 4 high-confidence sources.",
});
const RESEARCH_READ_RUNNING = makeStep({
  id: "research-read",
  label: "Tool: read_source",
  status: "running",
  type: "tool",
  toolName: "read_source",
  output: "Extracting findings from selected papers...",
});
const RESEARCH_READ_COMPLETE = makeStep({
  id: "research-read",
  label: "Tool: read_source",
  status: "complete",
  type: "tool",
  toolName: "read_source",
  output: "Summarized key claims and publication dates.",
});

const ANALYSIS_COMPARE_RUNNING = makeStep({
  id: "analysis-compare",
  label: "Tool: compare_claims",
  status: "running",
  type: "tool",
  toolName: "compare_claims",
  output: "Comparing overlap and contradictions across sources...",
});
const ANALYSIS_COMPARE_COMPLETE = makeStep({
  id: "analysis-compare",
  label: "Tool: compare_claims",
  status: "complete",
  type: "tool",
  toolName: "compare_claims",
  output: "Identified 2 consensus themes.",
});
const ANALYSIS_SCORE_RUNNING = makeStep({
  id: "analysis-score",
  label: "Tool: score_evidence",
  status: "running",
  type: "tool",
  toolName: "score_evidence",
  output: "Scoring confidence by recency and citation quality...",
});
const ANALYSIS_SCORE_COMPLETE = makeStep({
  id: "analysis-score",
  label: "Tool: score_evidence",
  status: "complete",
  type: "tool",
  toolName: "score_evidence",
  output: "Confidence scores assigned to each claim.",
});
const ANALYSIS_GAPS_RUNNING = makeStep({
  id: "analysis-gaps",
  label: "Tool: detect_gaps",
  status: "running",
  type: "tool",
  toolName: "detect_gaps",
  output: "Checking for missing context in the draft outline...",
});
const ANALYSIS_GAPS_COMPLETE = makeStep({
  id: "analysis-gaps",
  label: "Tool: detect_gaps",
  status: "complete",
  type: "tool",
  toolName: "detect_gaps",
  output: "No critical gaps detected.",
});

const PLAN_RUNNING = makeStep({
  id: "plan",
  label: "Planning response structure",
  status: "running",
  type: "default",
  output: "Outlining sections and ordering key takeaways...",
});
const PLAN_COMPLETE = makeStep({
  id: "plan",
  label: "Planning response structure",
  status: "complete",
  type: "default",
  output: "Outline finalized with 3 sections.",
});

const DRAFT_SECTION_1_RUNNING = makeStep({
  id: "draft-section-1",
  label: "Section 1: state of the field",
  status: "running",
  type: "write",
  output: "Writing section introduction...",
});
const DRAFT_SECTION_1_COMPLETE = makeStep({
  id: "draft-section-1",
  label: "Section 1: state of the field",
  status: "complete",
  type: "write",
  output: "Completed section 1 draft.",
});
const DRAFT_SECTION_2_RUNNING = makeStep({
  id: "draft-section-2",
  label: "Section 2: major breakthroughs",
  status: "running",
  type: "write",
  output: "Writing core breakthroughs and caveats...",
});
const DRAFT_SECTION_2_COMPLETE = makeStep({
  id: "draft-section-2",
  label: "Section 2: major breakthroughs",
  status: "complete",
  type: "write",
  output: "Completed section 2 draft.",
});
const DRAFT_POLISH_RUNNING = makeStep({
  id: "draft-polish",
  label: "Polishing + citation pass",
  status: "running",
  type: "write",
  output: "Tightening language and attaching source references...",
});
const DRAFT_POLISH_COMPLETE = makeStep({
  id: "draft-polish",
  label: "Polishing + citation pass",
  status: "complete",
  type: "write",
  output: "Draft complete.",
  detail: "Ready to present final answer with source-backed claims.",
});

const QA_RUNNING = makeStep({
  id: "quality-check",
  label: "Final quality check",
  status: "running",
  type: "default",
  output: "Verifying source attributions and consistency...",
});
const QA_COMPLETE = makeStep({
  id: "quality-check",
  label: "Final quality check",
  status: "complete",
  type: "default",
  output: "Checks passed.",
});

const STREAM_FRAMES: TraceNode[][] = [
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "running",
      children: [RESEARCH_SEARCH_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "running",
      children: [RESEARCH_SEARCH_COMPLETE, RESEARCH_FILTER_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "running",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_RUNNING,
      ],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "running",
      children: [ANALYSIS_COMPARE_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "running",
      children: [ANALYSIS_COMPARE_COMPLETE, ANALYSIS_SCORE_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "running",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_RUNNING,
      ],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_RUNNING,
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_COMPLETE,
    makeGroup({
      id: "draft",
      label: "Drafting answer",
      status: "running",
      children: [DRAFT_SECTION_1_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_COMPLETE,
    makeGroup({
      id: "draft",
      label: "Drafting answer",
      status: "running",
      children: [DRAFT_SECTION_1_COMPLETE, DRAFT_SECTION_2_RUNNING],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_COMPLETE,
    makeGroup({
      id: "draft",
      label: "Drafting answer",
      status: "running",
      children: [
        DRAFT_SECTION_1_COMPLETE,
        DRAFT_SECTION_2_COMPLETE,
        DRAFT_POLISH_RUNNING,
      ],
    }),
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_COMPLETE,
    makeGroup({
      id: "draft",
      label: "Drafting answer",
      status: "complete",
      children: [
        DRAFT_SECTION_1_COMPLETE,
        DRAFT_SECTION_2_COMPLETE,
        DRAFT_POLISH_COMPLETE,
      ],
    }),
    QA_RUNNING,
  ],
  [
    makeGroup({
      id: "research",
      label: "Researching sources",
      status: "complete",
      children: [
        RESEARCH_SEARCH_COMPLETE,
        RESEARCH_FILTER_COMPLETE,
        RESEARCH_READ_COMPLETE,
      ],
    }),
    makeGroup({
      id: "analysis",
      label: "Cross-checking claims",
      status: "complete",
      children: [
        ANALYSIS_COMPARE_COMPLETE,
        ANALYSIS_SCORE_COMPLETE,
        ANALYSIS_GAPS_COMPLETE,
      ],
    }),
    PLAN_COMPLETE,
    makeGroup({
      id: "draft",
      label: "Drafting answer",
      status: "complete",
      children: [
        DRAFT_SECTION_1_COMPLETE,
        DRAFT_SECTION_2_COMPLETE,
        DRAFT_POLISH_COMPLETE,
      ],
    }),
    QA_COMPLETE,
  ],
];

// Fully-localized content for the (finished) localization demo: a past-tense
// trigger title plus translated step labels. The trigger summary itself is
// produced by the `traceSummary` strings seam — see ChainOfThoughtLocalization.
const LOCALIZED_DEMO: Record<
  Lang,
  {
    title: string;
    steps: { id: string; header: string; body: string; type: StepType }[];
  }
> = {
  en: {
    title: "Reasoned",
    steps: [
      {
        id: "search",
        header: "Searched the web",
        body: "6 sources found",
        type: "search",
      },
      {
        id: "review",
        header: "Reviewed the sources",
        body: "Summarized 4 papers",
        type: "tool",
      },
      {
        id: "draft",
        header: "Drafted the answer",
        body: "3 sections",
        type: "write",
      },
    ],
  },
  es: {
    title: "Razonado",
    steps: [
      {
        id: "search",
        header: "Buscó en la web",
        body: "6 fuentes encontradas",
        type: "search",
      },
      {
        id: "review",
        header: "Revisó las fuentes",
        body: "Resumió 4 artículos",
        type: "tool",
      },
      {
        id: "draft",
        header: "Redactó la respuesta",
        body: "3 secciones",
        type: "write",
      },
    ],
  },
  fr: {
    title: "Raisonné",
    steps: [
      {
        id: "search",
        header: "Recherche sur le web",
        body: "6 sources trouvées",
        type: "search",
      },
      {
        id: "review",
        header: "Sources examinées",
        body: "4 articles résumés",
        type: "tool",
      },
      {
        id: "draft",
        header: "Réponse rédigée",
        body: "3 sections",
        type: "write",
      },
    ],
  },
};

// A nested, grouped trace that exercises groups, a subagent, and 2-level depth.
const STRUCTURED_TRACE: TraceNode[] = [
  makeGroup({
    id: "research",
    label: "Research",
    status: "complete",
    children: [
      makeStep({
        id: "r-search",
        label: "Keyword search",
        status: "complete",
        type: "search",
        toolName: "search_web",
        output: "Found 12 candidates.",
      }),
      makeStep({
        id: "r-web",
        label: "Browse top results",
        status: "complete",
        type: "web_search",
        toolName: "open_url",
        output: "Opened 4 pages.",
      }),
      makeGroup({
        id: "r-deep",
        label: "Deep dive",
        status: "complete",
        children: [
          makeStep({
            id: "r-image",
            label: "Inspect figures",
            status: "complete",
            type: "image",
            output: "Reviewed 3 charts.",
          }),
          makeStep({
            id: "r-text",
            label: "Read documentation",
            status: "complete",
            type: "text",
            output: "Captured key passages.",
          }),
        ],
      }),
    ],
  }),
  makeGroup({
    id: "compute",
    label: "Compute",
    status: "complete",
    children: [
      makeStep({
        id: "c-code",
        label: "Run analysis",
        status: "complete",
        type: "code",
        toolName: "python",
        output: "Executed notebook.",
      }),
      makeStep({
        id: "c-merge",
        label: "Merge datasets",
        status: "complete",
        type: "merge",
        output: "Joined 2 tables.",
      }),
      makeStep({
        id: "c-tool",
        label: "Score evidence",
        status: "complete",
        type: "tool",
        toolName: "score_evidence",
        output: "Assigned confidence.",
      }),
    ],
  }),
  makeGroup({
    id: "fact-check",
    label: "Subagent: fact-checker",
    status: "complete",
    variant: "subagent",
    children: [
      makeStep({
        id: "fc-verify",
        label: "Verify claims",
        status: "complete",
        type: "search",
        toolName: "verify_claim",
        output: "Checked 5 claims.",
      }),
      makeStep({
        id: "fc-flag",
        label: "Flag uncertainties",
        status: "complete",
        type: "default",
        output: "No contradictions found.",
      }),
    ],
  }),
  makeStep({
    id: "answer",
    label: "Write answer",
    status: "complete",
    type: "write",
    detail: "Final answer assembled with source-backed citations.",
    output: "Draft complete.",
  }),
];

// Two terminal traces that differ only in the final step's status, so a single
// toggle flips the panel between a completed and a stopped (cancelled) run.
const makeTerminalTrace = (final: TraceStatus): TraceNode[] => [
  makeGroup({
    id: "t-research",
    label: "Researching sources",
    status: "complete",
    children: [
      makeStep({
        id: "t-search",
        label: "Tool: search_web",
        status: "complete",
        type: "search",
        toolName: "search_web",
        output: "Found 6 sources.",
      }),
      makeStep({
        id: "t-read",
        label: "Tool: read_source",
        status: "complete",
        type: "tool",
        toolName: "read_source",
        output: "Summarized 4 papers.",
      }),
    ],
  }),
  makeStep({
    id: "t-draft",
    label: "Drafting answer",
    status: final,
    type: "write",
    output:
      final === "incomplete"
        ? "Run cancelled before the draft finished."
        : "Draft complete.",
  }),
];

const COMPLETED_TRACE = makeTerminalTrace("complete");
const STOPPED_TRACE = makeTerminalTrace("incomplete");

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

type Lang = "en" | "es" | "fr";

const LOCALE_OPTIONS: { label: string; value: Lang }[] = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
];

const LOCALE_STRINGS: Record<Lang, Partial<ChainOfThoughtStrings>> = {
  en: {},
  es: {
    reasoning: "Razonamiento",
    working: "Trabajando...",
    done: (s) => (s != null ? `Hecho en ${s}s` : "Hecho"),
    stopped: (s) => (s != null ? `Detenido tras ${s}s` : "Detenido"),
    traceSummary: ({
      searchSteps,
      toolSteps,
      totalSteps,
      incomplete,
      durationSec,
    }) => {
      const base = incomplete
        ? `Detenido tras ${totalSteps} ${totalSteps === 1 ? "paso" : "pasos"}`
        : searchSteps > 0
          ? `Consultó ${searchSteps} ${searchSteps === 1 ? "fuente" : "fuentes"}`
          : toolSteps > 0
            ? `Ejecutó ${toolSteps} ${toolSteps === 1 ? "herramienta" : "herramientas"}`
            : `Completó ${totalSteps} ${totalSteps === 1 ? "paso" : "pasos"}`;
      return durationSec != null ? `${base} (${durationSec}s)` : base;
    },
  },
  fr: {
    reasoning: "Raisonnement",
    working: "En cours...",
    done: (s) => (s != null ? `Terminé en ${s}s` : "Terminé"),
    stopped: (s) => (s != null ? `Arrêté après ${s}s` : "Arrêté"),
    traceSummary: ({
      searchSteps,
      toolSteps,
      totalSteps,
      incomplete,
      durationSec,
    }) => {
      const base = incomplete
        ? `Arrêté après ${totalSteps} ${totalSteps === 1 ? "étape" : "étapes"}`
        : searchSteps > 0
          ? `Consulté ${searchSteps} ${searchSteps === 1 ? "source" : "sources"}`
          : toolSteps > 0
            ? `Exécuté ${toolSteps} ${toolSteps === 1 ? "outil" : "outils"}`
            : `Terminé ${totalSteps} ${totalSteps === 1 ? "étape" : "étapes"}`;
      return durationSec != null ? `${base} (${durationSec}s)` : base;
    },
  },
};

// ---------------------------------------------------------------------------
// Shared controls
// ---------------------------------------------------------------------------

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-muted/60 inline-flex items-center gap-0.5 rounded-lg p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          data-active={value === option.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            "text-muted-foreground hover:text-foreground",
            "data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleChip({
  label,
  pressed,
  onPressedChange,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "rounded-lg border px-2.5 py-1 font-mono text-xs font-medium transition-colors",
        pressed
          ? "border-foreground/20 bg-foreground/5 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Playground (hero) — manipulate real props on a streaming TraceDisclosure
// ---------------------------------------------------------------------------

type Variant = "ghost" | "outline" | "muted";

const VARIANT_OPTIONS: { label: string; value: Variant }[] = [
  { label: "Ghost", value: "ghost" },
  { label: "Outline", value: "outline" },
  { label: "Muted", value: "muted" },
];

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: "0.5×", value: 1800 },
  { label: "1×", value: 900 },
  { label: "2×", value: 450 },
];

const PLAYGROUND_CODE = `<ChainOfThought.TraceDisclosure
  trace={trace}                         // a TraceNode[] you shape yourself
  constrainHeight={constrainHeight}     // cap the height + show "jump to latest"
  autoCollapseOnComplete={autoCollapse} // collapse to the summary when done
  rootProps={{ variant }}               // "ghost" | "outline" | "muted"
/>`;

type PlaygroundState = {
  variant: Variant;
  constrainHeight: boolean;
  autoCollapse: boolean;
  speedMs: number;
  started: boolean;
  isStreaming: boolean;
  frameIndex: number;
};

type PlaygroundAction =
  | { type: "variant"; value: Variant }
  | { type: "constrainHeight"; value: boolean }
  | { type: "autoCollapse"; value: boolean }
  | { type: "speed"; value: number }
  | { type: "start" }
  | { type: "reset" }
  | { type: "tick" };

const initialPlaygroundState: PlaygroundState = {
  variant: "ghost",
  constrainHeight: false,
  autoCollapse: false,
  speedMs: 900,
  started: false,
  isStreaming: false,
  frameIndex: 0,
};

function playgroundReducer(
  state: PlaygroundState,
  action: PlaygroundAction,
): PlaygroundState {
  switch (action.type) {
    case "variant":
      return { ...state, variant: action.value };
    case "constrainHeight":
      return { ...state, constrainHeight: action.value };
    case "autoCollapse":
      return { ...state, autoCollapse: action.value };
    case "speed":
      return { ...state, speedMs: action.value };
    case "start":
      return {
        ...state,
        started: true,
        isStreaming: true,
        frameIndex: 0,
      };
    case "reset":
      return {
        ...state,
        started: false,
        isStreaming: false,
        frameIndex: 0,
      };
    case "tick": {
      const nextFrameIndex = state.frameIndex + 1;
      if (nextFrameIndex >= STREAM_FRAMES.length) {
        return { ...state, isStreaming: false };
      }
      return { ...state, frameIndex: nextFrameIndex };
    }
  }
}

function ChainOfThoughtPlayground() {
  const [state, dispatch] = useReducer(
    playgroundReducer,
    initialPlaygroundState,
  );
  const {
    variant,
    constrainHeight,
    autoCollapse,
    speedMs,
    started,
    isStreaming,
    frameIndex,
  } = state;

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      dispatch({ type: "tick" });
    }, speedMs);

    return () => clearInterval(interval);
  }, [isStreaming, speedMs]);

  const trace = STREAM_FRAMES[frameIndex] ?? [];
  const rootProps = useMemo(() => ({ variant }), [variant]);

  const handleStart = () => dispatch({ type: "start" });

  const handleReset = () => dispatch({ type: "reset" });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-2.5">
        <ControlGroup label="Variant">
          <Segmented
            options={VARIANT_OPTIONS}
            value={variant}
            onChange={(value) => dispatch({ type: "variant", value })}
          />
        </ControlGroup>
        <ControlGroup label="Speed">
          <Segmented
            options={SPEED_OPTIONS}
            value={speedMs}
            onChange={(value) => dispatch({ type: "speed", value })}
            disabled={isStreaming}
          />
        </ControlGroup>
        <div className="flex items-center gap-1.5">
          <ToggleChip
            label="constrainHeight"
            pressed={constrainHeight}
            onPressedChange={(value) =>
              dispatch({ type: "constrainHeight", value })
            }
          />
          <ToggleChip
            label="autoCollapse"
            pressed={autoCollapse}
            onPressedChange={(value) =>
              dispatch({ type: "autoCollapse", value })
            }
          />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleStart}
            disabled={isStreaming}
            className="gap-1.5"
          >
            <PlayIcon className="size-3" />
            {isStreaming ? "Streaming..." : started ? "Replay" : "Start"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RotateCcwIcon className="size-3" />
            Reset
          </Button>
        </div>
      </div>

      {started ? (
        <ChainOfThought.TraceDisclosure
          trace={trace}
          constrainHeight={constrainHeight}
          autoCollapseOnComplete={autoCollapse}
          rootProps={rootProps}
        />
      ) : (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Adjust the controls, then press{" "}
          <span className="text-foreground font-medium">Start</span> to replay a
          mock chain of thought. The variant and toggles also apply live once it
          has streamed.
        </div>
      )}
    </div>
  );
}

export function ChainOfThoughtSample() {
  return (
    <SampleFrame className="flex h-auto flex-col p-4" code={PLAYGROUND_CODE}>
      <ChainOfThoughtPlayground />
    </SampleFrame>
  );
}

// ---------------------------------------------------------------------------
// 2. Variant gallery — composable primitives, open so the chrome is visible
// ---------------------------------------------------------------------------

function VariantRow({ label, variant }: { label: string; variant: Variant }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <ChainOfThought.Root variant={variant} defaultOpen>
        <ChainOfThought.Trigger
          phase="complete"
          activityLabel="Researched 2 sources"
        />
        <ChainOfThought.Content>
          <ChainOfThought.Timeline autoScroll={false}>
            <ChainOfThought.Step status="complete" type="search">
              <ChainOfThought.StepHeader>
                Searched the web
              </ChainOfThought.StepHeader>
              <ChainOfThought.StepBody>6 sources found</ChainOfThought.StepBody>
            </ChainOfThought.Step>
            <ChainOfThought.Step status="complete" type="write">
              <ChainOfThought.StepHeader>
                Drafted the answer
              </ChainOfThought.StepHeader>
              <ChainOfThought.StepBody>3 sections</ChainOfThought.StepBody>
            </ChainOfThought.Step>
          </ChainOfThought.Timeline>
        </ChainOfThought.Content>
      </ChainOfThought.Root>
    </div>
  );
}

export function ChainOfThoughtVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 p-4">
      <VariantRow label="Ghost (default)" variant="ghost" />
      <VariantRow label="Outline" variant="outline" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}

// ---------------------------------------------------------------------------
// 3. Structured trace — groups, a subagent, nested depth, custom summary
// ---------------------------------------------------------------------------

const STRUCTURED_CODE = `import {
  ChainOfThought,
  type TraceNode,
} from "@/components/assistant-ui/chain-of-thought";

const trace: TraceNode[] = [
  {
    kind: "group",
    id: "research",
    label: "Research",
    status: "complete",
    children: [
      { kind: "step", id: "s1", label: "Keyword search",
        type: "search", toolName: "search_web", status: "complete" },
      { kind: "group", id: "deep", label: "Deep dive", status: "complete",
        children: [ /* nested steps render at depth 1 */ ] },
    ],
  },
  {
    kind: "group",
    id: "fact-check",
    label: "Subagent: fact-checker",
    variant: "subagent",            // renders the subagent (bot) chrome
    status: "complete",
    children: [ /* ... */ ],
  },
];

<ChainOfThought.Trace
  trace={trace}
  maxDepth={2}        // how deep groups can expand (default 2)
  allowGroupExpand    // make group rows expandable (default true)
/>;`;

export function ChainOfThoughtStructuredSample() {
  return (
    <SampleFrame className="h-auto p-4" code={STRUCTURED_CODE}>
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          A pre-shaped trace with groups, a subagent, and nested steps. Click a
          group row to expand it.
        </p>
        <ChainOfThought.Trace trace={STRUCTURED_TRACE} maxDepth={2} />
      </div>
    </SampleFrame>
  );
}

// ---------------------------------------------------------------------------
// 4. Localization — swap the strings seam via context, live
// ---------------------------------------------------------------------------

const LOCALIZATION_CODE = `import {
  ChainOfThought,
} from "@/components/assistant-ui/chain-of-thought";
import {
  ChainOfThoughtStringsContext,
  mergeChainOfThoughtStrings,
} from "@/components/assistant-ui/chain-of-thought/strings";

// Override any subset of the seam; unspecified keys fall back to English.
const strings = mergeChainOfThoughtStrings({
  reasoning: "Razonamiento",
  working: "Trabajando...",
  traceSummary: ({ searchSteps }) => \`Consultó \${searchSteps} fuentes\`,
});

// Wrap the tree so everything that reads the seam localizes:
<ChainOfThoughtStringsContext.Provider value={strings}>
  <ChainOfThought.Root variant="outline" defaultOpen>
    {/* A finished chain reads better in past tense. \`reasoning\` is one
        tense-neutral label, so switch tense in renderTriggerContent. */}
    <ChainOfThought.Trigger
      phase="complete"
      renderTriggerContent={() => (
        <span>
          Razonado · {strings.traceSummary({ searchSteps: 1, toolSteps: 0, totalSteps: 3, incomplete: false })}
        </span>
      )}
    />
    <ChainOfThought.Content>
      <ChainOfThought.Timeline autoScroll={false}>
        <ChainOfThought.Step status="complete" type="search">
          <ChainOfThought.StepHeader>Buscó en la web</ChainOfThought.StepHeader>
          <ChainOfThought.StepBody>6 fuentes</ChainOfThought.StepBody>
        </ChainOfThought.Step>
        {/* ...more steps */}
      </ChainOfThought.Timeline>
    </ChainOfThought.Content>
  </ChainOfThought.Root>
</ChainOfThoughtStringsContext.Provider>;

// The runtime <ChainOfThought> takes a \`strings\` prop directly:
<ChainOfThought strings={{ reasoning: "Razonamiento" }} />;`;

function ChainOfThoughtLocalization() {
  const [lang, setLang] = useState<Lang>("es");
  const strings = useMemo(
    () => mergeChainOfThoughtStrings(LOCALE_STRINGS[lang]),
    [lang],
  );
  const demo = LOCALIZED_DEMO[lang];
  // The trigger summary is still produced by the `traceSummary` strings seam.
  const summary = strings.traceSummary({
    totalSteps: 3,
    searchSteps: 1,
    toolSteps: 1,
    incomplete: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <ControlGroup label="Language">
        <Segmented options={LOCALE_OPTIONS} value={lang} onChange={setLang} />
      </ControlGroup>
      {/* Composed primitives (rather than TraceDisclosure) so the finished
          panel can stay `defaultOpen` and show a past-tense trigger title.
          `renderTriggerContent` renders plain text, so a language switch swaps
          every label in place — no crossfade. */}
      <ChainOfThoughtStringsContext.Provider value={strings}>
        <ChainOfThought.Root variant="outline" defaultOpen>
          <ChainOfThought.Trigger
            phase="complete"
            renderTriggerContent={() => (
              <span className="flex w-full min-w-0 items-center gap-2">
                <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=closed]/trigger:-rotate-90" />
                <span className="text-foreground shrink-0 font-medium">
                  {demo.title}
                </span>
                <span className="text-muted-foreground min-w-0 truncate">
                  {summary}
                </span>
              </span>
            )}
          />
          <ChainOfThought.Content>
            <ChainOfThought.Timeline autoScroll={false}>
              {demo.steps.map((step) => (
                <ChainOfThought.Step
                  key={step.id}
                  status="complete"
                  type={step.type}
                >
                  <ChainOfThought.StepHeader>
                    {step.header}
                  </ChainOfThought.StepHeader>
                  <ChainOfThought.StepBody>{step.body}</ChainOfThought.StepBody>
                </ChainOfThought.Step>
              ))}
            </ChainOfThought.Timeline>
          </ChainOfThought.Content>
        </ChainOfThought.Root>
      </ChainOfThoughtStringsContext.Provider>
      <p className="text-muted-foreground text-xs">
        Every label updates with the language. The trigger summary is built by
        the <code className="font-mono">traceSummary</code> seam; the finished
        panel uses a past-tense title via{" "}
        <code className="font-mono">renderTriggerContent</code>, since{" "}
        <code className="font-mono">reasoning</code> is one tense-neutral label
        the trigger shows in every phase.
      </p>
    </div>
  );
}

export function ChainOfThoughtLocalizationSample() {
  return (
    <SampleFrame className="flex h-auto flex-col p-4" code={LOCALIZATION_CODE}>
      <ChainOfThoughtLocalization />
    </SampleFrame>
  );
}

// ---------------------------------------------------------------------------
// 5. Terminal states — completed vs. stopped (incomplete)
// ---------------------------------------------------------------------------

type Outcome = "complete" | "stopped";

const OUTCOME_OPTIONS: { label: string; value: Outcome }[] = [
  { label: "Completed", value: "complete" },
  { label: "Stopped", value: "stopped" },
];

function ChainOfThoughtTerminalStates() {
  const [outcome, setOutcome] = useState<Outcome>("stopped");
  const trace = outcome === "complete" ? COMPLETED_TRACE : STOPPED_TRACE;

  return (
    <div className="flex flex-col gap-4">
      <ControlGroup label="Outcome">
        <Segmented
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={setOutcome}
        />
      </ControlGroup>
      <ChainOfThought.Trace trace={trace} />
      <p className="text-muted-foreground text-xs">
        A step (or group) with{" "}
        <code className="font-mono">status: &quot;incomplete&quot;</code>{" "}
        renders the error indicator, and the collapsed summary reads
        &quot;Stopped after N steps&quot;.
      </p>
    </div>
  );
}

export function ChainOfThoughtTerminalStatesSample() {
  return (
    <SampleFrame className="flex h-auto flex-col p-4">
      <ChainOfThoughtTerminalStates />
    </SampleFrame>
  );
}
