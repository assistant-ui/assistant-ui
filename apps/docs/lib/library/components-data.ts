/** Something only some elements are, which the Components tab can filter by. */
export type LibraryTrait = "aui" | "generative" | "native" | "vue";

export const LIBRARY_TRAITS: readonly { id: LibraryTrait; label: string }[] = [
  { id: "aui", label: "AUI connected" },
  { id: "generative", label: "Generative" },
  { id: "native", label: "React Native" },
  { id: "vue", label: "Vue" },
];

/** A component on the library's Components tab. `slug` is the last part of its page's address. */
export type LibraryComponent = {
  slug: string;
  name: string;
  description: string;
  /** Its page, when it is not under /elements. */
  href?: string;
  /** Absent when the component's page gives its source to copy. */
  command?: string;
  /** What to tell a coding agent to add it. */
  prompt: string;
  traits?: readonly LibraryTrait[];
};

export const LIBRARY_ELEMENTS: readonly LibraryComponent[] = [
  {
    slug: "loading-state",
    name: "Loader",
    description:
      "A pixel matrix that keeps time while the model has nothing to show yet.",
    command: "npx shadcn@latest add @assistant-ui/elements-loading-state",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/loading-state`",
  },
  {
    slug: "thinking-indicator",
    name: "Thinking indicator",
    description:
      "A live status line that names what the agent is doing right now, with elapsed time.",
    command: "npx shadcn@latest add @assistant-ui/elements-thinking-indicator",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thinking-indicator`",
  },
  {
    slug: "streaming-text",
    name: "Streaming text",
    description:
      "Tokens arrive softly: the newest words land in blue and settle into ink.",
    command: "npx shadcn@latest add @assistant-ui/elements-streaming-text",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/streaming-text`",
  },
  {
    slug: "typing-indicator",
    name: "Typing indicator",
    description:
      "The classic three dots, tuned to read as presence rather than noise.",
    command: "npx shadcn@latest add @assistant-ui/elements-typing-indicator",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/typing-indicator`",
    traits: ["native"],
  },
  {
    slug: "reasoning-effort",
    name: "Reasoning effort",
    description:
      "How hard to think, and how much of that budget the run actually spent.",
    command: "npx shadcn@latest add @assistant-ui/elements-reasoning-effort",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/reasoning-effort`",
  },
  {
    slug: "guardrail-notice",
    name: "Guardrail notice",
    description:
      "A refusal in its own shape, with the nearest thing it can do instead.",
    command: "npx shadcn@latest add @assistant-ui/elements-guardrail-notice",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/guardrail-notice`",
  },
  {
    slug: "message-pair",
    name: "Message pair",
    description:
      "A user bubble and a streaming assistant reply, with actions that appear on hover.",
    command: "npx shadcn@latest add @assistant-ui/elements-message-pair",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/message-pair`",
  },
  {
    slug: "message-branches",
    name: "Message branches",
    description:
      "Navigate between regenerated versions of the same answer without losing your place.",
    command: "npx shadcn@latest add @assistant-ui/elements-message-branches",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/message-branches`",
  },
  {
    slug: "message-actions",
    name: "Message actions",
    description:
      "Copy, rate, and regenerate. Each action confirms itself with a small state change.",
    command: "npx shadcn@latest add @assistant-ui/elements-message-actions",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/message-actions`",
  },
  {
    slug: "error-state",
    name: "Error state",
    description:
      "A quiet failure banner with a retry path, not a modal in your face.",
    command: "npx shadcn@latest add @assistant-ui/elements-error-state",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/error-state`",
    traits: ["native"],
  },
  {
    slug: "message-queue",
    name: "Message queue",
    description:
      "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
    command: "npx shadcn@latest add @assistant-ui/elements-message-queue",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/message-queue`",
    traits: ["native"],
  },
  {
    slug: "edit-message",
    name: "Edit a sent message",
    description:
      "Rewrite a turn in place as a new branch, told up front how many replies stay behind on the old one.",
    command: "npx shadcn@latest add @assistant-ui/elements-edit-message",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/edit-message`",
  },
  {
    slug: "feedback-dialog",
    name: "Feedback dialog",
    description:
      "A thumbs-down that asks why, so the signal arrives with a reason attached.",
    command: "npx shadcn@latest add @assistant-ui/elements-feedback-dialog",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/feedback-dialog`",
  },
  {
    slug: "stopped-run",
    name: "Stopped run",
    description:
      "You pressed stop. The half-written answer stays, and continuing is one tap away.",
    command: "npx shadcn@latest add @assistant-ui/elements-stopped-run",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/stopped-run`",
    traits: ["native"],
  },
  {
    slug: "day-separator",
    name: "Timestamps",
    description: "Chronology in a long thread: days marked, times on hover.",
    command: "npx shadcn@latest add @assistant-ui/elements-day-separator",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/day-separator`",
  },
  {
    slug: "speaker-identity",
    name: "Speaker identity",
    description:
      "Who is talking, once a thread holds more than a user and one model.",
    command: "npx shadcn@latest add @assistant-ui/elements-speaker-identity",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/speaker-identity`",
  },
  {
    slug: "regenerate-menu",
    name: "Regenerate with",
    description:
      "Fork the same turn to a different model instead of rolling the same dice.",
    command: "npx shadcn@latest add @assistant-ui/elements-regenerate-menu",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/regenerate-menu`",
  },
  {
    slug: "confidence-marker",
    name: "Confidence",
    description:
      "Which claims came from a source, which were inferred, and which are guesses.",
    command: "npx shadcn@latest add @assistant-ui/elements-confidence-marker",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/confidence-marker`",
  },
  {
    slug: "tool-call",
    name: "Tool call",
    description:
      "One tool invocation with its request and result tucked behind a disclosure.",
    command: "npx shadcn@latest add @assistant-ui/elements-tool-call",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tool-call`",
  },
  {
    slug: "run-activity",
    name: "Run activity",
    description:
      "Commentary and tools in one disclosure, with the final answer always visible.",
    command: "npx shadcn@latest add @assistant-ui/elements-run-activity",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/run-activity`",
  },
  {
    slug: "tool-timeline",
    name: "Tool timeline",
    description:
      "A whole working session summarized as verbs, targets, and file stats.",
    command: "npx shadcn@latest add @assistant-ui/elements-tool-timeline",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tool-timeline`",
    traits: ["native"],
  },
  {
    slug: "terminal-block",
    name: "Terminal block",
    description:
      "Command output that streams line by line and ends with an exit status.",
    command: "npx shadcn@latest add @assistant-ui/elements-terminal-block",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/terminal-block`",
  },
  {
    slug: "code-diff",
    name: "Code diff",
    description:
      "A unified diff with tinted additions and removals, sized for chat.",
    command: "npx shadcn@latest add @assistant-ui/elements-code-diff",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/code-diff`",
  },
  {
    slug: "reviewable-diff",
    name: "Reviewable diff",
    description:
      "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
    command: "npx shadcn@latest add @assistant-ui/elements-reviewable-diff",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/reviewable-diff`",
  },
  {
    slug: "file-tree",
    name: "File tree",
    description:
      "Everything a run touched, as a tree, with the churn spelled out per file.",
    command: "npx shadcn@latest add @assistant-ui/elements-file-tree",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/file-tree`",
  },
  {
    slug: "elicitation-form",
    name: "Elicitation form",
    description:
      "A server pausing mid-tool-call to ask you for the fields it still needs.",
    command: "npx shadcn@latest add @assistant-ui/elements-elicitation-form",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/elicitation-form`",
  },
  {
    slug: "mcp-server-panel",
    name: "Server panel",
    description:
      "Which servers are connected, what each one brought, and which is still waiting on you.",
    command: "npx shadcn@latest add @assistant-ui/elements-mcp-server-panel",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/mcp-server-panel`",
  },
  {
    slug: "tool-error",
    name: "Tool failure",
    description:
      "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
    command: "npx shadcn@latest add @assistant-ui/elements-tool-error",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tool-error`",
  },
  {
    slug: "permission-grant",
    name: "Permission grant",
    description:
      "Granting a capability rather than approving one action, with the reach spelled out.",
    command: "npx shadcn@latest add @assistant-ui/elements-permission-grant",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/permission-grant`",
  },
  {
    slug: "computer-use",
    name: "Computer use",
    description:
      "The screen the agent is driving, with a cursor trail and what it is doing right now.",
    command: "npx shadcn@latest add @assistant-ui/elements-computer-use",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/computer-use`",
  },
  {
    slug: "code-runner",
    name: "Code runner",
    description:
      "A snippet with a run button, and the output it produced attached below it.",
    command: "npx shadcn@latest add @assistant-ui/elements-code-runner",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/code-runner`",
  },
  {
    slug: "web-search",
    name: "Web search",
    description:
      "A search query and its results landing one by one as the agent reads.",
    command: "npx shadcn@latest add @assistant-ui/elements-web-search",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/web-search`",
  },
  {
    slug: "inline-citation",
    name: "Inline citation",
    description:
      "Numbered references inside a sentence, each with a hover preview of its source.",
    command: "npx shadcn@latest add @assistant-ui/elements-inline-citation",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/inline-citation`",
  },
  {
    slug: "link-preview",
    name: "Link preview",
    description:
      "A returned URL unfurled into a card with enough context to decide whether to open it.",
    command: "npx shadcn@latest add @assistant-ui/elements-link-preview",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/link-preview`",
  },
  {
    slug: "image-generation",
    name: "Image generation",
    description:
      "A dot grid holds the frame while the image resolves out of a blur.",
    command: "npx shadcn@latest add @assistant-ui/elements-image-generation",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/image-generation`",
  },
  {
    slug: "image-gallery",
    name: "Image gallery",
    description:
      "A compact grid of returned images that opens each one in a shared lightbox.",
    command: "npx shadcn@latest add @assistant-ui/elements-image-gallery",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/image-gallery`",
  },
  {
    slug: "retrieval-chunks",
    name: "Retrieval chunks",
    description:
      "The passages a retrieval answer stands on, scored, before the answer itself arrives.",
    command: "npx shadcn@latest add @assistant-ui/elements-retrieval-chunks",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/retrieval-chunks`",
  },
  {
    slug: "document-reference",
    name: "Document reference",
    description:
      "A document the answer leans on, with the quoted passage and the page to jump to.",
    command: "npx shadcn@latest add @assistant-ui/elements-document-reference",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/document-reference`",
  },
  {
    slug: "memory-chips",
    name: "Memory",
    description:
      "What it now remembers about you, written during the turn and removable.",
    command: "npx shadcn@latest add @assistant-ui/elements-memory-chips",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/memory-chips`",
  },
  {
    slug: "research-report",
    name: "Research report",
    description:
      "An outline that fills in section by section, each carrying the sources behind it.",
    command: "npx shadcn@latest add @assistant-ui/elements-research-report",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/research-report`",
  },
  {
    slug: "map-answer",
    name: "Map",
    description:
      "A location answer: pins, a route between them, and the list they came from.",
    command: "npx shadcn@latest add @assistant-ui/elements-map-answer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/map-answer`",
  },
  {
    slug: "geo-map",
    name: "Geo map",
    description:
      "Places and routes on a real tiled map, with an accessible list of every place.",
    command: "npx shadcn@latest add @assistant-ui/elements-geo-map",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/geo-map`",
  },
  {
    slug: "data-table",
    name: "Data table",
    description:
      "A tool's rows and columns with formatting, sorting, and a card layout in narrow columns.",
    command: "npx shadcn@latest add @assistant-ui/elements-data-table",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/data-table`",
  },
  {
    slug: "number-ticker",
    name: "Number ticker",
    description: "Digits that roll into place as a count updates in real time.",
    command: "npx shadcn@latest add @assistant-ui/elements-number-ticker",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/number-ticker`",
  },
  {
    slug: "chart",
    name: "Chart",
    description:
      "Area, line, and bars, with points landing one at a time as the series streams in.",
    command: "npx shadcn@latest add @assistant-ui/elements-chart",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/chart`",
  },
  {
    slug: "media-player",
    name: "Media player",
    description:
      "Audio and video a tool returned, played inline without leaving the thread.",
    command: "npx shadcn@latest add @assistant-ui/elements-media-player",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/media-player`",
  },
  {
    slug: "web-preview",
    name: "Web preview",
    description:
      "Chrome for a sandboxed preview: a URL bar, reload, and open-in-new around a frame you isolate.",
    command: "npx shadcn@latest add @assistant-ui/elements-web-preview",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/web-preview`",
  },
  {
    slug: "diagram",
    name: "Diagram",
    description:
      "A drawn answer with zoom, reset, and a full-bleed view; you hand it the rendered graphic.",
    command: "npx shadcn@latest add @assistant-ui/elements-diagram",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/diagram`",
  },
  {
    slug: "flow-graph",
    name: "Flow graph",
    description:
      "Work as a graph rather than a list: branches that fan out and rejoin.",
    command: "npx shadcn@latest add @assistant-ui/elements-flow-graph",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/flow-graph`",
  },
  {
    slug: "activity-graph",
    name: "Activity graph",
    description:
      "A half-year of runs as a calendar of cells, dense where the work was.",
    command: "npx shadcn@latest add @assistant-ui/elements-activity-graph",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/activity-graph`",
  },
  {
    slug: "math-block",
    name: "Math",
    description:
      "Rendered expressions with the working shown, one step at a time.",
    command: "npx shadcn@latest add @assistant-ui/elements-math-block",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/math-block`",
  },
  {
    slug: "spec-sheet",
    name: "Spec sheet",
    description:
      "The most common structured answer after a table: one object, labeled.",
    command: "npx shadcn@latest add @assistant-ui/elements-spec-sheet",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/spec-sheet`",
  },
  {
    slug: "comparison-card",
    name: "Comparison",
    description:
      "Two options weighed side by side, with the pick named and argued.",
    command: "npx shadcn@latest add @assistant-ui/elements-comparison-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/comparison-card`",
  },
  {
    slug: "timeline",
    name: "Timeline",
    description:
      "Events on a time axis, with what already happened and what is still coming.",
    command: "npx shadcn@latest add @assistant-ui/elements-timeline",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/timeline`",
  },
  {
    slug: "job-progress",
    name: "Job progress",
    description:
      "Work measured in minutes: weighted stages, an ETA, and a way out.",
    command: "npx shadcn@latest add @assistant-ui/elements-job-progress",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/job-progress`",
  },
  {
    slug: "score-breakdown",
    name: "Score breakdown",
    description:
      "A verdict with its arithmetic shown: criteria, weights, and what pulled it down.",
    command: "npx shadcn@latest add @assistant-ui/elements-score-breakdown",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/score-breakdown`",
  },
  {
    slug: "agent-plan",
    name: "Agent plan",
    description:
      "A checklist the agent works through, with progress you can glance.",
    command: "npx shadcn@latest add @assistant-ui/elements-agent-plan",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/agent-plan`",
  },
  {
    slug: "subagent-list",
    name: "Subagent list",
    description:
      "Parallel workers with their own progress, models, and completions.",
    command: "npx shadcn@latest add @assistant-ui/elements-subagent-list",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/subagent-list`",
  },
  {
    slug: "task-card",
    name: "Task card",
    description:
      "A delegated task with its state, timing, result, and transcript in one card.",
    command: "npx shadcn@latest add @assistant-ui/task-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/task-card`",
    traits: ["aui", "native"],
  },
  {
    slug: "agent-status",
    name: "Agent status",
    description:
      "One pill that always answers: what is it doing, and for how long.",
    command: "npx shadcn@latest add @assistant-ui/agent-status",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/agent-status`",
    traits: ["aui", "native"],
  },
  {
    slug: "approval-card",
    name: "Approval card",
    description:
      "Human in the loop: the agent asks before it runs anything with side effects.",
    command: "npx shadcn@latest add @assistant-ui/elements-approval-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/approval-card`",
    traits: ["native"],
  },
  {
    slug: "option-list",
    name: "Option list",
    description:
      "The agent asks a question with a few answers; the pick returns to it and stays as a receipt.",
    command: "npx shadcn@latest add @assistant-ui/elements-option-list",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/option-list`",
  },
  {
    slug: "question-flow",
    name: "Question flow",
    description:
      "A few short questions asked one at a time, answered together and kept as a receipt.",
    command: "npx shadcn@latest add @assistant-ui/elements-question-flow",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/question-flow`",
  },
  {
    slug: "recommendation-card",
    name: "Recommendation card",
    description:
      "The agent proposes a change with its confidence, and waits for a yes.",
    command: "npx shadcn@latest add @assistant-ui/elements-recommendation-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/recommendation-card`",
  },
  {
    slug: "artifact-card",
    name: "Artifact card",
    description:
      "A generated document as a tangible object, written live and versioned.",
    command: "npx shadcn@latest add @assistant-ui/elements-artifact-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/artifact-card`",
  },
  {
    slug: "todo-list",
    name: "Todo list",
    description:
      "The agent's own working list, rewritten mid-run as it discovers what else is needed.",
    command: "npx shadcn@latest add @assistant-ui/elements-todo-list",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/todo-list`",
  },
  {
    slug: "agent-card",
    name: "Agent card",
    description:
      "Who you are about to talk to: its skills, its model, and the endpoint behind it.",
    command: "npx shadcn@latest add @assistant-ui/elements-agent-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/agent-card`",
  },
  {
    slug: "agent-handoff",
    name: "Handoff",
    description:
      "Control passing between agents, with the reason and what came along.",
    command: "npx shadcn@latest add @assistant-ui/elements-agent-handoff",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/agent-handoff`",
  },
  {
    slug: "background-inbox",
    name: "Background runs",
    description:
      "Work still going somewhere else, and the results waiting to be collected.",
    command: "npx shadcn@latest add @assistant-ui/elements-background-inbox",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/background-inbox`",
  },
  {
    slug: "checkpoint-history",
    name: "Checkpoints",
    description:
      "Points you can fall back to, with what each one would give back.",
    command: "npx shadcn@latest add @assistant-ui/elements-checkpoint-history",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/checkpoint-history`",
  },
  {
    slug: "schedule-card",
    name: "Schedule",
    description:
      "A run that repeats on its own, with its cadence and how it has been doing.",
    command: "npx shadcn@latest add @assistant-ui/elements-schedule-card",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/schedule-card`",
  },
  {
    slug: "trace-waterfall",
    name: "Trace waterfall",
    description:
      "Every span in a run on one time axis, nested, so you can see where it actually went.",
    command: "npx shadcn@latest add @assistant-ui/elements-trace-waterfall",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/trace-waterfall`",
  },
  {
    slug: "cost-meter",
    name: "Cost meter",
    description:
      "What the run spent, split by model, against the session total.",
    command: "npx shadcn@latest add @assistant-ui/elements-cost-meter",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/cost-meter`",
  },
  {
    slug: "quota-banner",
    name: "Quota banner",
    description:
      "How much is left, when it comes back, and the way to get more.",
    command: "npx shadcn@latest add @assistant-ui/elements-quota-banner",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/quota-banner`",
  },
  {
    slug: "composer",
    name: "Composer",
    description:
      "The unified input: attachments, commands, mentions, models, voice, and context in one surface.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer`",
  },
  {
    slug: "composer-slash-commands",
    name: "Slash commands",
    description:
      "Type a slash and the command menu floats above the input, filtering as you continue.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-slash-commands`",
  },
  {
    slug: "composer-mentions",
    name: "Mentions",
    description:
      "Type @ to pull people and agents into the conversation, filtered as you go.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-mentions`",
  },
  {
    slug: "composer-attachments",
    name: "Attachments",
    description:
      "Files stage inside the composer with per-file progress before the message sends.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-attachments`",
  },
  {
    slug: "composer-model-picker",
    name: "Models",
    description:
      "The model lives in the composer rail, one tap away with context at a glance.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-model-picker`",
  },
  {
    slug: "composer-voice",
    name: "Dictation",
    description:
      "The mic morphs the input into a live waveform, then lands the transcript as text.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-voice`",
  },
  {
    slug: "composer-context",
    name: "Context",
    description:
      "A token ring in the rail fills as the conversation grows, warning near the limit.",
    command: "npx shadcn@latest add @assistant-ui/elements-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-context`",
  },
  {
    slug: "draft-restore",
    name: "Draft restore",
    description:
      "Come back to a thread and the sentence you never sent is still waiting.",
    command: "npx shadcn@latest add @assistant-ui/elements-draft-restore",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/draft-restore`",
  },
  {
    slug: "context-breakdown",
    name: "Context breakdown",
    description:
      "Where the window actually went: prompt, tools, files, conversation, and what's left.",
    command: "npx shadcn@latest add @assistant-ui/elements-context-breakdown",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/context-breakdown`",
  },
  {
    slug: "prompt-library",
    name: "Prompt library",
    description:
      "Prompts you saved, searchable, with their variables shown before you insert one.",
    command: "npx shadcn@latest add @assistant-ui/elements-prompt-library",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/prompt-library`",
  },
  {
    slug: "command-palette",
    name: "Command palette",
    description:
      "Everything the app can do, one keystroke away and grouped by where it acts.",
    command: "npx shadcn@latest add @assistant-ui/elements-command-palette",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/command-palette`",
  },
  {
    slug: "voice-conversation",
    name: "Voice conversation",
    description:
      "A live call: the orb tracks your voice, the caption names the turn, the transcript follows.",
    command: "npx shadcn@latest add @assistant-ui/voice-conversation",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/voice-conversation`",
    traits: ["aui", "native"],
  },
  {
    slug: "read-aloud",
    name: "Read aloud",
    description:
      "An answer played back, the spoken word lit as it goes, speed under your thumb.",
    command: "npx shadcn@latest add @assistant-ui/elements-read-aloud",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/read-aloud`",
  },
  {
    slug: "chat-panel",
    name: "Chat panel",
    description:
      "The whole family working together: a message, a pause, a streamed reply.",
    command: "npx shadcn@latest add @assistant-ui/elements-chat-panel",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/chat-panel`",
  },
  {
    slug: "empty-state",
    name: "Empty state",
    description:
      "The first screen: a greeting, three ways in, and the composer front and center.",
    command: "npx shadcn@latest add @assistant-ui/elements-empty-state",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/empty-state`",
  },
  {
    slug: "scroll-anchor",
    name: "Scroll anchor",
    description:
      "Streaming never steals your scroll position; a pill offers the way back down.",
    command: "npx shadcn@latest add @assistant-ui/elements-scroll-anchor",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/scroll-anchor`",
  },
  {
    slug: "canvas-split",
    name: "Canvas",
    description:
      "The thread steps aside and the document takes the room, still being written as you read.",
    command: "npx shadcn@latest add @assistant-ui/elements-canvas-split",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/canvas-split`",
  },
  {
    slug: "connection-state",
    name: "Connection state",
    description:
      "The socket drops, the run keeps going on the server, and the stream is picked back up.",
    command: "npx shadcn@latest add @assistant-ui/elements-connection-state",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/connection-state`",
  },
  {
    slug: "shared-conversation",
    name: "Shared conversation",
    description:
      "A read-only transcript someone sent you, with a way to pick it up yourself.",
    command: "npx shadcn@latest add @assistant-ui/elements-shared-conversation",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/shared-conversation`",
  },
  {
    slug: "conversation-search",
    name: "Search in conversation",
    description:
      "Find inside a long thread, with every hit marked down the scrollbar.",
    command: "npx shadcn@latest add @assistant-ui/elements-conversation-search",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/conversation-search`",
  },
  {
    slug: "thread-search",
    name: "Thread search",
    description:
      "History you can actually get back into: pinned first, then grouped by when.",
    command: "npx shadcn@latest add @assistant-ui/elements-thread-search",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread-search`",
  },
  {
    slug: "launcher-bubble",
    name: "Launcher",
    description: "The floating entry point, and the panel it opens into.",
    command: "npx shadcn@latest add @assistant-ui/elements-launcher-bubble",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/launcher-bubble`",
  },
  {
    slug: "settings-panel",
    name: "Settings",
    description:
      "Model, system prompt, temperature, and what the assistant is allowed to do.",
    command: "npx shadcn@latest add @assistant-ui/elements-settings-panel",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/settings-panel`",
  },
  {
    slug: "onboarding",
    name: "Onboarding",
    description:
      "First run: three moves that teach what this assistant is actually for.",
    command: "npx shadcn@latest add @assistant-ui/elements-onboarding",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/onboarding`",
  },
  {
    slug: "mobile-composer",
    name: "Mobile composer",
    description:
      "The bottom sheet: keyboard-aware, quick actions above, thumb-sized targets.",
    command: "npx shadcn@latest add @assistant-ui/elements-mobile-composer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/mobile-composer`",
  },
  {
    slug: "thread",
    name: "Thread",
    description:
      "A complete chat container with messages, composer, auto-scroll, and accessibility built in.",
    command: "npx shadcn@latest add @assistant-ui/thread",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread`",
    traits: ["aui", "native", "vue"],
  },
  {
    slug: "assistant-modal",
    name: "Assistant modal",
    description:
      "A floating chat bubble for support widgets, help desks, and embedded assistants, with a thread list and a resizable window.",
    command: "npx shadcn@latest add @assistant-ui/assistant-modal",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/assistant-modal`",
    traits: ["aui"],
  },
  {
    slug: "assistant-sidebar",
    name: "Assistant sidebar",
    description:
      "A resizable side panel for copilot experiences and contextual assistance.",
    command: "npx shadcn@latest add @assistant-ui/assistant-sidebar",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/assistant-sidebar`",
    traits: ["aui"],
  },
  {
    slug: "thread-list",
    name: "Thread list",
    description:
      "Runtime-backed conversation switching with search, active selection, and thread actions.",
    command: "npx shadcn@latest add @assistant-ui/thread-list",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread-list`",
    traits: ["aui", "native", "vue"],
  },
  {
    slug: "thread-list-sidebar",
    name: "Thread list sidebar",
    description:
      "A complete sidebar shell that places the runtime thread list beside the active conversation.",
    command: "npx shadcn@latest add @assistant-ui/threadlist-sidebar",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread-list-sidebar`",
    traits: ["aui"],
  },
  {
    slug: "orb",
    name: "Orb",
    description:
      "The realtime voice orb, with connection, mute, and speaking state controls.",
    command: "npx shadcn@latest add @assistant-ui/voice",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/orb`",
    traits: ["aui"],
  },
  {
    slug: "reasoning",
    name: "Reasoning",
    description:
      "A collapsible renderer for assistant reasoning that follows the active message part.",
    command: "npx shadcn@latest add @assistant-ui/reasoning",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/reasoning`",
    traits: ["aui", "native"],
  },
  {
    slug: "message-timing",
    name: "Message timing",
    description:
      "Streaming statistics for the current message, including first token, total time, and speed.",
    command: "npx shadcn@latest add @assistant-ui/message-timing",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/message-timing`",
    traits: ["aui"],
  },
  {
    slug: "conversation-map",
    name: "Conversation map",
    description:
      "A rail of the whole thread: one tick per turn, the turn being read marked and the ones on screen deepened, a hover preview, and a click that jumps there.",
    command: "npx shadcn@latest add @assistant-ui/conversation-map",
    prompt: "set up https://www.assistant-ui.com/elements/conversation-map",
    traits: ["aui", "native"],
  },
  {
    slug: "context-display",
    name: "Context display",
    description:
      "Model context usage as a ring, bar, or text value with a detailed hover view.",
    command: "npx shadcn@latest add @assistant-ui/context-display",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/context-display`",
    traits: ["aui"],
  },
  {
    slug: "mcp-config",
    name: "MCP config dialog",
    description:
      "A dialog for connectors and custom MCP servers, including authentication and connection state.",
    command: "npx shadcn@latest add @assistant-ui/mcp-config",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/mcp-config`",
    traits: ["aui"],
  },
  {
    slug: "attachment",
    name: "Attachment",
    description:
      "Runtime attachments for the composer and messages, with previews, progress, and removal.",
    command: "npx shadcn@latest add @assistant-ui/attachment",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/attachment`",
    traits: ["aui", "native"],
  },
  {
    slug: "follow-up-suggestions",
    name: "Follow-up suggestions",
    description:
      "Prompt chips populated from the runtime's generated follow-up suggestions.",
    command: "npx shadcn@latest add @assistant-ui/follow-up-suggestions",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/follow-up-suggestions`",
    traits: ["aui"],
  },
  {
    slug: "tool-fallback",
    name: "Tool fallback",
    description:
      "The default runtime renderer for tool calls that do not have dedicated UI.",
    command: "npx shadcn@latest add @assistant-ui/tool-fallback",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tool-fallback`",
    traits: ["aui", "native"],
  },
  {
    slug: "tool-group",
    name: "Tool group",
    description:
      "A collapsible runtime wrapper around consecutive tool calls in one assistant turn.",
    command: "npx shadcn@latest add @assistant-ui/tool-group",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tool-group`",
    traits: ["aui"],
  },
  {
    slug: "quote",
    name: "Quote",
    description:
      "Select message text, quote it from a floating toolbar, and carry it into the composer.",
    command: "npx shadcn@latest add @assistant-ui/quote",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/quote`",
    traits: ["aui"],
  },
  {
    slug: "sources",
    name: "Sources",
    description:
      "Runtime source links for URLs, with an opt-in favicon, and file badges for documents.",
    command: "npx shadcn@latest add @assistant-ui/sources",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/sources`",
    traits: ["aui"],
  },
  {
    slug: "image",
    name: "Image",
    description:
      "Image message parts with preview, loading states, actions, and a fullscreen view.",
    command: "npx shadcn@latest add @assistant-ui/image",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/image`",
    traits: ["aui", "native"],
  },
  {
    slug: "file",
    name: "File",
    description:
      "File message parts with type-aware icons, filename, size, and download actions.",
    command: "npx shadcn@latest add @assistant-ui/file",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/file`",
    traits: ["aui", "native"],
  },
  {
    slug: "model-selector",
    name: "Model selector",
    description:
      "A searchable runtime model picker with grouped providers and reasoning effort controls.",
    command: "npx shadcn@latest add @assistant-ui/model-selector",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/model-selector`",
    traits: ["aui"],
  },
  {
    slug: "composer-trigger-popover",
    name: "Composer trigger popover",
    description:
      "A character-triggered picker for mentions, slash commands, and nested composer actions.",
    command: "npx shadcn@latest add @assistant-ui/composer-trigger-popover",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/composer-trigger-popover`",
    traits: ["aui"],
  },
  {
    slug: "directive-text",
    name: "Directive text",
    description:
      "A message renderer that turns mention directives into inline, runtime-aware chips.",
    command: "npx shadcn@latest add @assistant-ui/directive-text",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/directive-text`",
    traits: ["aui"],
  },
  {
    slug: "markdown-text",
    name: "Markdown text",
    description:
      "Assistant markdown with headings, lists, links, tables, and code blocks.",
    command: "npx shadcn@latest add @assistant-ui/markdown-text",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/markdown-text`",
    traits: ["aui", "native"],
  },
  {
    slug: "syntax-highlighter",
    name: "Syntax highlighter",
    description:
      "Prism-based code highlighting for assistant markdown code blocks.",
    command: "npx shadcn@latest add @assistant-ui/syntax-highlighter",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/syntax-highlighter`",
  },
  {
    slug: "shiki-highlighter",
    name: "Shiki highlighter",
    description:
      "Shiki code highlighting that defers tokenization until a message part settles.",
    command: "npx shadcn@latest add @assistant-ui/shiki-highlighter",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/shiki-highlighter`",
    traits: ["aui"],
  },
  {
    slug: "mermaid-diagram",
    name: "Mermaid diagram",
    description:
      "Mermaid diagrams rendered inside messages, including partial streaming input.",
    command: "npx shadcn@latest add @assistant-ui/mermaid-diagram",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/mermaid-diagram`",
  },
  {
    slug: "generative-ui",
    name: "Generative UI",
    description:
      "A styled component library for rendering structured generative UI output.",
    command: "npx shadcn@latest add @assistant-ui/generative-ui",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/generative-ui`",
  },
  {
    slug: "tooltip-icon-button",
    name: "Tooltip icon button",
    description:
      "An accessible icon button with a tooltip label and shared interaction states.",
    command: "npx shadcn@latest add @assistant-ui/tooltip-icon-button",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/tooltip-icon-button`",
  },
  {
    slug: "logos",
    name: "Model logos",
    description:
      "Inline SVG marks for OpenAI, Anthropic, and Google model providers.",
    command: "npx shadcn@latest add @assistant-ui/logos",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/logos`",
  },
  {
    slug: "heat-graph",
    name: "Heat graph",
    description:
      "An activity heat map with month labels, weekday labels, legend, and tooltip.",
    command: "npx shadcn@latest add @assistant-ui/heat-graph",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/heat-graph`",
  },
  {
    slug: "generative-stays",
    name: "Riverside Loft",
    description:
      "A stay card with a photo, location and rating details, and a booking action.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-stays",
    traits: ["generative"],
  },
  {
    slug: "generative-booking",
    name: "Table reservation",
    description:
      "A booking form collecting party size, date, and seating preference, submitted through the Card form model.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-booking",
    traits: ["generative"],
  },
  {
    slug: "generative-order-status",
    name: "Order tracking",
    description:
      "An order status card with a delivery timeline, badges per step, and quick actions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-order-status",
    traits: ["generative"],
  },
  {
    slug: "generative-flight-tracker",
    name: "Flight tracker",
    description:
      "A flight card with a live route progress bar between origin and destination.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-flight-tracker",
    traits: ["generative"],
  },
  {
    slug: "generative-portfolio",
    name: "Portfolio overview",
    description:
      "A holdings summary combining key facts, an axis-labeled bar chart, and a table of positions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-portfolio",
    traits: ["generative"],
  },
  {
    slug: "generative-create-event",
    name: "Create event",
    description:
      "A calendar day summary with three upcoming events and confirm/cancel actions to add it to the calendar.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-create-event",
    traits: ["generative"],
  },
  {
    slug: "generative-view-event",
    name: "View event",
    description: "A compact single-event summary card.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-view-event",
    traits: ["generative"],
  },
  {
    slug: "generative-weather-current",
    name: "Current weather",
    description:
      "A glanceable weather card with a large temperature reading and conditions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-weather-current",
    traits: ["generative"],
  },
  {
    slug: "generative-ride-status",
    name: "Ride status",
    description: "A live ride card with a big ETA and pick-up/driver facts.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-ride-status",
    traits: ["generative"],
  },
  {
    slug: "generative-draft-email",
    name: "Draft email",
    description:
      "A composer Form with from/to/subject/body fields, submitting the collected values on send.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-draft-email",
    traits: ["generative"],
  },
  {
    slug: "generative-cart",
    name: "Shopping cart",
    description:
      "A cart summary: line items, a Divider, subtotal/tax/total facts, and purchase actions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-cart",
    traits: ["generative"],
  },
  {
    slug: "generative-playlist",
    name: "Playlist",
    description:
      "A media card with a cover image and a numbered track list, each row playable on its own.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-playlist",
    traits: ["generative"],
  },
  {
    slug: "generative-channel-message",
    name: "Channel message",
    description:
      "A chat message card with a channel/timestamp row, an author row with a round avatar, and a Markdown body.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-channel-message",
    traits: ["generative"],
  },
  {
    slug: "generative-receipt",
    name: "Purchase receipt",
    description:
      "A receipt card (Badge instead of Alert) with the purchased item, delivery/seller/paid facts, and a details link.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt: "set up https://www.assistant-ui.com/elements/generative-receipt",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-area",
    name: "Weekly active users",
    description:
      "A stacked two-series area chart with axis ticks and a legend.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-chart-area",
    traits: ["generative"],
  },
  {
    slug: "generative-player-card",
    name: "Player card",
    description:
      "A stat card with four Col-laid-out stats beneath the player header.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-player-card",
    traits: ["generative"],
  },
  {
    slug: "generative-event-session",
    name: "Conference session",
    description:
      "A conference session card with a kicker, title, description, and two speaker rows with a View action.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-event-session",
    traits: ["generative"],
  },
  {
    slug: "generative-notify-confirm",
    name: "Confirm dialog",
    description:
      "A compact confirmation card with Yes/No buttons carrying distinct actions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-notify-confirm",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-line",
    name: "Response time",
    description: "A single-series line chart with axis ticks.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-chart-line",
    traits: ["generative"],
  },
  {
    slug: "generative-create-task",
    name: "Create task",
    description:
      "A short task-creation Form: title, description, due date, and a submit button.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-create-task",
    traits: ["generative"],
  },
  {
    slug: "generative-software-purchase",
    name: "Software purchase",
    description:
      "A plan-purchase Card form with volume/frequency selects, a total fact, and confirm/discard actions.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-software-purchase",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-bars",
    name: "Support tickets",
    description:
      "A stacked three-series bar chart with axis ticks and a legend.",
    command: "npm install @assistant-ui/generative-ui zod",
    prompt:
      "set up https://www.assistant-ui.com/elements/generative-chart-bars",
    traits: ["generative"],
  },
  {
    slug: "assistant-ui",
    name: "Chat Starter",
    description:
      "A streaming chat UI wired to the agent framework you already use.",
    href: "/components/assistant-ui",
    command: "npx assistant-ui@latest setup",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`",
  },
  {
    slug: "guides/latex",
    name: "LaTeX math",
    description: "Render LaTeX equations in chat messages with KaTeX.",
    href: "/docs/guides/latex",
    command: "npx assistant-ui@latest setup --products guides/latex",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products guides/latex`",
  },
  {
    slug: "guides/streamdown",
    name: "Streamdown renderer",
    description:
      "Replace react-markdown with Streamdown for built-in Shiki, KaTeX, and Mermaid.",
    href: "/docs/guides/streamdown",
    command: "npx assistant-ui@latest setup --products guides/streamdown",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products guides/streamdown`",
  },
  {
    slug: "guides/mcp",
    name: "MCP server tools",
    description:
      "Connect MCP servers in the chat route so their tools are available to the model.",
    href: "/docs/tools/mcp",
    command: "npx assistant-ui@latest setup --products guides/mcp",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products guides/mcp`",
  },
  {
    slug: "guides/rtl",
    name: "RTL support",
    description:
      "Right-to-left layout for Arabic, Hebrew, and Persian chat interfaces.",
    href: "/docs/guides/rtl",
    command: "npx assistant-ui@latest setup --products guides/rtl",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products guides/rtl`",
  },
  {
    slug: "agent-tools",
    name: "Agent Tool",
    description: "An action the model can call, with its own UI in the thread.",
    href: "/components/agent-tools",
    command: "npx assistant-ui@latest setup --products agent-tools",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products agent-tools`",
  },
];

export const LIBRARY_UI_COMPONENTS: readonly LibraryComponent[] = [
  {
    slug: "button",
    name: "Button",
    description:
      "The pressable object: thin, flat, and 8px round, in every weight a surface needs.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Button component from https://www.assistant-ui.com/design/components/button",
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown Menu",
    description:
      "Actions behind a trigger: items, shortcuts, and separators on a quiet surface.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Dropdown Menu component from https://www.assistant-ui.com/design/components/dropdown-menu",
  },
  {
    slug: "input",
    name: "Input",
    description: "A single-line field with a label, drawn with a hairline.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Input component from https://www.assistant-ui.com/design/components/input",
  },
  {
    slug: "select",
    name: "Select",
    description: "Pick one value from a list, with groups and sizes.",
    command: "npx shadcn@latest add @assistant-ui/select",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Select component from https://www.assistant-ui.com/design/components/select",
  },
  {
    slug: "combobox",
    name: "Combobox",
    description: "Type to filter, then pick: a select with a search field.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Combobox component from https://www.assistant-ui.com/design/components/combobox",
  },
  {
    slug: "switch",
    name: "Switch",
    description: "A binary control in two sizes; the only capsule in the kit.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Switch component from https://www.assistant-ui.com/design/components/switch",
  },
  {
    slug: "kbd",
    name: "Kbd",
    description: "Keyboard keys as printed caps, for shortcuts and hints.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Kbd component from https://www.assistant-ui.com/design/components/kbd",
  },
  {
    slug: "badge",
    name: "Badge",
    description: "A small label for status, categories, or metadata.",
    command: "npx shadcn@latest add @assistant-ui/badge",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Badge component from https://www.assistant-ui.com/design/components/badge",
  },
  {
    slug: "avatar",
    name: "Avatar",
    description: "People as initials or images, alone or stacked in groups.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Avatar component from https://www.assistant-ui.com/design/components/avatar",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    description: "The loading shape of content that has a known layout.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Skeleton component from https://www.assistant-ui.com/design/components/skeleton",
  },
  {
    slug: "separator",
    name: "Separator",
    description: "A hairline between things, horizontal or vertical.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Separator component from https://www.assistant-ui.com/design/components/separator",
  },
  {
    slug: "number-roll",
    name: "Number Roll",
    description: "Numbers that roll to their next value instead of jumping.",
    command: "npx shadcn@latest add @assistant-ui/number-roll",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Number Roll component from https://www.assistant-ui.com/design/components/number-roll",
  },
  {
    slug: "dot-matrix",
    name: "Dot Matrix",
    description:
      "A dot-grid indicator for connecting, running, and settled states.",
    command: "npx shadcn@latest add @assistant-ui/dot-matrix",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Dot Matrix component from https://www.assistant-ui.com/design/components/dot-matrix",
  },
  {
    slug: "diff-viewer",
    name: "Diff Viewer",
    description: "Code changes as unified or split diffs, line by line.",
    command: "npx shadcn@latest add @assistant-ui/diff-viewer",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Diff Viewer component from https://www.assistant-ui.com/design/components/diff-viewer",
  },
  {
    slug: "scrollbar",
    name: "Scrollbar",
    description:
      "A quiet overlay scrollbar for panes that keep their own scroll.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Scrollbar component from https://www.assistant-ui.com/design/components/scrollbar",
  },
  {
    slug: "callout",
    name: "Callout",
    description:
      "A quiet aside on a colored rule, for notes, warnings, and errors in prose.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Callout component from https://www.assistant-ui.com/design/components/callout",
  },
  {
    slug: "steps",
    name: "Steps",
    description: "A numbered rail for processes that happen in order.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Steps component from https://www.assistant-ui.com/design/components/steps",
  },
  {
    slug: "code-block",
    name: "Code Block",
    description:
      "Highlighted code on a field panel, with a title bar and a copy button.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Code Block component from https://www.assistant-ui.com/design/components/code-block",
  },
  {
    slug: "command-tabs",
    name: "Command Tabs",
    description:
      "One command in several dialects, with synced tabs and a copy button.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Command Tabs component from https://www.assistant-ui.com/design/components/command-tabs",
  },
  {
    slug: "table",
    name: "Table",
    description:
      "A print-register data table with hairline rules and mono headers.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Table component from https://www.assistant-ui.com/design/components/table",
  },
  {
    slug: "definition-list",
    name: "Definition List",
    description: "A spec sheet of terms and details, one hairline per row.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Definition List component from https://www.assistant-ui.com/design/components/definition-list",
  },
  {
    slug: "dialog",
    name: "Dialog",
    description: "A modal sheet for decisions that need the page to wait.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Dialog component from https://www.assistant-ui.com/design/components/dialog",
  },
  {
    slug: "popover",
    name: "Popover",
    description: "Anchored detail on demand, dismissed by clicking away.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Popover component from https://www.assistant-ui.com/design/components/popover",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    description:
      "A short label that appears on hover and stays out of the way.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Tooltip component from https://www.assistant-ui.com/design/components/tooltip",
  },
  {
    slug: "sheet",
    name: "Sheet",
    description: "A panel that slides in from an edge for secondary flows.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Sheet component from https://www.assistant-ui.com/design/components/sheet",
  },
  {
    slug: "toast",
    name: "Toast",
    description: "A passing message for outcomes: success, error, and undo.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Toast component from https://www.assistant-ui.com/design/components/toast",
  },
  {
    slug: "tabs",
    name: "Tabs",
    description: "Switch between views without leaving the page.",
    command: "npx shadcn@latest add @assistant-ui/tabs",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Tabs component from https://www.assistant-ui.com/design/components/tabs",
  },
  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    description: "Where you are, as a path you can walk back up.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Breadcrumb component from https://www.assistant-ui.com/design/components/breadcrumb",
  },
  {
    slug: "accordion",
    name: "Accordion",
    description: "Sections that expand one at a time, or all at once.",
    command: "npx shadcn@latest add @assistant-ui/accordion",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Accordion component from https://www.assistant-ui.com/design/components/accordion",
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    description: "One region that folds open and closed in place.",
    prompt:
      "install and set up assistant-ui with `npx assistant-ui@latest setup`. Add the Collapsible component from https://www.assistant-ui.com/design/components/collapsible",
  },
];

/** The components a model can write in a generative UI answer, in the categories of the vocabulary page. */
export const LIBRARY_VOCABULARY: readonly {
  label: string;
  components: readonly { name: string; description: string }[];
}[] = [
  {
    label: "Layout",
    components: [
      {
        name: "Card",
        description:
          "A module the reader scans or acts on, such as a summary, a checklist, a form, or one option in a comparison.",
      },
      {
        name: "Row",
        description: "A horizontal row; children laid out left to right.",
      },
      {
        name: "Col",
        description: "A vertical stack; children laid out top to bottom.",
      },
      {
        name: "Box",
        description:
          "A generic container for composition, e.g. a progress bar built from an outer track Box containing a partial-width fill Box.",
      },
      {
        name: "Spacer",
        description: "Empty space that pushes neighbors apart.",
      },
      {
        name: "Divider",
        description: "A horizontal rule between sections.",
      },
      {
        name: "Carousel",
        description:
          "A horizontally scrollable group of Card children (max 10).",
      },
      {
        name: "Tabs",
        description:
          "Panels the user switches between with tabs, one visible at a time.",
      },
    ],
  },
  {
    label: "Typography",
    components: [
      {
        name: "Header",
        description: "A section heading.",
      },
      {
        name: "Text",
        description: "A run of text.",
      },
      {
        name: "Caption",
        description: "Secondary, de-emphasized text under a primary element.",
      },
      {
        name: "Markdown",
        description: "A markdown string.",
      },
    ],
  },
  {
    label: "Data",
    components: [
      {
        name: "Fact",
        description:
          "A label/value pair, rendered as a key followed by its value.",
      },
      {
        name: "Table",
        description: "Tabular data.",
      },
      {
        name: "Chart",
        description: "A chart.",
      },
      {
        name: "Badge",
        description: "A small labeled tag, e.g. for status or category.",
      },
      {
        name: "Citation",
        description:
          "A source the answer draws on, shown as a card with its title and site that links to it.",
      },
    ],
  },
  {
    label: "Media",
    components: [
      {
        name: "Image",
        description: "An image.",
      },
      {
        name: "Icon",
        description: "A small line icon from the built-in set.",
      },
      {
        name: "Diagram",
        description:
          "A diagram drawn from Mermaid source, such as a flowchart, a sequence of messages, or the states of a process.",
      },
      {
        name: "Map",
        description:
          "Places on a map, such as the stops of a trip or locations to compare, with an optional route through them in order.",
      },
    ],
  },
  {
    label: "Controls",
    components: [
      {
        name: "Button",
        description: "A clickable button.",
      },
      {
        name: "Select",
        description: "A dropdown selector.",
      },
      {
        name: "Input",
        description: "A text input.",
      },
      {
        name: "DatePicker",
        description: "A date, datetime, or time input.",
      },
      {
        name: "Checkbox",
        description: "A checkbox with a label.",
      },
      {
        name: "Slider",
        description: "A numeric range control.",
      },
      {
        name: "RadioGroup",
        description: "A group of mutually exclusive radio options.",
      },
      {
        name: "CheckboxGroup",
        description:
          "A group of checkbox options where any number can be checked.",
      },
      {
        name: "Form",
        description:
          "Wraps named child controls (Select/Input/Checkbox/RadioGroup/CheckboxGroup/DatePicker with a name).",
      },
    ],
  },
  {
    label: "Lists",
    components: [
      {
        name: "ListView",
        description: "A vertical list container.",
      },
      {
        name: "ListViewItem",
        description: "A row inside a ListView.",
      },
      {
        name: "Steps",
        description:
          "Numbered steps to follow in order, such as instructions or a how-to guide.",
      },
      {
        name: "Timeline",
        description:
          "Events in time order, each with a time or date label, such as a schedule, an itinerary, or a history.",
      },
    ],
  },
  {
    label: "Feedback",
    components: [
      {
        name: "Alert",
        description: "A highlighted message conveying urgency.",
      },
    ],
  },
];
