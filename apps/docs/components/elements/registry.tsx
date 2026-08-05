import type { ComponentType } from "react";
import {
  GenerationLoaderDemo,
  GenerationLoaderRoundedDemo,
  GenerationLoaderSquaresDemo,
} from "./loading-state-demo";
import { DataTableDemo } from "./data-table-demo";
import { RecommendationCardDemo } from "./recommendation-card-demo";
import { NumberTickerDemo } from "./number-ticker-demo";
import { ChatPanelDemo } from "./chat-panel-demo";
import { ThinkingIndicatorDemo } from "./thinking-indicator-demo";
import { ReasoningPanelDemo } from "./reasoning-panel-demo";
import { StreamingTextDemo } from "./streaming-text-demo";
import {
  TypingIndicatorBareDemo,
  TypingIndicatorDemo,
} from "./typing-indicator-demo";
import { MessagePairDemo, MessagePairFlatDemo } from "./message-pair-demo";
import { MessageBranchesDemo } from "./message-branches-demo";
import { MessageActionsDemo } from "./message-actions-demo";
import { SuggestionsDemo, SuggestionsListDemo } from "./suggestions-demo";
import { ErrorStateDemo } from "./error-state-demo";
import { ToolCallDemo } from "./tool-call-demo";
import { ToolTimelineDemo } from "./tool-timeline-demo";
import { TerminalBlockDemo, TerminalBlockInkDemo } from "./terminal-block-demo";
import { CodeDiffDemo } from "./code-diff-demo";
import { WebSearchDemo } from "./web-search-demo";
import { SourcesDemo } from "./sources-demo";
import { InlineCitationDemo } from "./inline-citation-demo";
import { ImageGenerationDemo } from "./image-generation-demo";
import { AgentPlanDemo } from "./agent-plan-demo";
import { SubagentListDemo } from "./subagent-list-demo";
import { AgentStatusDemo } from "./agent-status-demo";
import { ApprovalCardDemo } from "./approval-card-demo";
import { ArtifactCardDemo } from "./artifact-card-demo";
import { ComposerDemo } from "./composer-demo";
import { ComposerSlashDemo } from "./composer-slash-demo";
import { ComposerMentionsDemo } from "./composer-mentions-demo";
import { ComposerAttachmentsDemo } from "./composer-attachments-demo";
import { ComposerModelsDemo } from "./composer-models-demo";
import { ComposerVoiceDemo } from "./composer-voice-demo";
import { ComposerContextDemo } from "./composer-context-demo";
import { EmptyStateDemo } from "./empty-state-demo";
import { ThreadListDemo } from "./thread-list-demo";
import { ScrollAnchorDemo } from "./scroll-anchor-demo";
import * as generativeDemos from "./generative-demos";
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
        title: "Loading state",
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
        slug: "reasoning-panel",
        title: "Reasoning panel",
        description:
          "A collapsible trace that streams reasoning steps along a timeline, then settles into a summary.",
        file: "reasoning-panel.tsx",
        Component: ReasoningPanelDemo,
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
        slug: "suggestions",
        replay: false,
        title: "Follow-up suggestions",
        description:
          "Prompt pills that stagger in after a reply and invite the next turn.",
        file: "suggestions.tsx",
        Component: SuggestionsDemo,
        variants: [
          { key: "pills", label: "Pills", Component: SuggestionsDemo },
          { key: "list", label: "List", Component: SuggestionsListDemo },
        ],
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
        slug: "sources",
        replay: false,
        title: "Sources",
        description:
          "Citations collapsed into a pill, expanding into scannable source cards.",
        file: "sources.tsx",
        Component: SourcesDemo,
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
        title: "Model picker",
        description:
          "The model lives in the composer rail, one tap away with context at a glance.",
        file: "composer.tsx",
        installName: "composer",
        Component: ComposerModelsDemo,
      },
      {
        slug: "composer-voice",
        title: "Voice",
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
        slug: "thread-list",
        replay: false,
        title: "Thread list",
        description:
          "Conversation history with unread marks and actions that wait for hover.",
        file: "thread-list.tsx",
        Component: ThreadListDemo,
      },
      {
        slug: "scroll-anchor",
        title: "Scroll anchor",
        description:
          "Streaming never steals your scroll position; a pill offers the way back down.",
        file: "scroll-anchor.tsx",
        Component: ScrollAnchorDemo,
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
