import {
  generativeUiThemeVars,
  generativeUiVocabularyCss,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css.ts";
import type { RegistryItem } from "./schema";

const collapsibleStateCss = {
  '@custom-variant data-open (&:where([data-state="open"], [data-open]:not([data-open="false"])))':
    {},
  '@custom-variant data-closed (&:where([data-state="closed"], [data-closed]:not([data-closed="false"])))':
    {},
  "@keyframes collapsible-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
  },
  "@keyframes collapsible-up": {
    from: {
      height:
        "var(--radix-collapsible-content-height, var(--collapsible-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

const accordionKeyframesCss = {
  "@keyframes accordion-down": {
    from: { height: "0" },
    to: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
  },
  "@keyframes accordion-up": {
    from: {
      height:
        "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
    },
    to: { height: "0" },
  },
};

type ElementRegistryEntry = {
  slug: string;
  title: string;
  description: string;
  file: string;
  dependencies?: string[];
  usesCollapsible?: boolean;
  usesElements?: string[];
  usesSurfaces?: boolean;
};

const createElementRegistryItem = (
  entry: ElementRegistryEntry,
): RegistryItem => ({
  name: `elements-${entry.slug}`,
  type: "registry:component",
  title: entry.title,
  description: entry.description,
  files: [
    {
      type: "registry:component",
      path: `components/assistant-ui/elements/${entry.file}`,
      sourcePath: `../../packages/ui/src/components/react/assistant-ui/elements/${entry.file}`,
    },
  ],
  registryDependencies: [
    ...(entry.usesSurfaces === false
      ? []
      : ["https://r.assistant-ui.com/elements-surfaces.json"]),
    ...(entry.usesElements ?? []).map(
      (slug) => `https://r.assistant-ui.com/elements-${slug}.json`,
    ),
    ...(entry.usesCollapsible ? ["collapsible"] : []),
  ],
  ...(entry.dependencies ? { dependencies: entry.dependencies } : {}),
});

const elementsRegistryItems: RegistryItem[] = [
  {
    name: "elements-surfaces",
    type: "registry:component",
    title: "Elements Surfaces",
    description:
      "Shared design language for the elements family: surface, ink, and motion class recipes plus the shimmer utility.",
    files: [
      {
        type: "registry:lib",
        path: "components/assistant-ui/elements/surfaces.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/surfaces.tsx",
      },
    ],
    dependencies: ["tw-shimmer"],
    css: {
      '@import "tw-shimmer"': {},
    },
  },
  {
    name: "elements-range",
    type: "registry:component",
    title: "Elements Range",
    description:
      "Range normalization for the elements family: clamping a caller's counts, indexes, and shares to what the element can render.",
    files: [
      {
        type: "registry:lib",
        path: "components/assistant-ui/utils/range.ts",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/utils/range.ts",
      },
    ],
  },
  createElementRegistryItem({
    slug: "loading-state",
    title: "Loading state",
    description:
      "A pixel matrix that keeps time while the model has nothing to show yet.",
    file: "loading-state.tsx",
  }),
  createElementRegistryItem({
    slug: "thinking-indicator",
    title: "Thinking indicator",
    description:
      "A live status line that names what the agent is doing right now, with elapsed time.",
    file: "thinking-indicator.tsx",
  }),
  createElementRegistryItem({
    slug: "reasoning-panel",
    title: "Reasoning panel",
    description:
      "A collapsible trace that streams reasoning steps along a timeline, then settles into a summary.",
    file: "reasoning-panel.tsx",
    dependencies: ["lucide-react"],
    usesCollapsible: true,
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "streaming-text",
    title: "Streaming text",
    description:
      "Tokens arrive softly: the newest words land in blue and settle into ink.",
    file: "streaming-text.tsx",
    usesSurfaces: false,
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "typing-indicator",
    title: "Typing indicator",
    description:
      "The classic three dots, tuned to read as presence rather than noise.",
    file: "typing-indicator.tsx",
  }),
  createElementRegistryItem({
    slug: "message-pair",
    title: "Message pair",
    description:
      "A user bubble and a streaming assistant reply, with actions that appear on hover.",
    file: "message-pair.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "message-branches",
    title: "Message branches",
    description:
      "Navigate between regenerated versions of the same answer without losing your place.",
    file: "message-branches.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "message-actions",
    title: "Message actions",
    description:
      "Copy, rate, and regenerate. Each action confirms itself with a small state change.",
    file: "message-actions.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "suggestions",
    title: "Follow-up suggestions",
    description:
      "Prompt pills that stagger in after a reply and invite the next turn.",
    file: "suggestions.tsx",
  }),
  createElementRegistryItem({
    slug: "error-state",
    title: "Error state",
    description:
      "A quiet failure banner with a retry path, not a modal in your face.",
    file: "error-state.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "tool-call",
    title: "Tool call",
    description:
      "One tool invocation with its request and result tucked behind a disclosure.",
    file: "tool-call.tsx",
    dependencies: ["lucide-react"],
    usesCollapsible: true,
  }),
  createElementRegistryItem({
    slug: "tool-timeline",
    title: "Tool timeline",
    description:
      "A whole working session summarized as verbs, targets, and file stats.",
    file: "tool-timeline.tsx",
    dependencies: ["lucide-react"],
    usesCollapsible: true,
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "terminal-block",
    title: "Terminal block",
    description:
      "Command output that streams line by line and ends with an exit status.",
    file: "terminal-block.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "code-diff",
    title: "Code diff",
    description:
      "A unified diff with tinted additions and removals, sized for chat.",
    file: "code-diff.tsx",
  }),
  createElementRegistryItem({
    slug: "web-search",
    title: "Web search",
    description:
      "A search query and its results landing one by one as the agent reads.",
    file: "web-search.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "sources",
    title: "Sources",
    description:
      "Citations collapsed into a pill, expanding into scannable source cards.",
    file: "sources.tsx",
    dependencies: ["lucide-react"],
    usesCollapsible: true,
  }),
  createElementRegistryItem({
    slug: "inline-citation",
    title: "Inline citation",
    description:
      "Numbered references inside a sentence, each with a hover preview of its source.",
    file: "inline-citation.tsx",
    dependencies: ["@base-ui/react"],
  }),
  createElementRegistryItem({
    slug: "image-generation",
    title: "Image generation",
    description:
      "A dot grid holds the frame while the image resolves out of a blur.",
    file: "image-generation.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "data-table",
    title: "Data table",
    description: "A small comparison table the model can answer with directly.",
    file: "data-table.tsx",
  }),
  createElementRegistryItem({
    slug: "number-ticker",
    title: "Number ticker",
    description: "Digits that roll into place as a count updates in real time.",
    file: "number-ticker.tsx",
  }),
  createElementRegistryItem({
    slug: "agent-plan",
    title: "Agent plan",
    description:
      "A checklist the agent works through, with progress you can glance.",
    file: "agent-plan.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "subagent-list",
    title: "Subagent list",
    description:
      "Parallel workers with their own progress, models, and completions.",
    file: "subagent-list.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "agent-status",
    title: "Agent status",
    description:
      "One pill that always answers: what is it doing, and for how long.",
    file: "agent-status.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "approval-card",
    title: "Approval card",
    description:
      "Human in the loop: the agent asks before it runs anything with side effects.",
    file: "approval-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "recommendation-card",
    title: "Recommendation card",
    description:
      "The agent proposes a change with its confidence, and waits for a yes.",
    file: "recommendation-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "artifact-card",
    title: "Artifact card",
    description:
      "A generated document as a tangible object, written live and versioned.",
    file: "artifact-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "composer",
    title: "Composer",
    description:
      "The unified input: attachments, commands, mentions, models, voice, and context in one surface.",
    file: "composer.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "chat-panel",
    title: "Chat panel",
    description:
      "The whole family working together: a message, a pause, a streamed reply.",
    file: "chat-panel.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "empty-state",
    title: "Empty state",
    description:
      "The first screen: a greeting, three ways in, and the composer front and center.",
    file: "empty-state.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "thread-list",
    title: "Thread list",
    description:
      "Conversation history with unread marks and actions that wait for hover.",
    file: "thread-list.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "scroll-anchor",
    title: "Scroll anchor",
    description:
      "Streaming never steals your scroll position; a pill offers the way back down.",
    file: "scroll-anchor.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "conversation-map",
    title: "Conversation map",
    description:
      "A rail of the whole thread: one tick per turn, the turn being read marked and the ones on screen deepened, and a hover preview of what it says.",
    file: "conversation-map.tsx",
    dependencies: ["@base-ui/react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "todo-list",
    title: "Todo list",
    description:
      "The agent's own working list, rewritten mid-run as it discovers what else is needed.",
    file: "todo-list.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "message-queue",
    title: "Message queue",
    description:
      "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
    file: "message-queue.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "message-attachment",
    title: "Attachments in a message",
    description:
      "Files as received rather than staged: an image to open, a document with its page count.",
    file: "message-attachment.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "reviewable-diff",
    title: "Reviewable diff",
    description:
      "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
    file: "reviewable-diff.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["code-diff"],
  }),
  createElementRegistryItem({
    slug: "file-tree",
    title: "File tree",
    description:
      "Everything a run touched, as a tree, with the churn spelled out per file.",
    file: "file-tree.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "elicitation-form",
    title: "Elicitation form",
    description:
      "A server pausing mid-tool-call to ask you for the fields it still needs.",
    file: "elicitation-form.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "retrieval-chunks",
    title: "Retrieval chunks",
    description:
      "The passages a retrieval answer stands on, scored, before the answer itself arrives.",
    file: "retrieval-chunks.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "chart",
    title: "Chart",
    description:
      "Area, line, and bars, with points landing one at a time as the series streams in.",
    file: "chart.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "trace-waterfall",
    title: "Trace waterfall",
    description:
      "Every span in a run on one time axis, nested, so you can see where it actually went.",
    file: "trace-waterfall.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "canvas-split",
    title: "Canvas",
    description:
      "The thread steps aside and the document takes the room, still being written as you read.",
    file: "canvas-split.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "voice-conversation",
    title: "Voice conversation",
    description:
      "A live call: the orb tracks your voice, the caption names the turn, the transcript follows.",
    file: "voice-conversation.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "read-aloud",
    title: "Read aloud",
    description:
      "An answer played back, the spoken word lit as it goes, speed under your thumb.",
    file: "read-aloud.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "mcp-server-panel",
    title: "Server panel",
    description:
      "Which servers are connected, what each one brought, and which is still waiting on you.",
    file: "mcp-server-panel.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "feedback-dialog",
    title: "Feedback dialog",
    description:
      "A thumbs-down that asks why, so the signal arrives with a reason attached.",
    file: "feedback-dialog.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "quote-reply",
    title: "Quote reply",
    description:
      "Select a phrase in an answer and a toolbar offers to quote, explain, or rewrite it.",
    file: "quote-reply.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "edit-message",
    title: "Edit a sent message",
    description:
      "Rewrite a turn in place, told up front how many replies the edit throws away.",
    file: "edit-message.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "stopped-run",
    title: "Stopped run",
    description:
      "You pressed stop. The half-written answer stays, and continuing is one tap away.",
    file: "stopped-run.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "message-timing",
    title: "Timing footer",
    description:
      "What the turn cost: time to first token, throughput, tokens, money.",
    file: "message-timing.tsx",
  }),
  createElementRegistryItem({
    slug: "connection-state",
    title: "Connection state",
    description:
      "The socket drops, the run keeps going on the server, and the stream is picked back up.",
    file: "connection-state.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "agent-card",
    title: "Agent card",
    description:
      "Who you are about to talk to: its skills, its model, and the endpoint behind it.",
    file: "agent-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "web-preview",
    title: "Web preview",
    description:
      "Chrome for a sandboxed preview: a URL bar, reload, and open-in-new around a frame you isolate.",
    file: "web-preview.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "draft-restore",
    title: "Draft restore",
    description:
      "Come back to a thread and the sentence you never sent is still waiting.",
    file: "draft-restore.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "diagram",
    title: "Diagram",
    description:
      "A drawn answer with zoom, reset, and a full-bleed view; you hand it the rendered graphic.",
    file: "diagram.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "flow-graph",
    title: "Flow graph",
    description:
      "Work as a graph rather than a list: branches that fan out and rejoin.",
    file: "flow-graph.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "activity-graph",
    title: "Activity graph",
    description:
      "A half-year of runs as a calendar of cells, dense where the work was.",
    file: "activity-graph.tsx",
    dependencies: ["heat-graph"],
  }),
  createElementRegistryItem({
    slug: "tool-group",
    title: "Parallel tools",
    description:
      "Calls that went out together, collapsed to one row until you want the detail.",
    file: "tool-group.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "context-breakdown",
    title: "Context breakdown",
    description:
      "Where the window actually went: prompt, tools, files, conversation, and what's left.",
    file: "context-breakdown.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "model-picker",
    title: "Model picker",
    description:
      "The full list rather than the rail: grouped by family, priced, with what each one can do.",
    file: "model-picker.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "reasoning-effort",
    title: "Reasoning effort",
    description:
      "How hard to think, and how much of that budget the run actually spent.",
    file: "reasoning-effort.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "guardrail-notice",
    title: "Guardrail notice",
    description:
      "A refusal in its own shape, with the nearest thing it can do instead.",
    file: "guardrail-notice.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "day-separator",
    title: "Timestamps",
    description: "Chronology in a long thread: days marked, times on hover.",
    file: "day-separator.tsx",
  }),
  createElementRegistryItem({
    slug: "speaker-identity",
    title: "Speaker identity",
    description:
      "Who is talking, once a thread holds more than a user and one model.",
    file: "speaker-identity.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "regenerate-menu",
    title: "Regenerate with",
    description:
      "Fork the same turn to a different model instead of rolling the same dice.",
    file: "regenerate-menu.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "confidence-marker",
    title: "Confidence",
    description:
      "Which claims came from a source, which were inferred, and which are guesses.",
    file: "confidence-marker.tsx",
  }),
  createElementRegistryItem({
    slug: "tool-error",
    title: "Tool failure",
    description:
      "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
    file: "tool-error.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "permission-grant",
    title: "Permission grant",
    description:
      "Granting a capability rather than approving one action, with the reach spelled out.",
    file: "permission-grant.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "computer-use",
    title: "Computer use",
    description:
      "The screen the agent is driving, with a cursor trail and what it is doing right now.",
    file: "computer-use.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "code-runner",
    title: "Code runner",
    description:
      "A snippet with a run button, and the output it produced attached below it.",
    file: "code-runner.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "document-reference",
    title: "Document reference",
    description:
      "A document the answer leans on, with the quoted passage and the page to jump to.",
    file: "document-reference.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "memory-chips",
    title: "Memory",
    description:
      "What it now remembers about you, written during the turn and removable.",
    file: "memory-chips.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "research-report",
    title: "Research report",
    description:
      "An outline that fills in section by section, each carrying the sources behind it.",
    file: "research-report.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "map-answer",
    title: "Map",
    description:
      "A location answer: pins, a route between them, and the list they came from.",
    file: "map-answer.tsx",
  }),
  createElementRegistryItem({
    slug: "math-block",
    title: "Math",
    description:
      "Rendered expressions with the working shown, one step at a time.",
    file: "math-block.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "spec-sheet",
    title: "Spec sheet",
    description:
      "The most common structured answer after a table: one object, labeled.",
    file: "spec-sheet.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "comparison-card",
    title: "Comparison",
    description:
      "Two options weighed side by side, with the pick named and argued.",
    file: "comparison-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "timeline",
    title: "Timeline",
    description:
      "Events on a time axis, with what already happened and what is still coming.",
    file: "timeline.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "job-progress",
    title: "Long job",
    description:
      "Work measured in minutes: weighted stages, an ETA, and a way out.",
    file: "job-progress.tsx",
    dependencies: ["lucide-react"],
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "score-breakdown",
    title: "Score breakdown",
    description:
      "A verdict with its arithmetic shown: criteria, weights, and what pulled it down.",
    file: "score-breakdown.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "cost-meter",
    title: "Cost meter",
    description:
      "What the run spent, split by model, against the session total.",
    file: "cost-meter.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "quota-banner",
    title: "Quota",
    description:
      "How much is left, when it comes back, and the way to get more.",
    file: "quota-banner.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "agent-handoff",
    title: "Handoff",
    description:
      "Control passing between agents, with the reason and what came along.",
    file: "agent-handoff.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "background-inbox",
    title: "Background runs",
    description:
      "Work still going somewhere else, and the results waiting to be collected.",
    file: "background-inbox.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "checkpoint-history",
    title: "Checkpoints",
    description:
      "Points you can fall back to, with what each one would give back.",
    file: "checkpoint-history.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "schedule-card",
    title: "Schedule",
    description:
      "A run that repeats on its own, with its cadence and how it has been doing.",
    file: "schedule-card.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "prompt-library",
    title: "Prompt library",
    description:
      "Prompts you saved, searchable, with their variables shown before you insert one.",
    file: "prompt-library.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "command-palette",
    title: "Command palette",
    description:
      "Everything the app can do, one keystroke away and grouped by where it acts.",
    file: "command-palette.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "shared-conversation",
    title: "Shared conversation",
    description:
      "A read-only transcript someone sent you, with a way to pick it up yourself.",
    file: "shared-conversation.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "conversation-search",
    title: "Search in conversation",
    description:
      "Find inside a long thread, with every hit marked down the scrollbar.",
    file: "conversation-search.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "thread-search",
    title: "Thread search",
    description:
      "History you can actually get back into: pinned first, then grouped by when.",
    file: "thread-search.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "launcher-bubble",
    title: "Launcher",
    description: "The floating entry point, and the panel it opens into.",
    file: "launcher-bubble.tsx",
    dependencies: ["lucide-react"],
  }),
  createElementRegistryItem({
    slug: "settings-panel",
    title: "Settings",
    description:
      "Model, system prompt, temperature, and what the assistant is allowed to do.",
    file: "settings-panel.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "onboarding",
    title: "Onboarding",
    description:
      "First run: three moves that teach what this assistant is actually for.",
    file: "onboarding.tsx",
    usesElements: ["range"],
  }),
  createElementRegistryItem({
    slug: "mobile-composer",
    title: "Mobile composer",
    description:
      "The bottom sheet: keyboard-aware, quick actions above, thumb-sized targets.",
    file: "mobile-composer.tsx",
    dependencies: ["lucide-react"],
  }),
];

export const registry: RegistryItem[] = [
  {
    name: "utils",
    type: "registry:lib",
    title: "Utils",
    description:
      "The cn class name helper that every assistant-ui component imports from @/lib/utils.",
    files: [
      {
        type: "registry:lib",
        path: "lib/utils.ts",
        sourcePath: "../../packages/ui/src/lib/utils.ts",
        target: "lib/utils.ts",
      },
    ],
    dependencies: ["cn"],
  },
  ...elementsRegistryItems,
  {
    name: "shimmer-style",
    type: "registry:style",
    title: "Shimmer Style",
    description:
      "Keyframes and theme variables for the streaming shimmer animation.",
    cssVars: {
      theme: {
        "--animate-shimmer":
          "shimmer-sweep var(--shimmer-duration, 1000ms) linear infinite both",
      },
    },
    css: {
      "@keyframes shimmer-sweep": {
        from: {
          "background-position": "150% 0",
        },
        to: {
          "background-position": "-100% 0",
        },
      },
    },
  },
  {
    name: "chat/b/ai-sdk-quick-start/json",
    type: "registry:page",
    title: "AI SDK Quick Start",
    description:
      "Assistant page wired to the AI SDK chat route, with the thread component installed.",
    files: [
      {
        type: "registry:page",
        path: "app/ai-sdk/assistant.tsx",
        target: "app/assistant.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/ai-sdk-backend.json",
      "https://r.assistant-ui.com/thread.json",
    ],
    registryDependencyUsageExemptions: {
      "https://r.assistant-ui.com/ai-sdk-backend.json":
        "Installs the API route used by the page without importing it into the client bundle.",
    },
    dependencies: ["@assistant-ui/ai-sdk"],
    meta: {
      importSpecifier: "Assistant",
      moduleSpecifier: "@/app/assistant",
      nextVersion: "15.1.6",
    },
  },
  {
    name: "ai-sdk-backend",
    type: "registry:page",
    title: "AI SDK Backend",
    description:
      "Next.js route handler that streams chat completions through the AI SDK.",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
    ],
    dependencies: ["ai", "@ai-sdk/openai", "@assistant-ui/ai-sdk"],
  },
  {
    name: "ai-sdk-backend-resumable",
    type: "registry:page",
    title: "AI SDK Resumable Backend",
    description:
      "AI SDK route handlers with resumable stream context, so a run survives a reload.",
    files: [
      {
        type: "registry:page",
        path: "app/api/chat/route.ts",
        sourcePath: "templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
        target: "app/api/chat/route.ts",
      },
      {
        type: "registry:page",
        path: "app/api/chat/resume/[streamId]/route.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/app/api/chat/resume/[streamId]/route.ts",
        target: "app/api/chat/resume/[streamId]/route.ts",
      },
      {
        type: "registry:lib",
        path: "lib/resumable-context.ts",
        sourcePath:
          "templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
        target: "lib/resumable-context.ts",
      },
    ],
    dependencies: [
      "ai",
      "@ai-sdk/openai",
      "@assistant-ui/ai-sdk",
      "assistant-stream",
      "next",
    ],
  },
  {
    name: "eve-chat",
    type: "registry:item",
    title: "Eve Chat",
    description:
      "Chat page for an Eve agent, rendering the session through an assistant-ui thread.",
    files: [
      {
        type: "registry:file",
        path: "app/page.tsx",
        sourcePath: "templates/eve/app/page.tsx",
        target: "app/page.tsx",
      },
    ],
    dependencies: ["@assistant-ui/eve"],
    bundledRegistryDependencies: ["https://r.assistant-ui.com/thread.json"],
    docs: "Eve installs registry files without touching CSS, so add the reasoning and collapsible styles to app/globals.css, and replace the default auth policy in agent/channels/eve.ts before deploying: https://www.assistant-ui.com/docs/runtimes/eve/quickstart",
    meta: {
      eve: {
        requires: ">=0.27.6",
      },
    },
  },
  {
    name: "thread",
    type: "registry:component",
    title: "Thread",
    description:
      "Chat container with message list, composer, auto scroll, and accessibility built in.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/thread.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "button",
      "skeleton",
      "https://r.assistant-ui.com/attachment.json",
      "https://r.assistant-ui.com/file.json",
      "https://r.assistant-ui.com/follow-up-suggestions.json",
      "https://r.assistant-ui.com/image.json",
      "https://r.assistant-ui.com/markdown-text.json",
      "https://r.assistant-ui.com/reasoning.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/tool-fallback.json",
      "https://r.assistant-ui.com/tool-group.json",
    ],
  },
  {
    name: "elements-voice",
    type: "registry:component",
    title: "Voice Orb",
    description:
      "The props-driven voice orb: five session states and four palettes, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/voice.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/voice.tsx",
      },
    ],
    registryDependencies: [],
  },
  {
    name: "elements-context-display",
    type: "registry:component",
    title: "Context Display Core",
    description:
      "The props-driven context usage display: ring, bar, and text presets with the usage popover, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/context-display.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/context-display.tsx",
      },
    ],
    registryDependencies: ["tooltip"],
  },
  {
    name: "voice",
    type: "registry:component",
    title: "Voice",
    description:
      "Realtime voice session controls with connect, mute, and a status indicator.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/voice.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/voice.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-voice.json",
      "button",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
  },
  {
    name: "use-copy-to-clipboard",
    type: "registry:hook",
    title: "Use Copy To Clipboard",
    description: "Copy text to the clipboard with a temporary copied state.",
    files: [
      {
        type: "registry:hook",
        path: "hooks/use-copy-to-clipboard.ts",
        sourcePath: "../../packages/ui/src/hooks/use-copy-to-clipboard.ts",
      },
    ],
  },
  {
    name: "markdown-text",
    type: "registry:component",
    title: "Markdown Text",
    description:
      "Render assistant markdown with headings, lists, links, and code blocks.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/markdown-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/markdown-text.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/use-copy-to-clipboard.json",
    ],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
      "lucide-react",
      "remark-gfm",
    ],
  },
  {
    name: "reasoning",
    type: "registry:component",
    title: "Reasoning",
    description:
      "Collapsible panel for assistant reasoning and thinking content.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/reasoning.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/reasoning.aui.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-reasoning.json",
      "https://r.assistant-ui.com/markdown-text.json",
    ],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "conversation-map",
    type: "registry:component",
    title: "Conversation Map",
    description:
      "Runtime-backed thread rail: a tick per turn, the turn being read marked and the ones on screen deepened, a hover preview, and a click that scrolls there.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/conversation-map.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/conversation-map.aui.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-conversation-map.json",
    ],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "elements-reasoning",
    type: "registry:component",
    title: "Reasoning Panel",
    description:
      "The props-driven reasoning disclosure: streaming preview, fades, and variants, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/reasoning.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/reasoning.tsx",
      },
    ],
    registryDependencies: ["collapsible"],
    dependencies: ["lucide-react", "class-variance-authority", "tw-shimmer"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "message-timing",
    type: "registry:component",
    title: "Message Timing",
    description:
      "Badge with streaming stats: time to first token, total time, and tokens per second.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/message-timing.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/message-timing.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: ["tooltip"],
  },
  {
    name: "context-display",
    type: "registry:component",
    title: "Context Display",
    description:
      "Token usage against a model's context window as a ring, bar, or text, with a hover popover.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/context-display.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/context-display.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "@assistant-ui/ai-sdk"],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-context-display.json",
    ],
  },
  {
    name: "thread-list",
    type: "registry:component",
    title: "Thread List",
    description:
      "Sidebar or dropdown for switching conversations, with search and active selection.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/thread-list.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/thread-list.aui.tsx",
      },
    ],
    registryDependencies: ["button", "input", "skeleton"],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "mcp-config",
    type: "registry:component",
    title: "MCP Config Dialog",
    description:
      "Dialog listing MCP connectors and custom servers, with OAuth and bearer auth controls.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/mcp-config.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/mcp-config.aui.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/badge.json",
      "button",
      "dialog",
      "label",
      "separator",
    ],
    radixRegistryDependencies: ["input"],
    dependencies: [
      "@assistant-ui/react-mcp",
      "@assistant-ui/store",
      "lucide-react",
    ],
  },
  {
    name: "use-attachment-src",
    type: "registry:hook",
    title: "Use Attachment Src",
    description: "Resolve an image attachment to a preview source URL.",
    files: [
      {
        type: "registry:hook",
        path: "hooks/use-attachment-src.ts",
        sourcePath: "../../packages/ui/src/hooks/use-attachment-src.ts",
      },
    ],
    dependencies: ["@assistant-ui/react", "zustand"],
  },
  {
    name: "attachment",
    type: "registry:component",
    title: "Attachment",
    description:
      "Attach files from the composer and view them inside messages.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/attachment.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/attachment.aui.tsx",
      },
    ],
    registryDependencies: [
      "dialog",
      "tooltip",
      "avatar",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/use-attachment-src.json",
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
  },
  {
    name: "follow-up-suggestions",
    type: "registry:component",
    title: "Follow Up Suggestions",
    description:
      "Prompt chips rendered from runtime generated follow up suggestions.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/follow-up-suggestions.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/follow-up-suggestions.aui.tsx",
      },
    ],
    registryDependencies: [],
    dependencies: ["@assistant-ui/react"],
  },
  {
    name: "tooltip-icon-button",
    type: "registry:component",
    title: "Tooltip Icon Button",
    description:
      "Icon button with an accessible tooltip label, shared across the assistant UI components.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/tooltip-icon-button.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/tooltip-icon-button.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    registryDependencies: ["tooltip", "button"],
  },
  {
    name: "syntax-highlighter",
    type: "registry:component",
    title: "Syntax Highlighter",
    description: "Code block highlighting powered by react-syntax-highlighter.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/syntax-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/syntax-highlighter.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-syntax-highlighter",
      "@assistant-ui/react-markdown",
      "react-syntax-highlighter",
      "@types/react-syntax-highlighter",
    ],
  },
  {
    name: "assistant-modal",
    type: "registry:component",
    title: "Assistant Modal",
    description: "Floating chat bubble for support widgets and help desks.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/assistant-modal.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/assistant-modal.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
    ],
    baseRegistryDependencies: ["popover"],
  },
  {
    name: "assistant-sidebar",
    type: "registry:component",
    title: "Assistant Sidebar",
    description:
      "Side panel chat for copilot experiences and inline assistance.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/assistant-sidebar.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/assistant-sidebar.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "resizable",
      "https://r.assistant-ui.com/thread.json",
    ],
  },
  {
    name: "tool-fallback",
    type: "registry:component",
    title: "Tool Fallback",
    description: "Default renderer for tool calls that have no dedicated UI.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/tool-fallback.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/tool-fallback.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react", "tw-shimmer"],
    registryDependencies: ["button", "collapsible", "textarea"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "tool-group",
    type: "registry:component",
    title: "Tool Group",
    description: "Collapsible wrapper around consecutive tool calls.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/tool-group.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/tool-group.aui.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
      "tw-shimmer",
    ],
    registryDependencies: ["collapsible"],
    css: {
      '@import "tw-shimmer"': {},
      ...collapsibleStateCss,
    },
  },
  {
    name: "shiki-highlighter",
    type: "registry:component",
    title: "Shiki Highlighter",
    description: "Code block highlighting powered by react-shiki.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/shiki-highlighter.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/shiki-highlighter.aui.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-shiki-highlighter.json",
    ],
    dependencies: [
      "react-shiki",
      "@assistant-ui/react",
      "@assistant-ui/react-markdown",
    ],
  },
  {
    name: "elements-shiki-highlighter",
    type: "registry:component",
    title: "Shiki Highlighter",
    description:
      "The props-driven Shiki code block: streaming-aware highlighting, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/shiki-highlighter.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/shiki-highlighter.tsx",
      },
    ],
    dependencies: ["react-shiki"],
  },
  {
    name: "mermaid-diagram",
    type: "registry:component",
    title: "Mermaid Diagram",
    description:
      "Render Mermaid diagrams in messages, including while they stream.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/mermaid-diagram.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/mermaid-diagram.aui.tsx",
      },
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-mermaid-diagram.json",
    ],
    dependencies: ["@assistant-ui/react", "@assistant-ui/react-markdown"],
  },
  {
    name: "elements-mermaid-diagram",
    type: "registry:component",
    title: "Mermaid Diagram",
    description:
      "The props-driven Mermaid renderer: zoom overlay, skeleton, and error fallback, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/mermaid-diagram.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/mermaid-diagram.tsx",
      },
    ],
    dependencies: ["beautiful-mermaid", "lucide-react"],
  },
  {
    name: "diff-viewer",
    type: "registry:ui",
    title: "Diff Viewer",
    description: "Render code diffs with highlighted additions and deletions.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/diff-viewer.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/ui/radix/diff-viewer.tsx",
      },
    ],
    dependencies: [
      "diff",
      "parse-diff",
      "@assistant-ui/react-markdown",
      "class-variance-authority",
    ],
  },
  {
    name: "threadlist-sidebar",
    type: "registry:component",
    title: "Thread List Sidebar",
    description: "Sidebar shell that hosts the thread list beside a thread.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/threadlist-sidebar.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/threadlist-sidebar.aui.tsx",
      },
      {
        type: "registry:component",
        path: "components/icons/github.tsx",
        sourcePath: "../../packages/ui/src/components/react/icons/github.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    registryDependencies: [
      "sidebar",
      "https://r.assistant-ui.com/thread-list.json",
    ],
  },
  {
    name: "quote",
    type: "registry:component",
    title: "Quote",
    description:
      "Select and quote message text with a floating toolbar and a composer preview.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/quote.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/quote.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "sources",
    type: "registry:component",
    title: "Sources",
    description:
      "Display URL sources with favicon, title, and an external link.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/sources.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/sources.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "image",
    type: "registry:component",
    title: "Image",
    description:
      "Display image parts with preview, loading states, and a fullscreen dialog.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/image.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/image.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
    registryDependencies: [],
  },
  {
    name: "file",
    type: "registry:component",
    title: "File",
    description:
      "Display file parts with icon, name, size, and a download button.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/file.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/file.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "lucide-react",
      "class-variance-authority",
    ],
  },
  {
    name: "model-selector",
    type: "registry:component",
    title: "Model Selector",
    description:
      "Model picker with reasoning effort levels, search, and runtime integration.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/model-selector.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/model-selector.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-model-selector.json",
    ],
  },
  {
    name: "elements-model-selector",
    type: "registry:component",
    title: "Model Selector",
    description:
      "The props-driven model picker: search, groups, and reasoning effort levels, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/model-selector.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/model-selector.tsx",
      },
    ],
    dependencies: ["lucide-react", "class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: ["command", "popover"],
  },
  {
    name: "logos",
    type: "registry:component",
    title: "Logos",
    description: "Model provider logos as inline SVG components.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/logos.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/logos.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "select",
    type: "registry:ui",
    title: "Select",
    description:
      "Dropdown select with composable trigger, content, and item components.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/select.tsx",
        sourcePath: "../../packages/ui/src/components/react/ui/base/select.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "direction",
    type: "registry:ui",
    title: "Direction Provider",
    description: "Direction provider and hook for right to left layouts.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/direction.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/ui/radix/direction.tsx",
      },
    ],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "badge",
    type: "registry:ui",
    title: "Badge",
    description: "Small label for status, categories, and metadata.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/badge.tsx",
        sourcePath: "../../packages/ui/src/components/react/ui/base/badge.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "tabs",
    type: "registry:ui",
    title: "Tabs",
    description: "Tabs for organizing content into switchable panels.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/tabs.tsx",
        sourcePath: "../../packages/ui/src/components/react/ui/base/tabs.tsx",
      },
    ],
    dependencies: ["class-variance-authority"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
  },
  {
    name: "accordion",
    type: "registry:ui",
    title: "Accordion",
    description: "Stacked headings that reveal or hide content sections.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/accordion.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/ui/base/accordion.tsx",
      },
    ],
    dependencies: ["lucide-react"],
    radixDependencies: ["radix-ui"],
    baseDependencies: ["@base-ui/react"],
    registryDependencies: [],
    css: accordionKeyframesCss,
  },
  {
    name: "dot-matrix",
    type: "registry:ui",
    title: "Dot Matrix",
    description: "5x5 dot matrix indicator with state specific blink patterns.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/dot-matrix.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/ui/radix/dot-matrix.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "number-roll",
    type: "registry:ui",
    title: "Number Roll",
    description:
      "Animated number that rolls its digits odometer style when the value changes.",
    files: [
      {
        type: "registry:ui",
        path: "components/ui/number-roll.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/ui/radix/number-roll.tsx",
      },
    ],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: "heat-graph",
    type: "registry:component",
    title: "Heat Graph",
    description: "Activity heat map with month and weekday labels.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/heat-graph.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/heat-graph.tsx",
      },
    ],
    dependencies: ["heat-graph"],
    registryDependencies: [],
  },
  {
    name: "composer-trigger-popover",
    type: "registry:component",
    title: "Composer Trigger Popover",
    description:
      "Character triggered picker for @ mentions, / commands, and similar popovers.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/composer-trigger-popover.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/composer-trigger-popover.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react", "lucide-react"],
    registryDependencies: [],
  },
  {
    name: "directive-text",
    type: "registry:component",
    title: "Directive Text",
    description: "Render mention directives as inline chips in user messages.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/directive-text.aui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/directive-text.aui.tsx",
      },
    ],
    dependencies: ["@assistant-ui/react"],
    registryDependencies: [
      "https://r.assistant-ui.com/elements-directive-text.json",
    ],
  },
  {
    name: "elements-directive-text",
    type: "registry:component",
    title: "Directive Text",
    description:
      "The props-driven directive chip renderer: bring your own formatter, no runtime required.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/directive-text.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/directive-text.tsx",
      },
    ],
    registryDependencies: ["https://r.assistant-ui.com/badge.json"],
  },
  {
    name: "generative-ui-style",
    type: "registry:style",
    title: "Generative UI Style",
    description: "Theme variables and vocabulary CSS for generative UI output.",
    cssVars: generativeUiThemeVars,
    css: generativeUiVocabularyCss,
  },
  {
    name: "generative-ui",
    type: "registry:component",
    title: "Generative UI",
    description: "Styled component library for rendering generative UI output.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/elements/generative-ui.tsx",
        sourcePath:
          "../../packages/ui/src/components/react/assistant-ui/elements/generative-ui.tsx",
      },
    ],
    dependencies: [
      "@assistant-ui/react-generative-ui",
      "react-markdown",
      "remark-gfm",
    ],
    registryDependencies: [
      "https://r.assistant-ui.com/generative-ui-style.json",
    ],
    registryDependencyUsageExemptions: {
      "https://r.assistant-ui.com/generative-ui-style.json":
        "Installs CSS variables and vocabulary rules consumed through class names.",
    },
  },
];

export const vueRegistry: RegistryItem[] = [];

/**
 * Vue items staged for the `@assistant-ui/vue` publish flip. The build
 * machinery and tests exercise them, but they stay out of the emitted
 * registry until the package they install is public.
 */
export const stagedVueRegistry: RegistryItem[] = [
  {
    name: "thread-list",
    type: "registry:component",
    title: "Thread List",
    description:
      "Sidebar or dropdown for switching conversations, with search and active selection.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread-list.vue",
        sourcePath:
          "../../packages/ui/src/components/vue/assistant-ui/thread-list.vue",
      },
    ],
    dependencies: ["@assistant-ui/vue", "reka-ui", "@lucide/vue"],
  },
  {
    name: "thread",
    type: "registry:component",
    title: "Thread",
    description:
      "Chat container with message list, composer, auto scroll, and accessibility built in.",
    files: [
      {
        type: "registry:component",
        path: "components/assistant-ui/thread.vue",
        sourcePath:
          "../../packages/ui/src/components/vue/assistant-ui/thread.vue",
      },
      {
        type: "registry:component",
        path: "components/assistant-ui/message.vue",
        sourcePath:
          "../../packages/ui/src/components/vue/assistant-ui/message.vue",
      },
      {
        type: "registry:component",
        path: "components/assistant-ui/markdown-text.vue",
        sourcePath:
          "../../packages/ui/src/components/vue/assistant-ui/markdown-text.vue",
      },
    ],
    dependencies: [
      "@assistant-ui/core",
      "@assistant-ui/vue",
      "@lucide/vue",
      "markdown-it",
    ],
    devDependencies: ["@types/markdown-it"],
  },
];
