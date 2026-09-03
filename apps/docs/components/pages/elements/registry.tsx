import type { ComponentType } from "react";
import {
  GenerationLoaderDemo,
  GenerationLoaderRoundedDemo,
  GenerationLoaderSquaresDemo,
} from "@/components/demo/elements/loading-state";
import { DataTableDemo } from "@/components/demo/elements/data-table";
import { RecommendationCardDemo } from "@/components/demo/elements/recommendation-card";
import { NumberTickerDemo } from "@/components/demo/elements/number-ticker";
import { ChatPanelDemo } from "@/components/demo/elements/chat-panel";
import { ThinkingIndicatorDemo } from "@/components/demo/elements/thinking-indicator";
import { ReasoningPanelDemo } from "@/components/demo/elements/reasoning-panel";
import { StreamingTextDemo } from "@/components/demo/elements/streaming-text";
import {
  TypingIndicatorBareDemo,
  TypingIndicatorDemo,
} from "@/components/demo/elements/typing-indicator";
import {
  MessagePairDemo,
  MessagePairFlatDemo,
} from "@/components/demo/elements/message-pair";
import { MessageBranchesDemo } from "@/components/demo/elements/message-branches";
import { MessageActionsDemo } from "@/components/demo/elements/message-actions";
import {
  SuggestionsDemo,
  SuggestionsListDemo,
} from "@/components/demo/elements/suggestions";
import { ErrorStateDemo } from "@/components/demo/elements/error-state";
import { ToolCallDemo } from "@/components/demo/elements/tool-call";
import { ToolTimelineDemo } from "@/components/demo/elements/tool-timeline";
import {
  TerminalBlockDemo,
  TerminalBlockInkDemo,
} from "@/components/demo/elements/terminal-block";
import { CodeDiffDemo } from "@/components/demo/elements/code-diff";
import { WebSearchDemo } from "@/components/demo/elements/web-search";
import { SourcesDemo } from "@/components/demo/elements/sources";
import { InlineCitationDemo } from "@/components/demo/elements/inline-citation";
import { ImageGenerationDemo } from "@/components/demo/elements/image-generation";
import { AgentPlanDemo } from "@/components/demo/elements/agent-plan";
import { SubagentListDemo } from "@/components/demo/elements/subagent-list";
import { AgentStatusDemo } from "@/components/demo/elements/agent-status";
import { ApprovalCardDemo } from "@/components/demo/elements/approval-card";
import { ArtifactCardDemo } from "@/components/demo/elements/artifact-card";
import { ComposerDemo } from "@/components/demo/elements/composer";
import { ComposerSlashDemo } from "@/components/demo/elements/composer-slash";
import { ComposerMentionsDemo } from "@/components/demo/elements/composer-mentions";
import { ComposerAttachmentsDemo } from "@/components/demo/elements/composer-attachments";
import { ComposerModelsDemo } from "@/components/demo/elements/composer-models";
import { ComposerVoiceDemo } from "@/components/demo/elements/composer-voice";
import { ComposerContextDemo } from "@/components/demo/elements/composer-context";
import { EmptyStateDemo } from "@/components/demo/elements/empty-state";
import { ThreadListDemo } from "@/components/demo/elements/thread-list";
import { ScrollAnchorDemo } from "@/components/demo/elements/scroll-anchor";
import { ConversationMapDemo } from "@/components/demo/elements/conversation-map";
import { TodoListDemo } from "@/components/demo/elements/todo-list";
import { MessageQueueDemo } from "@/components/demo/elements/message-queue";
import { MessageAttachmentDemo } from "@/components/demo/elements/message-attachment";
import { ReviewableDiffDemo } from "@/components/demo/elements/reviewable-diff";
import { FileTreeDemo } from "@/components/demo/elements/file-tree";
import { ElicitationFormDemo } from "@/components/demo/elements/elicitation-form";
import { RetrievalChunksDemo } from "@/components/demo/elements/retrieval-chunks";
import {
  ChartBarsDemo,
  ChartDemo,
  ChartLineDemo,
} from "@/components/demo/elements/chart";
import { TraceWaterfallDemo } from "@/components/demo/elements/trace-waterfall";
import { CanvasSplitDemo } from "@/components/demo/elements/canvas-split";
import { VoiceConversationDemo } from "@/components/demo/elements/voice-conversation";
import { ReadAloudDemo } from "@/components/demo/elements/read-aloud";
import { McpServerPanelDemo } from "@/components/demo/elements/mcp-server-panel";
import { FeedbackDialogDemo } from "@/components/demo/elements/feedback-dialog";
import { QuoteReplyDemo } from "@/components/demo/elements/quote-reply";
import { EditMessageDemo } from "@/components/demo/elements/edit-message";
import { ConnectionStateDemo } from "@/components/demo/elements/connection-state";
import { StoppedRunDemo } from "@/components/demo/elements/stopped-run";
import { AgentCardDemo } from "@/components/demo/elements/agent-card";
import { WebPreviewDemo } from "@/components/demo/elements/web-preview";
import { MessageTimingDemo } from "@/components/demo/elements/message-timing";
import { DraftRestoreDemo } from "@/components/demo/elements/draft-restore";
import { DiagramDemo } from "@/components/demo/elements/diagram";
import { FlowGraphDemo } from "@/components/demo/elements/flow-graph";
import { ActivityGraphDemo } from "@/components/demo/elements/activity-graph";
import { ToolGroupDemo } from "@/components/demo/elements/tool-group";
import { ContextBreakdownDemo } from "@/components/demo/elements/context-breakdown";
import { ModelPickerDemo } from "@/components/demo/elements/model-picker";
import { ReasoningEffortDemo } from "@/components/demo/elements/reasoning-effort";
import { GuardrailNoticeDemo } from "@/components/demo/elements/guardrail-notice";
import { DaySeparatorDemo } from "@/components/demo/elements/day-separator";
import { SpeakerIdentityDemo } from "@/components/demo/elements/speaker-identity";
import { RegenerateMenuDemo } from "@/components/demo/elements/regenerate-menu";
import { ConfidenceMarkerDemo } from "@/components/demo/elements/confidence-marker";
import { ToolErrorDemo } from "@/components/demo/elements/tool-error";
import { PermissionGrantDemo } from "@/components/demo/elements/permission-grant";
import { ComputerUseDemo } from "@/components/demo/elements/computer-use";
import { CodeRunnerDemo } from "@/components/demo/elements/code-runner";
import { DocumentReferenceDemo } from "@/components/demo/elements/document-reference";
import { MemoryChipsDemo } from "@/components/demo/elements/memory-chips";
import { ResearchReportDemo } from "@/components/demo/elements/research-report";
import { MapAnswerDemo } from "@/components/demo/elements/map-answer";
import { MathBlockDemo } from "@/components/demo/elements/math-block";
import { SpecSheetDemo } from "@/components/demo/elements/spec-sheet";
import { ComparisonCardDemo } from "@/components/demo/elements/comparison-card";
import { TimelineDemo } from "@/components/demo/elements/timeline";
import { JobProgressDemo } from "@/components/demo/elements/job-progress";
import { ScoreBreakdownDemo } from "@/components/demo/elements/score-breakdown";
import { CostMeterDemo } from "@/components/demo/elements/cost-meter";
import { QuotaBannerDemo } from "@/components/demo/elements/quota-banner";
import { AgentHandoffDemo } from "@/components/demo/elements/agent-handoff";
import { BackgroundInboxDemo } from "@/components/demo/elements/background-inbox";
import { CheckpointHistoryDemo } from "@/components/demo/elements/checkpoint-history";
import { ScheduleCardDemo } from "@/components/demo/elements/schedule-card";
import { PromptLibraryDemo } from "@/components/demo/elements/prompt-library";
import { CommandPaletteDemo } from "@/components/demo/elements/command-palette";
import { SharedConversationDemo } from "@/components/demo/elements/shared-conversation";
import { ConversationSearchDemo } from "@/components/demo/elements/conversation-search";
import { ThreadSearchDemo } from "@/components/demo/elements/thread-search";
import { LauncherBubbleDemo } from "@/components/demo/elements/launcher-bubble";
import { SettingsPanelDemo } from "@/components/demo/elements/settings-panel";
import { OnboardingDemo } from "@/components/demo/elements/onboarding";
import { MobileComposerDemo } from "@/components/demo/elements/mobile-composer";
import {
  AuiAssistantModalDemo,
  AuiAssistantSidebarDemo,
  AuiAttachmentDemo,
  AuiComposerTriggerPopoverDemo,
  AuiContextDisplayDemo,
  AuiConversationMapDemo,
  AuiDirectiveTextDemo,
  AuiFileDemo,
  AuiFollowUpSuggestionsDemo,
  AuiGenerativeUIDemo,
  AuiHeatGraphDemo,
  AuiImageDemo,
  AuiLogosDemo,
  AuiMarkdownTextDemo,
  AuiMcpConfigDemo,
  AuiMermaidDiagramDemo,
  AuiMessageTimingDemo,
  AuiModelSelectorDemo,
  AuiQuoteDemo,
  AuiReasoningDemo,
  AuiShikiHighlighterDemo,
  AuiSourcesDemo,
  AuiSyntaxHighlighterDemo,
  AuiThreadDemo,
  AuiThreadListDemo,
  AuiThreadListSidebarDemo,
  AuiToolFallbackDemo,
  AuiToolGroupDemo,
  AuiTooltipIconButtonDemo,
  AuiVoiceDemo,
  AuiVoiceStatesDemo,
  AuiVoicePalettesDemo,
} from "@/components/demo/elements/aui-demos";
import * as generativeDemos from "@/components/demo/elements/generative-demos";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";

export interface ElementVariant {
  key: string;
  label: string;
  Component: ComponentType;
}

export interface ElementEntry {
  slug: string;
  title: string;
  description: string;
  file?: string;
  installName?: string;
  registryName?: string;
  connection?: "AUI";
  counterpart?: string;
  standaloneItem?: string;
  wide?: boolean;
  replay?: boolean;
  generative?: boolean;
  Component: ComponentType;
  variants?: ElementVariant[];
}

export interface ElementSection {
  label: string;
  description: string;
  elements: ElementEntry[];
}

const generativeDemoFor = (templateSlug: string): ComponentType => {
  const exportName = `Generative${templateSlug
    .split("-")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("")}Demo`;
  const component = (
    generativeDemos as unknown as Record<string, ComponentType | undefined>
  )[exportName];
  if (!component) throw new Error(`Missing generative demo: ${exportName}`);
  return component;
};

export const ELEMENT_SECTIONS: ElementSection[] = [
  {
    label: "Reasoning",
    description: "What the model shows while it thinks.",
    elements: [
      {
        slug: "loading-state",
        replay: false,
        title: "Loader",
        description:
          "A pixel matrix that keeps time while the model has nothing to show yet.",
        file: "loading-state.tsx",
        Component: GenerationLoaderDemo,
        variants: [
          { key: "dots", label: "Dots", Component: GenerationLoaderDemo },
          {
            key: "squares",
            label: "Squares",
            Component: GenerationLoaderSquaresDemo,
          },
          {
            key: "rounded",
            label: "Rounded",
            Component: GenerationLoaderRoundedDemo,
          },
        ],
      },
      {
        slug: "thinking-indicator",
        title: "Thinking indicator",
        description:
          "A live status line that names what the agent is doing right now, with elapsed time.",
        file: "thinking-indicator.tsx",
        Component: ThinkingIndicatorDemo,
      },
      {
        slug: "streaming-text",
        title: "Streaming text",
        description:
          "Tokens arrive softly: the newest words land in blue and settle into ink.",
        file: "streaming-text.tsx",
        Component: StreamingTextDemo,
      },
      {
        slug: "typing-indicator",
        replay: false,
        title: "Typing indicator",
        description:
          "The classic three dots, tuned to read as presence rather than noise.",
        file: "typing-indicator.tsx",
        Component: TypingIndicatorDemo,
        variants: [
          {
            key: "bubble",
            label: "Bubble",
            Component: TypingIndicatorDemo,
          },
          { key: "bare", label: "Bare", Component: TypingIndicatorBareDemo },
        ],
      },
      {
        slug: "reasoning-effort",
        title: "Reasoning effort",
        description:
          "How hard to think, and how much of that budget the run actually spent.",
        file: "reasoning-effort.tsx",
        Component: ReasoningEffortDemo,
      },
      {
        slug: "guardrail-notice",
        replay: false,
        title: "Guardrail notice",
        description:
          "A refusal in its own shape, with the nearest thing it can do instead.",
        file: "guardrail-notice.tsx",
        Component: GuardrailNoticeDemo,
      },
    ],
  },
  {
    label: "Messages",
    description: "The conversation surface itself.",
    elements: [
      {
        slug: "message-pair",
        title: "Message pair",
        description:
          "A user bubble and a streaming assistant reply, with actions that appear on hover.",
        file: "message-pair.tsx",
        Component: MessagePairDemo,
        variants: [
          { key: "bubble", label: "Bubble", Component: MessagePairDemo },
          { key: "flat", label: "Flat", Component: MessagePairFlatDemo },
        ],
      },
      {
        slug: "message-branches",
        replay: false,
        title: "Message branches",
        description:
          "Navigate between regenerated versions of the same answer without losing your place.",
        file: "message-branches.tsx",
        Component: MessageBranchesDemo,
      },
      {
        slug: "message-actions",
        replay: false,
        title: "Message actions",
        description:
          "Copy, rate, and regenerate. Each action confirms itself with a small state change.",
        file: "message-actions.tsx",
        Component: MessageActionsDemo,
      },
      {
        slug: "error-state",
        replay: false,
        title: "Error state",
        description:
          "A quiet failure banner with a retry path, not a modal in your face.",
        file: "error-state.tsx",
        Component: ErrorStateDemo,
      },
      {
        slug: "message-queue",
        replay: false,
        title: "Message queue",
        description:
          "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
        file: "message-queue.tsx",
        Component: MessageQueueDemo,
      },
      {
        slug: "edit-message",
        replay: false,
        title: "Edit a sent message",
        description:
          "Rewrite a turn in place, told up front how many replies the edit throws away.",
        file: "edit-message.tsx",
        Component: EditMessageDemo,
      },
      {
        slug: "feedback-dialog",
        replay: false,
        title: "Feedback dialog",
        description:
          "A thumbs-down that asks why, so the signal arrives with a reason attached.",
        file: "feedback-dialog.tsx",
        Component: FeedbackDialogDemo,
      },
      {
        slug: "stopped-run",
        title: "Stopped run",
        description:
          "You pressed stop. The half-written answer stays, and continuing is one tap away.",
        file: "stopped-run.tsx",
        Component: StoppedRunDemo,
      },
      {
        slug: "day-separator",
        replay: false,
        title: "Timestamps",
        description:
          "Chronology in a long thread: days marked, times on hover.",
        file: "day-separator.tsx",
        Component: DaySeparatorDemo,
      },
      {
        slug: "speaker-identity",
        replay: false,
        title: "Speaker identity",
        description:
          "Who is talking, once a thread holds more than a user and one model.",
        file: "speaker-identity.tsx",
        Component: SpeakerIdentityDemo,
      },
      {
        slug: "regenerate-menu",
        replay: false,
        title: "Regenerate with",
        description:
          "Fork the same turn to a different model instead of rolling the same dice.",
        file: "regenerate-menu.tsx",
        Component: RegenerateMenuDemo,
      },
      {
        slug: "confidence-marker",
        replay: false,
        title: "Confidence",
        description:
          "Which claims came from a source, which were inferred, and which are guesses.",
        file: "confidence-marker.tsx",
        Component: ConfidenceMarkerDemo,
      },
    ],
  },
  {
    label: "Tool use",
    description: "Agent work, made legible.",
    elements: [
      {
        slug: "tool-call",
        title: "Tool call",
        description:
          "One tool invocation with its request and result tucked behind a disclosure.",
        file: "tool-call.tsx",
        Component: ToolCallDemo,
      },
      {
        slug: "tool-timeline",
        title: "Tool timeline",
        description:
          "A whole working session summarized as verbs, targets, and file stats.",
        file: "tool-timeline.tsx",
        Component: ToolTimelineDemo,
      },
      {
        slug: "terminal-block",
        title: "Terminal block",
        description:
          "Command output that streams line by line and ends with an exit status.",
        file: "terminal-block.tsx",
        Component: TerminalBlockDemo,
        variants: [
          { key: "paper", label: "Paper", Component: TerminalBlockDemo },
          { key: "ink", label: "Ink", Component: TerminalBlockInkDemo },
        ],
      },
      {
        slug: "code-diff",
        title: "Code diff",
        description:
          "A unified diff with tinted additions and removals, sized for chat.",
        file: "code-diff.tsx",
        Component: CodeDiffDemo,
      },
      {
        slug: "reviewable-diff",
        replay: false,
        title: "Reviewable diff",
        description:
          "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
        file: "reviewable-diff.tsx",
        Component: ReviewableDiffDemo,
      },
      {
        slug: "file-tree",
        title: "File tree",
        description:
          "Everything a run touched, as a tree, with the churn spelled out per file.",
        file: "file-tree.tsx",
        Component: FileTreeDemo,
      },
      {
        slug: "elicitation-form",
        replay: false,
        title: "Elicitation form",
        description:
          "A server pausing mid-tool-call to ask you for the fields it still needs.",
        file: "elicitation-form.tsx",
        Component: ElicitationFormDemo,
      },
      {
        slug: "mcp-server-panel",
        replay: false,
        title: "Server panel",
        description:
          "Which servers are connected, what each one brought, and which is still waiting on you.",
        file: "mcp-server-panel.tsx",
        Component: McpServerPanelDemo,
      },
      {
        slug: "tool-error",
        replay: false,
        title: "Tool failure",
        description:
          "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
        file: "tool-error.tsx",
        Component: ToolErrorDemo,
      },
      {
        slug: "permission-grant",
        replay: false,
        title: "Permission grant",
        description:
          "Granting a capability rather than approving one action, with the reach spelled out.",
        file: "permission-grant.tsx",
        Component: PermissionGrantDemo,
      },
      {
        slug: "computer-use",
        title: "Computer use",
        description:
          "The screen the agent is driving, with a cursor trail and what it is doing right now.",
        file: "computer-use.tsx",
        Component: ComputerUseDemo,
      },
      {
        slug: "code-runner",
        replay: false,
        title: "Code runner",
        description:
          "A snippet with a run button, and the output it produced attached below it.",
        file: "code-runner.tsx",
        Component: CodeRunnerDemo,
      },
    ],
  },
  {
    label: "Knowledge",
    description: "Where answers come from.",
    elements: [
      {
        slug: "web-search",
        title: "Web search",
        description:
          "A search query and its results landing one by one as the agent reads.",
        file: "web-search.tsx",
        Component: WebSearchDemo,
      },
      {
        slug: "inline-citation",
        replay: false,
        title: "Inline citation",
        description:
          "Numbered references inside a sentence, each with a hover preview of its source.",
        file: "inline-citation.tsx",
        Component: InlineCitationDemo,
      },
      {
        slug: "image-generation",
        title: "Image generation",
        description:
          "A dot grid holds the frame while the image resolves out of a blur.",
        file: "image-generation.tsx",
        Component: ImageGenerationDemo,
      },
      {
        slug: "retrieval-chunks",
        title: "Retrieval chunks",
        description:
          "The passages a retrieval answer stands on, scored, before the answer itself arrives.",
        file: "retrieval-chunks.tsx",
        Component: RetrievalChunksDemo,
      },
      {
        slug: "document-reference",
        replay: false,
        title: "Document reference",
        description:
          "A document the answer leans on, with the quoted passage and the page to jump to.",
        file: "document-reference.tsx",
        Component: DocumentReferenceDemo,
      },
      {
        slug: "memory-chips",
        title: "Memory",
        description:
          "What it now remembers about you, written during the turn and removable.",
        file: "memory-chips.tsx",
        Component: MemoryChipsDemo,
      },
      {
        slug: "research-report",
        title: "Research report",
        description:
          "An outline that fills in section by section, each carrying the sources behind it.",
        file: "research-report.tsx",
        Component: ResearchReportDemo,
      },
      {
        slug: "map-answer",
        replay: false,
        title: "Map",
        description:
          "A location answer: pins, a route between them, and the list they came from.",
        file: "map-answer.tsx",
        Component: MapAnswerDemo,
      },
    ],
  },
  {
    label: "Structured output",
    description: "Answers with shape: tables, diffs, and counts.",
    elements: [
      {
        slug: "data-table",
        title: "Data table",
        description:
          "A small comparison table the model can answer with directly.",
        file: "data-table.tsx",
        Component: DataTableDemo,
      },
      {
        slug: "number-ticker",
        title: "Number ticker",
        description:
          "Digits that roll into place as a count updates in real time.",
        file: "number-ticker.tsx",
        Component: NumberTickerDemo,
      },
      {
        slug: "chart",
        title: "Chart",
        description:
          "Area, line, and bars, with points landing one at a time as the series streams in.",
        file: "chart.tsx",
        Component: ChartDemo,
        variants: [
          { key: "area", label: "Area", Component: ChartDemo },
          { key: "line", label: "Line", Component: ChartLineDemo },
          { key: "bars", label: "Bars", Component: ChartBarsDemo },
        ],
      },
      {
        slug: "web-preview",
        title: "Web preview",
        description:
          "Chrome for a sandboxed preview: a URL bar, reload, and open-in-new around a frame you isolate.",
        file: "web-preview.tsx",
        Component: WebPreviewDemo,
      },
      {
        slug: "diagram",
        replay: false,
        title: "Diagram",
        description:
          "A drawn answer with zoom, reset, and a full-bleed view; you hand it the rendered graphic.",
        file: "diagram.tsx",
        Component: DiagramDemo,
      },
      {
        slug: "flow-graph",
        title: "Flow graph",
        description:
          "Work as a graph rather than a list: branches that fan out and rejoin.",
        file: "flow-graph.tsx",
        Component: FlowGraphDemo,
      },
      {
        slug: "activity-graph",
        replay: false,
        title: "Activity graph",
        description:
          "A half-year of runs as a calendar of cells, dense where the work was.",
        file: "activity-graph.tsx",
        Component: ActivityGraphDemo,
      },
      {
        slug: "math-block",
        title: "Math",
        description:
          "Rendered expressions with the working shown, one step at a time.",
        file: "math-block.tsx",
        Component: MathBlockDemo,
      },
      {
        slug: "spec-sheet",
        title: "Spec sheet",
        description:
          "The most common structured answer after a table: one object, labeled.",
        file: "spec-sheet.tsx",
        Component: SpecSheetDemo,
      },
      {
        slug: "comparison-card",
        replay: false,
        title: "Comparison",
        description:
          "Two options weighed side by side, with the pick named and argued.",
        file: "comparison-card.tsx",
        Component: ComparisonCardDemo,
      },
      {
        slug: "timeline",
        title: "Timeline",
        description:
          "Events on a time axis, with what already happened and what is still coming.",
        file: "timeline.tsx",
        Component: TimelineDemo,
      },
      {
        slug: "job-progress",
        title: "Job progress",
        description:
          "Work measured in minutes: weighted stages, an ETA, and a way out.",
        file: "job-progress.tsx",
        Component: JobProgressDemo,
      },
      {
        slug: "score-breakdown",
        title: "Score breakdown",
        description:
          "A verdict with its arithmetic shown: criteria, weights, and what pulled it down.",
        file: "score-breakdown.tsx",
        Component: ScoreBreakdownDemo,
      },
    ],
  },
  {
    label: "Agents",
    description: "Long-running work you can supervise.",
    elements: [
      {
        slug: "agent-plan",
        title: "Agent plan",
        description:
          "A checklist the agent works through, with progress you can glance.",
        file: "agent-plan.tsx",
        Component: AgentPlanDemo,
      },
      {
        slug: "subagent-list",
        title: "Subagent list",
        description:
          "Parallel workers with their own progress, models, and completions.",
        file: "subagent-list.tsx",
        Component: SubagentListDemo,
      },
      {
        slug: "agent-status",
        title: "Agent status",
        description:
          "One pill that always answers: what is it doing, and for how long.",
        file: "agent-status.tsx",
        Component: AgentStatusDemo,
      },
      {
        slug: "approval-card",
        replay: false,
        title: "Approval card",
        description:
          "Human in the loop: the agent asks before it runs anything with side effects.",
        file: "approval-card.tsx",
        Component: ApprovalCardDemo,
      },
      {
        slug: "recommendation-card",
        replay: false,
        title: "Recommendation card",
        description:
          "The agent proposes a change with its confidence, and waits for a yes.",
        file: "recommendation-card.tsx",
        Component: RecommendationCardDemo,
      },
      {
        slug: "artifact-card",
        title: "Artifact card",
        description:
          "A generated document as a tangible object, written live and versioned.",
        file: "artifact-card.tsx",
        Component: ArtifactCardDemo,
      },
      {
        slug: "todo-list",
        title: "Todo list",
        description:
          "The agent's own working list, rewritten mid-run as it discovers what else is needed.",
        file: "todo-list.tsx",
        Component: TodoListDemo,
      },
      {
        slug: "agent-card",
        replay: false,
        title: "Agent card",
        description:
          "Who you are about to talk to: its skills, its model, and the endpoint behind it.",
        file: "agent-card.tsx",
        Component: AgentCardDemo,
      },
      {
        slug: "agent-handoff",
        title: "Handoff",
        description:
          "Control passing between agents, with the reason and what came along.",
        file: "agent-handoff.tsx",
        Component: AgentHandoffDemo,
      },
      {
        slug: "background-inbox",
        title: "Background runs",
        description:
          "Work still going somewhere else, and the results waiting to be collected.",
        file: "background-inbox.tsx",
        Component: BackgroundInboxDemo,
      },
      {
        slug: "checkpoint-history",
        replay: false,
        title: "Checkpoints",
        description:
          "Points you can fall back to, with what each one would give back.",
        file: "checkpoint-history.tsx",
        Component: CheckpointHistoryDemo,
      },
      {
        slug: "schedule-card",
        replay: false,
        title: "Schedule",
        description:
          "A run that repeats on its own, with its cadence and how it has been doing.",
        file: "schedule-card.tsx",
        Component: ScheduleCardDemo,
      },
    ],
  },
  {
    label: "Observability",
    description: "What the run actually cost you.",
    elements: [
      {
        slug: "trace-waterfall",
        title: "Trace waterfall",
        description:
          "Every span in a run on one time axis, nested, so you can see where it actually went.",
        file: "trace-waterfall.tsx",
        Component: TraceWaterfallDemo,
      },
      {
        slug: "cost-meter",
        replay: false,
        title: "Cost meter",
        description:
          "What the run spent, split by model, against the session total.",
        file: "cost-meter.tsx",
        Component: CostMeterDemo,
      },
      {
        slug: "quota-banner",
        title: "Quota banner",
        description:
          "How much is left, when it comes back, and the way to get more.",
        file: "quota-banner.tsx",
        Component: QuotaBannerDemo,
      },
    ],
  },
  {
    label: "Composer",
    description: "One input, every capability built in.",
    elements: [
      {
        slug: "composer",
        replay: false,
        title: "Composer",
        description:
          "The unified input: attachments, commands, mentions, models, voice, and context in one surface.",
        file: "composer.tsx",
        wide: true,
        Component: ComposerDemo,
      },
      {
        slug: "composer-slash-commands",
        replay: false,
        title: "Slash commands",
        description:
          "Type a slash and the command menu floats above the input, filtering as you continue.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerSlashDemo,
      },
      {
        slug: "composer-mentions",
        replay: false,
        title: "Mentions",
        description:
          "Type @ to pull people and agents into the conversation, filtered as you go.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerMentionsDemo,
      },
      {
        slug: "composer-attachments",
        title: "Attachments",
        description:
          "Files stage inside the composer with per-file progress before the message sends.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerAttachmentsDemo,
      },
      {
        slug: "composer-model-picker",
        replay: false,
        title: "Models",
        description:
          "The model lives in the composer rail, one tap away with context at a glance.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerModelsDemo,
      },
      {
        slug: "composer-voice",
        title: "Dictation",
        description:
          "The mic morphs the input into a live waveform, then lands the transcript as text.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerVoiceDemo,
      },
      {
        slug: "composer-context",
        title: "Context",
        description:
          "A token ring in the rail fills as the conversation grows, warning near the limit.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerContextDemo,
      },
      {
        slug: "draft-restore",
        replay: false,
        title: "Draft restore",
        description:
          "Come back to a thread and the sentence you never sent is still waiting.",
        file: "draft-restore.tsx",
        Component: DraftRestoreDemo,
      },
      {
        slug: "context-breakdown",
        title: "Context breakdown",
        description:
          "Where the window actually went: prompt, tools, files, conversation, and what's left.",
        file: "context-breakdown.tsx",
        Component: ContextBreakdownDemo,
      },
      {
        slug: "prompt-library",
        replay: false,
        title: "Prompt library",
        description:
          "Prompts you saved, searchable, with their variables shown before you insert one.",
        file: "prompt-library.tsx",
        Component: PromptLibraryDemo,
      },
      {
        slug: "command-palette",
        replay: false,
        title: "Command palette",
        description:
          "Everything the app can do, one keystroke away and grouped by where it acts.",
        file: "command-palette.tsx",
        Component: CommandPaletteDemo,
      },
    ],
  },
  {
    label: "Voice",
    description: "When the conversation stops being typed.",
    elements: [
      {
        slug: "voice-conversation",
        counterpart: "orb",
        title: "Voice conversation",
        description:
          "A live call: the orb tracks your voice, the caption names the turn, the transcript follows.",
        file: "voice-conversation.tsx",
        Component: VoiceConversationDemo,
      },
      {
        slug: "read-aloud",
        replay: false,
        title: "Read aloud",
        description:
          "An answer played back, the spoken word lit as it goes, speed under your thumb.",
        file: "read-aloud.tsx",
        Component: ReadAloudDemo,
      },
    ],
  },
  {
    label: "Thread",
    description: "Everything around the conversation.",
    elements: [
      {
        slug: "chat-panel",
        title: "Chat panel",
        description:
          "The whole family working together: a message, a pause, a streamed reply.",
        file: "chat-panel.tsx",
        wide: true,
        Component: ChatPanelDemo,
      },
      {
        slug: "empty-state",
        title: "Empty state",
        description:
          "The first screen: a greeting, three ways in, and the composer front and center.",
        file: "empty-state.tsx",
        wide: true,
        Component: EmptyStateDemo,
      },
      {
        slug: "scroll-anchor",
        title: "Scroll anchor",
        description:
          "Streaming never steals your scroll position; a pill offers the way back down.",
        file: "scroll-anchor.tsx",
        Component: ScrollAnchorDemo,
      },
      {
        slug: "canvas-split",
        title: "Canvas",
        description:
          "The thread steps aside and the document takes the room, still being written as you read.",
        file: "canvas-split.tsx",
        wide: true,
        Component: CanvasSplitDemo,
      },
      {
        slug: "connection-state",
        title: "Connection state",
        description:
          "The socket drops, the run keeps going on the server, and the stream is picked back up.",
        file: "connection-state.tsx",
        Component: ConnectionStateDemo,
      },
      {
        slug: "shared-conversation",
        replay: false,
        title: "Shared conversation",
        description:
          "A read-only transcript someone sent you, with a way to pick it up yourself.",
        file: "shared-conversation.tsx",
        Component: SharedConversationDemo,
      },
      {
        slug: "conversation-search",
        replay: false,
        title: "Search in conversation",
        description:
          "Find inside a long thread, with every hit marked down the scrollbar.",
        file: "conversation-search.tsx",
        Component: ConversationSearchDemo,
      },
      {
        slug: "thread-search",
        replay: false,
        title: "Thread search",
        description:
          "History you can actually get back into: pinned first, then grouped by when.",
        file: "thread-search.tsx",
        Component: ThreadSearchDemo,
      },
      {
        slug: "launcher-bubble",
        title: "Launcher",
        description: "The floating entry point, and the panel it opens into.",
        file: "launcher-bubble.tsx",
        Component: LauncherBubbleDemo,
      },
      {
        slug: "settings-panel",
        replay: false,
        title: "Settings",
        description:
          "Model, system prompt, temperature, and what the assistant is allowed to do.",
        file: "settings-panel.tsx",
        Component: SettingsPanelDemo,
      },
      {
        slug: "onboarding",
        replay: false,
        title: "Onboarding",
        description:
          "First run: three moves that teach what this assistant is actually for.",
        file: "onboarding.tsx",
        Component: OnboardingDemo,
      },
      {
        slug: "mobile-composer",
        replay: false,
        title: "Mobile composer",
        description:
          "The bottom sheet: keyboard-aware, quick actions above, thumb-sized targets.",
        file: "mobile-composer.tsx",
        Component: MobileComposerDemo,
      },
    ],
  },
  {
    label: "AUI connected",
    description: "Elements that read directly from assistant-ui runtime state.",
    elements: [
      {
        slug: "thread",
        replay: false,
        title: "Thread",
        description:
          "A complete chat container with messages, composer, auto-scroll, and accessibility built in.",
        file: "thread.aui.tsx",
        registryName: "thread",
        connection: "AUI",
        wide: true,
        Component: AuiThreadDemo,
      },
      {
        slug: "assistant-modal",
        replay: false,
        title: "Assistant modal",
        description:
          "A floating chat bubble for support widgets, help desks, and embedded assistants.",
        file: "assistant-modal.aui.tsx",
        registryName: "assistant-modal",
        connection: "AUI",
        wide: true,
        Component: AuiAssistantModalDemo,
      },
      {
        slug: "assistant-sidebar",
        replay: false,
        title: "Assistant sidebar",
        description:
          "A resizable side panel for copilot experiences and contextual assistance.",
        file: "assistant-sidebar.aui.tsx",
        registryName: "assistant-sidebar",
        connection: "AUI",
        wide: true,
        Component: AuiAssistantSidebarDemo,
      },
      {
        slug: "thread-list",
        standaloneItem: "elements-thread-list",
        replay: false,
        title: "Thread list",
        description:
          "Runtime-backed conversation switching with search, active selection, and thread actions.",
        file: "thread-list.aui.tsx",
        registryName: "thread-list",
        connection: "AUI",
        Component: AuiThreadListDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiThreadListDemo },
          { key: "static", label: "Static", Component: ThreadListDemo },
        ],
      },
      {
        slug: "thread-list-sidebar",
        replay: false,
        title: "Thread list sidebar",
        description:
          "A complete sidebar shell that places the runtime thread list beside the active conversation.",
        file: "threadlist-sidebar.aui.tsx",
        registryName: "threadlist-sidebar",
        connection: "AUI",
        wide: true,
        Component: AuiThreadListSidebarDemo,
      },
      {
        slug: "orb",
        standaloneItem: "elements-voice",
        counterpart: "voice-conversation",
        replay: false,
        title: "Orb",
        description:
          "The realtime voice orb, with connection, mute, and speaking state controls.",
        file: "voice.aui.tsx",
        registryName: "voice",
        connection: "AUI",
        Component: AuiVoiceDemo,
        variants: [
          { key: "session", label: "Session", Component: AuiVoiceDemo },
          { key: "states", label: "States", Component: AuiVoiceStatesDemo },
          {
            key: "palettes",
            label: "Palettes",
            Component: AuiVoicePalettesDemo,
          },
        ],
      },
      {
        slug: "reasoning",
        standaloneItem: "elements-reasoning",
        replay: false,
        title: "Reasoning",
        description:
          "A collapsible renderer for assistant reasoning that follows the active message part.",
        file: "reasoning.aui.tsx",
        registryName: "reasoning",
        connection: "AUI",
        Component: AuiReasoningDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiReasoningDemo },
          { key: "static", label: "Static", Component: ReasoningPanelDemo },
        ],
      },
      {
        slug: "message-timing",
        standaloneItem: "elements-message-timing",
        replay: false,
        title: "Message timing",
        description:
          "Streaming statistics for the current message, including first token, total time, and speed.",
        file: "message-timing.aui.tsx",
        registryName: "message-timing",
        connection: "AUI",
        Component: AuiMessageTimingDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiMessageTimingDemo },
          { key: "static", label: "Static", Component: MessageTimingDemo },
        ],
      },
      {
        slug: "conversation-map",
        standaloneItem: "elements-conversation-map",
        replay: false,
        title: "Conversation map",
        description:
          "A rail of the whole thread: one tick per turn, the turn being read marked and the ones on screen deepened, a hover preview, and a click that jumps there.",
        file: "conversation-map.aui.tsx",
        registryName: "conversation-map",
        connection: "AUI",
        wide: true,
        Component: AuiConversationMapDemo,
        variants: [
          {
            key: "runtime",
            label: "Runtime",
            Component: AuiConversationMapDemo,
          },
          { key: "static", label: "Static", Component: ConversationMapDemo },
        ],
      },
      {
        slug: "context-display",
        standaloneItem: "elements-context-display",
        replay: false,
        title: "Context display",
        description:
          "Model context usage as a ring, bar, or text value with a detailed hover view.",
        file: "context-display.aui.tsx",
        registryName: "context-display",
        connection: "AUI",
        Component: AuiContextDisplayDemo,
      },
      {
        slug: "mcp-config",
        replay: false,
        title: "MCP config dialog",
        description:
          "A dialog for connectors and custom MCP servers, including authentication and connection state.",
        file: "mcp-config.aui.tsx",
        registryName: "mcp-config",
        connection: "AUI",
        Component: AuiMcpConfigDemo,
      },
      {
        slug: "attachment",
        standaloneItem: "elements-message-attachment",
        replay: false,
        title: "Attachment",
        description:
          "Runtime attachments for the composer and messages, with previews, progress, and removal.",
        file: "attachment.aui.tsx",
        registryName: "attachment",
        connection: "AUI",
        Component: AuiAttachmentDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiAttachmentDemo },
          { key: "static", label: "Static", Component: MessageAttachmentDemo },
        ],
      },
      {
        slug: "follow-up-suggestions",
        standaloneItem: "elements-suggestions",
        replay: false,
        title: "Follow-up suggestions",
        description:
          "Prompt chips populated from the runtime's generated follow-up suggestions.",
        file: "follow-up-suggestions.aui.tsx",
        registryName: "follow-up-suggestions",
        connection: "AUI",
        wide: true,
        Component: AuiFollowUpSuggestionsDemo,
        variants: [
          {
            key: "runtime",
            label: "Runtime",
            Component: AuiFollowUpSuggestionsDemo,
          },
          { key: "pills", label: "Pills", Component: SuggestionsDemo },
          { key: "list", label: "List", Component: SuggestionsListDemo },
        ],
      },
      {
        slug: "tool-fallback",
        replay: false,
        title: "Tool fallback",
        description:
          "The default runtime renderer for tool calls that do not have dedicated UI.",
        file: "tool-fallback.aui.tsx",
        registryName: "tool-fallback",
        connection: "AUI",
        Component: AuiToolFallbackDemo,
      },
      {
        slug: "tool-group",
        standaloneItem: "elements-tool-group",
        replay: false,
        title: "Tool group",
        description:
          "A collapsible runtime wrapper around consecutive tool calls in one assistant turn.",
        file: "tool-group.aui.tsx",
        registryName: "tool-group",
        connection: "AUI",
        Component: AuiToolGroupDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiToolGroupDemo },
          { key: "static", label: "Static", Component: ToolGroupDemo },
        ],
      },
      {
        slug: "quote",
        standaloneItem: "elements-quote-reply",
        replay: false,
        title: "Quote",
        description:
          "Select message text, quote it from a floating toolbar, and carry it into the composer.",
        file: "quote.aui.tsx",
        registryName: "quote",
        connection: "AUI",
        Component: AuiQuoteDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiQuoteDemo },
          { key: "static", label: "Static", Component: QuoteReplyDemo },
        ],
      },
      {
        slug: "sources",
        standaloneItem: "elements-sources",
        replay: false,
        title: "Sources",
        description:
          "Runtime URL sources with favicon, title, and an external link.",
        file: "sources.aui.tsx",
        registryName: "sources",
        connection: "AUI",
        Component: AuiSourcesDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiSourcesDemo },
          { key: "static", label: "Static", Component: SourcesDemo },
        ],
      },
      {
        slug: "image",
        replay: false,
        title: "Image",
        description:
          "Image message parts with preview, loading states, actions, and a fullscreen view.",
        file: "image.tsx",
        registryName: "image",
        connection: "AUI",
        Component: AuiImageDemo,
      },
      {
        slug: "file",
        replay: false,
        title: "File",
        description:
          "File message parts with type-aware icons, filename, size, and download actions.",
        file: "file.tsx",
        registryName: "file",
        connection: "AUI",
        Component: AuiFileDemo,
      },
      {
        slug: "model-selector",
        standaloneItem: "elements-model-selector",
        replay: false,
        title: "Model selector",
        description:
          "A searchable runtime model picker with grouped providers and reasoning effort controls.",
        file: "model-selector.aui.tsx",
        registryName: "model-selector",
        connection: "AUI",
        Component: AuiModelSelectorDemo,
        variants: [
          { key: "runtime", label: "Runtime", Component: AuiModelSelectorDemo },
          { key: "static", label: "Static", Component: ModelPickerDemo },
        ],
      },
      {
        slug: "composer-trigger-popover",
        replay: false,
        title: "Composer trigger popover",
        description:
          "A character-triggered picker for mentions, slash commands, and nested composer actions.",
        file: "composer-trigger-popover.aui.tsx",
        registryName: "composer-trigger-popover",
        connection: "AUI",
        Component: AuiComposerTriggerPopoverDemo,
      },
      {
        slug: "directive-text",
        standaloneItem: "elements-directive-text",
        replay: false,
        title: "Directive text",
        description:
          "A message renderer that turns mention directives into inline, runtime-aware chips.",
        file: "directive-text.aui.tsx",
        registryName: "directive-text",
        connection: "AUI",
        Component: AuiDirectiveTextDemo,
      },
    ],
  },
  {
    label: "Renderers",
    description: "Rich content renderers that plug into assistant messages.",
    elements: [
      {
        slug: "markdown-text",
        replay: false,
        title: "Markdown text",
        description:
          "Assistant markdown with headings, lists, links, tables, and code blocks.",
        file: "markdown-text.tsx",
        registryName: "markdown-text",
        connection: "AUI",
        wide: true,
        Component: AuiMarkdownTextDemo,
      },
      {
        slug: "syntax-highlighter",
        replay: false,
        title: "Syntax highlighter",
        description:
          "Prism-based code highlighting for assistant markdown code blocks.",
        file: "syntax-highlighter.tsx",
        registryName: "syntax-highlighter",
        Component: AuiSyntaxHighlighterDemo,
      },
      {
        slug: "shiki-highlighter",
        standaloneItem: "elements-shiki-highlighter",
        replay: false,
        title: "Shiki highlighter",
        description:
          "Shiki code highlighting that defers tokenization until a message part settles.",
        file: "shiki-highlighter.aui.tsx",
        registryName: "shiki-highlighter",
        connection: "AUI",
        Component: AuiShikiHighlighterDemo,
      },
      {
        slug: "mermaid-diagram",
        standaloneItem: "elements-mermaid-diagram",
        replay: false,
        title: "Mermaid diagram",
        description:
          "Mermaid diagrams rendered inside messages, including partial streaming input.",
        file: "mermaid-diagram.aui.tsx",
        registryName: "mermaid-diagram",
        Component: AuiMermaidDiagramDemo,
      },
      {
        slug: "generative-ui",
        replay: false,
        title: "Generative UI",
        description:
          "A styled component library for rendering structured generative UI output.",
        file: "generative-ui.tsx",
        registryName: "generative-ui",
        wide: true,
        Component: AuiGenerativeUIDemo,
      },
    ],
  },
  {
    label: "Primitives",
    description: "Small building blocks shared across the assistant UI kit.",
    elements: [
      {
        slug: "tooltip-icon-button",
        replay: false,
        title: "Tooltip icon button",
        description:
          "An accessible icon button with a tooltip label and shared interaction states.",
        file: "tooltip-icon-button.tsx",
        registryName: "tooltip-icon-button",
        Component: AuiTooltipIconButtonDemo,
      },
      {
        slug: "logos",
        replay: false,
        title: "Model logos",
        description:
          "Inline SVG marks for OpenAI, Anthropic, and Google model providers.",
        file: "logos.tsx",
        registryName: "logos",
        Component: AuiLogosDemo,
      },
      {
        slug: "heat-graph",
        replay: false,
        title: "Heat graph",
        description:
          "An activity heat map with month labels, weekday labels, legend, and tooltip.",
        file: "heat-graph.tsx",
        registryName: "heat-graph",
        wide: true,
        Component: AuiHeatGraphDemo,
      },
    ],
  },
  {
    label: "Generative",
    description: "Widgets the model composes on its own at runtime.",
    elements: GENERATIVE_ELEMENTS.map((entry) => ({
      slug: entry.slug,
      replay: false,
      generative: true,
      title: entry.template.title,
      description: entry.template.description,
      Component: generativeDemoFor(entry.templateSlug),
    })),
  },
];

export interface FlatElement extends ElementEntry {
  section: string;
  index: number;
}

export const ELEMENTS: FlatElement[] = ELEMENT_SECTIONS.flatMap((section) =>
  section.elements.map((element) => ({ ...element, section: section.label })),
).map((element, i) => ({ ...element, index: i + 1 }));

export const ELEMENT_COUNT = ELEMENTS.length;

export function getElement(slug: string): FlatElement | undefined {
  return ELEMENTS.find((element) => element.slug === slug);
}
