import { useState } from "react";
import {
  FileSearchIcon,
  PenLineIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import type {
  DataMessagePartComponent,
  ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { JSONGenerativeUI } from "@assistant-ui/generative-ui/react";
import { AgentHandoff } from "@assistant-ui/ui/components/assistant-ui/elements/agent-handoff.tsx";
import { ArtifactCard } from "@assistant-ui/ui/components/assistant-ui/elements/artifact-card.tsx";
import { CheckpointHistory } from "@assistant-ui/ui/components/assistant-ui/elements/checkpoint-history.tsx";
import { ComputerUse } from "@assistant-ui/ui/components/assistant-ui/elements/computer-use.tsx";
import { ConfidenceMarker } from "@assistant-ui/ui/components/assistant-ui/elements/confidence-marker.tsx";
import { ContextBreakdown } from "@assistant-ui/ui/components/assistant-ui/elements/context-breakdown.tsx";
import { CostMeter } from "@assistant-ui/ui/components/assistant-ui/elements/cost-meter.tsx";
import { styledGenerativeUILibrary } from "@assistant-ui/ui/components/assistant-ui/elements/generative-ui.tsx";
import { GuardrailNotice } from "@assistant-ui/ui/components/assistant-ui/elements/guardrail-notice.tsx";
import { JobProgress } from "@assistant-ui/ui/components/assistant-ui/elements/job-progress.tsx";
import { MemoryChips } from "@assistant-ui/ui/components/assistant-ui/elements/memory-chips.tsx";
import { SubagentList } from "@assistant-ui/ui/components/assistant-ui/elements/subagent-list.tsx";
import { TaskCard } from "@assistant-ui/ui/components/assistant-ui/elements/task-card.aui.tsx";
import { TodoList } from "@assistant-ui/ui/components/assistant-ui/elements/todo-list.tsx";
import { ToolCall } from "@assistant-ui/ui/components/assistant-ui/elements/tool-call.tsx";
import { ToolError } from "@assistant-ui/ui/components/assistant-ui/elements/tool-error.tsx";
import { ToolTimeline } from "@assistant-ui/ui/components/assistant-ui/elements/tool-timeline.tsx";
import { TraceWaterfall } from "@assistant-ui/ui/components/assistant-ui/elements/trace-waterfall.tsx";
import {
  ARTIFACT_DATA,
  CHECKPOINTS_DATA,
  CLAIMS_DATA,
  COMPUTER_TOOL,
  CONTEXT_DATA,
  COST_DATA,
  DELEGATE_TOOL,
  FETCH_ISSUE_TOOL,
  GUARDRAIL_DATA,
  HANDOFF_DATA,
  MEMORY_DATA,
  PRESENT_TOOL,
  RUN_JOB_TOOL,
  SUBAGENTS_DATA,
  TIMELINE_DATA,
  TODOS_DATA,
  TRACE_DATA,
  WEB_FETCH_TOOL,
  type ArtifactData,
  type CheckpointsData,
  type ClaimsData,
  type ComputerArgs,
  type ContextData,
  type CostData,
  type DelegateArgs,
  type FetchIssueArgs,
  type GuardrailData,
  type HandoffData,
  type MemoryData,
  type RunJobArgs,
  type RunJobResult,
  type SubagentsData,
  type TimelineData,
  type TodosData,
  type TraceData,
  type WebFetchArgs,
  type WebFetchResult,
} from "../../src/fixtures/rich/agent-run";
import { defineFixtureUI } from "../define-fixture-ui";

const CARD = "my-2";

const WebFetch: ToolCallMessagePartComponent<WebFetchArgs, WebFetchResult> = ({
  args,
  result,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <ToolCall
      className={CARD}
      label="Fetched the page"
      activeLabel="Fetching the page"
      query={args.url ?? ""}
      request={JSON.stringify(args)}
      result={result?.summary ?? ""}
      running={result === undefined}
      open={open}
      onOpenChange={setOpen}
    />
  );
};

const FetchIssue: ToolCallMessagePartComponent<FetchIssueArgs, unknown> = ({
  args,
  result,
}) => (
  <ToolError
    className={CARD}
    name="fetch_issue"
    target={args.url ?? ""}
    message={typeof result === "string" ? result : "Failed"}
    attempt={args.attempt ?? 1}
    maxAttempts={args.maxAttempts ?? 1}
    retrying={false}
  />
);

const Delegate: ToolCallMessagePartComponent<DelegateArgs, unknown> = (
  props,
) => <TaskCard className={CARD} part={props} />;

const JOB_STAGES = [
  { name: "install", weight: 3 },
  { name: "build", weight: 3 },
  { name: "unit", weight: 2 },
  { name: "e2e", weight: 2 },
];

const RunJob: ToolCallMessagePartComponent<RunJobArgs, RunJobResult> = ({
  args,
  result,
}) => (
  <JobProgress
    className={CARD}
    title={args.title ?? "Job"}
    stages={JOB_STAGES}
    stageIndex={result ? JOB_STAGES.length : 1}
    stageProgress={result ? 1 : 0.5}
    eta={result ? "done" : "about 3 min"}
    {...(result && {
      outcome: { status: result.status, summary: result.summary },
      elapsedMs: result.elapsedMs,
    })}
  />
);

const Computer: ToolCallMessagePartComponent<ComputerArgs, unknown> = ({
  args,
  result,
}) => {
  const steps = args.steps ?? [];
  if (steps.length === 0) return null;
  return (
    <ComputerUse
      className={CARD}
      url={args.url ?? ""}
      steps={steps}
      activeIndex={result === undefined ? 0 : steps.length - 1}
    >
      <div className="flex flex-col gap-2 p-4">
        <span className="bg-foreground/[0.07] h-3 w-28 rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-full rounded" />
        <span className="bg-foreground/[0.05] h-2.5 w-4/5 rounded" />
        <span className="bg-foreground/[0.07] mt-2 h-3 w-20 rounded" />
      </div>
    </ComputerUse>
  );
};

const TIMELINE_ICONS = {
  think: SparklesIcon,
  read: FileSearchIcon,
  run: TerminalIcon,
  edit: PenLineIcon,
};

const Timeline: DataMessagePartComponent<TimelineData> = ({ data }) => {
  const [open, setOpen] = useState(true);
  return (
    <ToolTimeline
      className={CARD}
      steps={data.steps.map((step: TimelineData["steps"][number]) => ({
        verb: step.verb,
        chip: step.chip,
        icon: TIMELINE_ICONS[step.kind],
      }))}
      visibleSteps={data.steps.length}
      streaming={false}
      open={open}
      onOpenChange={setOpen}
      restingLabel={data.label}
      activeLabel={data.label}
      stats={data.stats}
    />
  );
};

const Subagents: DataMessagePartComponent<SubagentsData> = ({ data }) => (
  <SubagentList
    className={CARD}
    agents={data.agents}
    completedCount={data.completedCount}
    progress={data.progress}
    showSummary={false}
    summaryAgent={{ name: "Summarize findings", model: "haiku" }}
  />
);

const Handoff: DataMessagePartComponent<HandoffData> = ({ data }) => (
  <AgentHandoff className={CARD} {...data} settled />
);

const Todos: DataMessagePartComponent<TodosData> = ({ data }) => (
  <TodoList className={CARD} items={data.items} revision={data.revision} />
);

const Trace: DataMessagePartComponent<TraceData> = ({ data }) => (
  <TraceWaterfall
    className={CARD}
    spans={data.spans}
    totalMs={data.totalMs}
    visibleCount={data.spans.length}
  />
);

const Checkpoints: DataMessagePartComponent<CheckpointsData> = ({ data }) => {
  const [currentId, setCurrentId] = useState(data.currentId);
  return (
    <CheckpointHistory
      className={CARD}
      checkpoints={data.checkpoints}
      currentId={currentId}
      onRestore={setCurrentId}
    />
  );
};

const Memory: DataMessagePartComponent<MemoryData> = ({ data }) => (
  <MemoryChips className={CARD} chips={data.chips} />
);

const Claims: DataMessagePartComponent<ClaimsData> = ({ data }) => {
  const [hoveredId, setHoveredId] = useState("");
  return (
    <ConfidenceMarker
      className={CARD}
      claims={data.claims}
      hoveredId={hoveredId}
      onHover={setHoveredId}
    />
  );
};

const Artifact: DataMessagePartComponent<ArtifactData> = ({ data }) => (
  <ArtifactCard className={CARD} {...data} />
);

const Cost: DataMessagePartComponent<CostData> = ({ data }) => (
  <CostMeter className={CARD} {...data} />
);

const CONTEXT_TINTS = [
  "bg-foreground/45",
  "bg-foreground/25",
  "bg-blue-500/60 dark:bg-blue-400/60",
  "bg-blue-500 dark:bg-blue-400",
];

const Context: DataMessagePartComponent<ContextData> = ({ data }) => (
  <ContextBreakdown
    className={CARD}
    limit={data.limit}
    segments={data.segments.map(
      (segment: ContextData["segments"][number], index: number) => ({
        ...segment,
        tint: CONTEXT_TINTS[index % CONTEXT_TINTS.length]!,
      }),
    )}
  />
);

const Guardrail: DataMessagePartComponent<GuardrailData> = ({ data }) => (
  <GuardrailNotice className={CARD} {...data} />
);

const generative = new JSONGenerativeUI({ library: styledGenerativeUILibrary });

export default defineFixtureUI({
  tools: {
    // Standalone keeps each card out of the collapsed tool-call group.
    [WEB_FETCH_TOOL]: {
      type: "backend",
      display: "standalone",
      render: WebFetch,
    },
    [FETCH_ISSUE_TOOL]: {
      type: "backend",
      display: "standalone",
      render: FetchIssue,
    },
    [DELEGATE_TOOL]: {
      type: "backend",
      display: "standalone",
      render: Delegate,
    },
    [RUN_JOB_TOOL]: { type: "backend", display: "standalone", render: RunJob },
    [COMPUTER_TOOL]: {
      type: "backend",
      display: "standalone",
      render: Computer,
    },
    [PRESENT_TOOL]: generative.present({ display: "standalone" }),
  },
  dataUIs: [
    { name: TIMELINE_DATA, render: Timeline },
    { name: SUBAGENTS_DATA, render: Subagents },
    { name: HANDOFF_DATA, render: Handoff },
    { name: TODOS_DATA, render: Todos },
    { name: TRACE_DATA, render: Trace },
    { name: CHECKPOINTS_DATA, render: Checkpoints },
    { name: MEMORY_DATA, render: Memory },
    { name: CLAIMS_DATA, render: Claims },
    { name: ARTIFACT_DATA, render: Artifact },
    { name: COST_DATA, render: Cost },
    { name: CONTEXT_DATA, render: Context },
    { name: GUARDRAIL_DATA, render: Guardrail },
  ],
});
