"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayIcon, RotateCcwIcon } from "lucide-react";
import {
  ChainOfThought,
  type TraceNode,
  type TraceStatus,
  type StepType,
} from "@/components/assistant-ui/chain-of-thought";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";

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
}: {
  id: string;
  label: string;
  status: TraceStatus;
  children: TraceNode[];
}): TraceNode => ({
  kind: "group",
  id,
  label,
  status,
  children,
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

function ChainOfThoughtStreamingDemo() {
  const [started, setStarted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next >= STREAM_FRAMES.length) {
          setIsStreaming(false);
          return current;
        }
        return next;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const trace = useMemo(() => STREAM_FRAMES[frameIndex] ?? [], [frameIndex]);

  const handleStart = () => {
    setStarted(true);
    setFrameIndex(0);
    setIsStreaming(true);
  };

  const handleReset = () => {
    setStarted(false);
    setFrameIndex(0);
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Streaming..." : "Start Streaming"}
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

      {started ? (
        <ChainOfThought.TraceDisclosure
          trace={trace}
          autoCollapseOnComplete={false}
        />
      ) : (
        <div className="rounded-md border border-dashed p-4 text-muted-foreground text-sm">
          Click &quot;Start Streaming&quot; to simulate a mock chain of thought.
        </div>
      )}
    </div>
  );
}

export function ChainOfThoughtSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ChainOfThoughtStreamingDemo />
    </SampleFrame>
  );
}
