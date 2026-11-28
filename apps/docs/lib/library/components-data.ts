/** Something only some elements are, which the Components tab can filter by. */
export type LibraryTrait = "aui" | "generative" | "native";

export const LIBRARY_TRAITS: readonly { id: LibraryTrait; label: string }[] = [
  { id: "aui", label: "AUI connected" },
  { id: "generative", label: "Generative" },
  { id: "native", label: "React Native" },
];

/** A component on the library's Components tab. `slug` is the last part of its page's address. */
export type LibraryComponent = {
  slug: string;
  name: string;
  description: string;
  traits?: readonly LibraryTrait[];
};

export const LIBRARY_ELEMENTS: readonly LibraryComponent[] = [
  {
    slug: "loading-state",
    name: "Loader",
    description:
      "A pixel matrix that keeps time while the model has nothing to show yet.",
  },
  {
    slug: "thinking-indicator",
    name: "Thinking indicator",
    description:
      "A live status line that names what the agent is doing right now, with elapsed time.",
  },
  {
    slug: "streaming-text",
    name: "Streaming text",
    description:
      "Tokens arrive softly: the newest words land in blue and settle into ink.",
  },
  {
    slug: "typing-indicator",
    name: "Typing indicator",
    description:
      "The classic three dots, tuned to read as presence rather than noise.",
    traits: ["native"],
  },
  {
    slug: "reasoning-effort",
    name: "Reasoning effort",
    description:
      "How hard to think, and how much of that budget the run actually spent.",
  },
  {
    slug: "guardrail-notice",
    name: "Guardrail notice",
    description:
      "A refusal in its own shape, with the nearest thing it can do instead.",
  },
  {
    slug: "message-pair",
    name: "Message pair",
    description:
      "A user bubble and a streaming assistant reply, with actions that appear on hover.",
  },
  {
    slug: "message-branches",
    name: "Message branches",
    description:
      "Navigate between regenerated versions of the same answer without losing your place.",
  },
  {
    slug: "message-actions",
    name: "Message actions",
    description:
      "Copy, rate, and regenerate. Each action confirms itself with a small state change.",
  },
  {
    slug: "error-state",
    name: "Error state",
    description:
      "A quiet failure banner with a retry path, not a modal in your face.",
    traits: ["native"],
  },
  {
    slug: "message-queue",
    name: "Message queue",
    description:
      "Turns you typed while a run was in flight, stacked and cancelable until it finishes.",
    traits: ["native"],
  },
  {
    slug: "edit-message",
    name: "Edit a sent message",
    description:
      "Rewrite a turn in place as a new branch, told up front how many replies stay behind on the old one.",
  },
  {
    slug: "feedback-dialog",
    name: "Feedback dialog",
    description:
      "A thumbs-down that asks why, so the signal arrives with a reason attached.",
  },
  {
    slug: "stopped-run",
    name: "Stopped run",
    description:
      "You pressed stop. The half-written answer stays, and continuing is one tap away.",
    traits: ["native"],
  },
  {
    slug: "day-separator",
    name: "Timestamps",
    description: "Chronology in a long thread: days marked, times on hover.",
  },
  {
    slug: "speaker-identity",
    name: "Speaker identity",
    description:
      "Who is talking, once a thread holds more than a user and one model.",
  },
  {
    slug: "regenerate-menu",
    name: "Regenerate with",
    description:
      "Fork the same turn to a different model instead of rolling the same dice.",
  },
  {
    slug: "confidence-marker",
    name: "Confidence",
    description:
      "Which claims came from a source, which were inferred, and which are guesses.",
  },
  {
    slug: "tool-call",
    name: "Tool call",
    description:
      "One tool invocation with its request and result tucked behind a disclosure.",
  },
  {
    slug: "run-activity",
    name: "Run activity",
    description:
      "Commentary and tools in one disclosure, with the final answer always visible.",
  },
  {
    slug: "tool-timeline",
    name: "Tool timeline",
    description:
      "A whole working session summarized as verbs, targets, and file stats.",
    traits: ["native"],
  },
  {
    slug: "terminal-block",
    name: "Terminal block",
    description:
      "Command output that streams line by line and ends with an exit status.",
  },
  {
    slug: "code-diff",
    name: "Code diff",
    description:
      "A unified diff with tinted additions and removals, sized for chat.",
  },
  {
    slug: "reviewable-diff",
    name: "Reviewable diff",
    description:
      "The same diff, but each hunk is a decision: keep it, discard it, apply what survived.",
  },
  {
    slug: "file-tree",
    name: "File tree",
    description:
      "Everything a run touched, as a tree, with the churn spelled out per file.",
  },
  {
    slug: "elicitation-form",
    name: "Elicitation form",
    description:
      "A server pausing mid-tool-call to ask you for the fields it still needs.",
  },
  {
    slug: "mcp-server-panel",
    name: "Server panel",
    description:
      "Which servers are connected, what each one brought, and which is still waiting on you.",
  },
  {
    slug: "tool-error",
    name: "Tool failure",
    description:
      "One call failed. The error, the attempt count, and a retry that doesn't restart the turn.",
  },
  {
    slug: "permission-grant",
    name: "Permission grant",
    description:
      "Granting a capability rather than approving one action, with the reach spelled out.",
  },
  {
    slug: "computer-use",
    name: "Computer use",
    description:
      "The screen the agent is driving, with a cursor trail and what it is doing right now.",
  },
  {
    slug: "code-runner",
    name: "Code runner",
    description:
      "A snippet with a run button, and the output it produced attached below it.",
  },
  {
    slug: "web-search",
    name: "Web search",
    description:
      "A search query and its results landing one by one as the agent reads.",
  },
  {
    slug: "inline-citation",
    name: "Inline citation",
    description:
      "Numbered references inside a sentence, each with a hover preview of its source.",
  },
  {
    slug: "link-preview",
    name: "Link preview",
    description:
      "A returned URL unfurled into a card with enough context to decide whether to open it.",
  },
  {
    slug: "image-generation",
    name: "Image generation",
    description:
      "A dot grid holds the frame while the image resolves out of a blur.",
  },
  {
    slug: "image-gallery",
    name: "Image gallery",
    description:
      "A compact grid of returned images that opens each one in a shared lightbox.",
  },
  {
    slug: "retrieval-chunks",
    name: "Retrieval chunks",
    description:
      "The passages a retrieval answer stands on, scored, before the answer itself arrives.",
  },
  {
    slug: "document-reference",
    name: "Document reference",
    description:
      "A document the answer leans on, with the quoted passage and the page to jump to.",
  },
  {
    slug: "memory-chips",
    name: "Memory",
    description:
      "What it now remembers about you, written during the turn and removable.",
  },
  {
    slug: "research-report",
    name: "Research report",
    description:
      "An outline that fills in section by section, each carrying the sources behind it.",
  },
  {
    slug: "map-answer",
    name: "Map",
    description:
      "A location answer: pins, a route between them, and the list they came from.",
  },
  {
    slug: "geo-map",
    name: "Geo map",
    description:
      "Places and routes on a real tiled map, with an accessible list of every place.",
  },
  {
    slug: "data-table",
    name: "Data table",
    description:
      "A tool's rows and columns with formatting, sorting, and a card layout in narrow columns.",
  },
  {
    slug: "number-ticker",
    name: "Number ticker",
    description: "Digits that roll into place as a count updates in real time.",
  },
  {
    slug: "chart",
    name: "Chart",
    description:
      "Area, line, and bars, with points landing one at a time as the series streams in.",
  },
  {
    slug: "media-player",
    name: "Media player",
    description:
      "Audio and video a tool returned, played inline without leaving the thread.",
  },
  {
    slug: "web-preview",
    name: "Web preview",
    description:
      "Chrome for a sandboxed preview: a URL bar, reload, and open-in-new around a frame you isolate.",
  },
  {
    slug: "diagram",
    name: "Diagram",
    description:
      "A drawn answer with zoom, reset, and a full-bleed view; you hand it the rendered graphic.",
  },
  {
    slug: "flow-graph",
    name: "Flow graph",
    description:
      "Work as a graph rather than a list: branches that fan out and rejoin.",
  },
  {
    slug: "activity-graph",
    name: "Activity graph",
    description:
      "A half-year of runs as a calendar of cells, dense where the work was.",
  },
  {
    slug: "math-block",
    name: "Math",
    description:
      "Rendered expressions with the working shown, one step at a time.",
  },
  {
    slug: "spec-sheet",
    name: "Spec sheet",
    description:
      "The most common structured answer after a table: one object, labeled.",
  },
  {
    slug: "comparison-card",
    name: "Comparison",
    description:
      "Two options weighed side by side, with the pick named and argued.",
  },
  {
    slug: "timeline",
    name: "Timeline",
    description:
      "Events on a time axis, with what already happened and what is still coming.",
  },
  {
    slug: "job-progress",
    name: "Job progress",
    description:
      "Work measured in minutes: weighted stages, an ETA, and a way out.",
  },
  {
    slug: "score-breakdown",
    name: "Score breakdown",
    description:
      "A verdict with its arithmetic shown: criteria, weights, and what pulled it down.",
  },
  {
    slug: "agent-plan",
    name: "Agent plan",
    description:
      "A checklist the agent works through, with progress you can glance.",
  },
  {
    slug: "subagent-list",
    name: "Subagent list",
    description:
      "Parallel workers with their own progress, models, and completions.",
  },
  {
    slug: "task-card",
    name: "Task card",
    description:
      "A delegated task with its state, timing, result, and transcript in one card.",
    traits: ["aui", "native"],
  },
  {
    slug: "agent-status",
    name: "Agent status",
    description:
      "One pill that always answers: what is it doing, and for how long.",
    traits: ["aui", "native"],
  },
  {
    slug: "approval-card",
    name: "Approval card",
    description:
      "Human in the loop: the agent asks before it runs anything with side effects.",
    traits: ["native"],
  },
  {
    slug: "option-list",
    name: "Option list",
    description:
      "The agent asks a question with a few answers; the pick returns to it and stays as a receipt.",
  },
  {
    slug: "question-flow",
    name: "Question flow",
    description:
      "A few short questions asked one at a time, answered together and kept as a receipt.",
  },
  {
    slug: "recommendation-card",
    name: "Recommendation card",
    description:
      "The agent proposes a change with its confidence, and waits for a yes.",
  },
  {
    slug: "artifact-card",
    name: "Artifact card",
    description:
      "A generated document as a tangible object, written live and versioned.",
  },
  {
    slug: "todo-list",
    name: "Todo list",
    description:
      "The agent's own working list, rewritten mid-run as it discovers what else is needed.",
  },
  {
    slug: "agent-card",
    name: "Agent card",
    description:
      "Who you are about to talk to: its skills, its model, and the endpoint behind it.",
  },
  {
    slug: "agent-handoff",
    name: "Handoff",
    description:
      "Control passing between agents, with the reason and what came along.",
  },
  {
    slug: "background-inbox",
    name: "Background runs",
    description:
      "Work still going somewhere else, and the results waiting to be collected.",
  },
  {
    slug: "checkpoint-history",
    name: "Checkpoints",
    description:
      "Points you can fall back to, with what each one would give back.",
  },
  {
    slug: "schedule-card",
    name: "Schedule",
    description:
      "A run that repeats on its own, with its cadence and how it has been doing.",
  },
  {
    slug: "trace-waterfall",
    name: "Trace waterfall",
    description:
      "Every span in a run on one time axis, nested, so you can see where it actually went.",
  },
  {
    slug: "cost-meter",
    name: "Cost meter",
    description:
      "What the run spent, split by model, against the session total.",
  },
  {
    slug: "quota-banner",
    name: "Quota banner",
    description:
      "How much is left, when it comes back, and the way to get more.",
  },
  {
    slug: "composer",
    name: "Composer",
    description:
      "The unified input: attachments, commands, mentions, models, voice, and context in one surface.",
  },
  {
    slug: "composer-slash-commands",
    name: "Slash commands",
    description:
      "Type a slash and the command menu floats above the input, filtering as you continue.",
  },
  {
    slug: "composer-mentions",
    name: "Mentions",
    description:
      "Type @ to pull people and agents into the conversation, filtered as you go.",
  },
  {
    slug: "composer-attachments",
    name: "Attachments",
    description:
      "Files stage inside the composer with per-file progress before the message sends.",
  },
  {
    slug: "composer-model-picker",
    name: "Models",
    description:
      "The model lives in the composer rail, one tap away with context at a glance.",
  },
  {
    slug: "composer-voice",
    name: "Dictation",
    description:
      "The mic morphs the input into a live waveform, then lands the transcript as text.",
  },
  {
    slug: "composer-context",
    name: "Context",
    description:
      "A token ring in the rail fills as the conversation grows, warning near the limit.",
  },
  {
    slug: "draft-restore",
    name: "Draft restore",
    description:
      "Come back to a thread and the sentence you never sent is still waiting.",
  },
  {
    slug: "context-breakdown",
    name: "Context breakdown",
    description:
      "Where the window actually went: prompt, tools, files, conversation, and what's left.",
  },
  {
    slug: "prompt-library",
    name: "Prompt library",
    description:
      "Prompts you saved, searchable, with their variables shown before you insert one.",
  },
  {
    slug: "command-palette",
    name: "Command palette",
    description:
      "Everything the app can do, one keystroke away and grouped by where it acts.",
  },
  {
    slug: "voice-conversation",
    name: "Voice conversation",
    description:
      "A live call: the orb tracks your voice, the caption names the turn, the transcript follows.",
    traits: ["aui", "native"],
  },
  {
    slug: "read-aloud",
    name: "Read aloud",
    description:
      "An answer played back, the spoken word lit as it goes, speed under your thumb.",
  },
  {
    slug: "chat-panel",
    name: "Chat panel",
    description:
      "The whole family working together: a message, a pause, a streamed reply.",
  },
  {
    slug: "empty-state",
    name: "Empty state",
    description:
      "The first screen: a greeting, three ways in, and the composer front and center.",
  },
  {
    slug: "scroll-anchor",
    name: "Scroll anchor",
    description:
      "Streaming never steals your scroll position; a pill offers the way back down.",
  },
  {
    slug: "canvas-split",
    name: "Canvas",
    description:
      "The thread steps aside and the document takes the room, still being written as you read.",
  },
  {
    slug: "connection-state",
    name: "Connection state",
    description:
      "The socket drops, the run keeps going on the server, and the stream is picked back up.",
  },
  {
    slug: "shared-conversation",
    name: "Shared conversation",
    description:
      "A read-only transcript someone sent you, with a way to pick it up yourself.",
  },
  {
    slug: "conversation-search",
    name: "Search in conversation",
    description:
      "Find inside a long thread, with every hit marked down the scrollbar.",
  },
  {
    slug: "thread-search",
    name: "Thread search",
    description:
      "History you can actually get back into: pinned first, then grouped by when.",
  },
  {
    slug: "launcher-bubble",
    name: "Launcher",
    description: "The floating entry point, and the panel it opens into.",
  },
  {
    slug: "settings-panel",
    name: "Settings",
    description:
      "Model, system prompt, temperature, and what the assistant is allowed to do.",
  },
  {
    slug: "onboarding",
    name: "Onboarding",
    description:
      "First run: three moves that teach what this assistant is actually for.",
  },
  {
    slug: "mobile-composer",
    name: "Mobile composer",
    description:
      "The bottom sheet: keyboard-aware, quick actions above, thumb-sized targets.",
  },
  {
    slug: "thread",
    name: "Thread",
    description:
      "A complete chat container with messages, composer, auto-scroll, and accessibility built in.",
    traits: ["aui"],
  },
  {
    slug: "assistant-modal",
    name: "Assistant modal",
    description:
      "A floating chat bubble for support widgets, help desks, and embedded assistants, with a thread list and a resizable window.",
    traits: ["aui"],
  },
  {
    slug: "assistant-sidebar",
    name: "Assistant sidebar",
    description:
      "A resizable side panel for copilot experiences and contextual assistance.",
    traits: ["aui"],
  },
  {
    slug: "thread-list",
    name: "Thread list",
    description:
      "Runtime-backed conversation switching with search, active selection, and thread actions.",
    traits: ["aui"],
  },
  {
    slug: "thread-list-sidebar",
    name: "Thread list sidebar",
    description:
      "A complete sidebar shell that places the runtime thread list beside the active conversation.",
    traits: ["aui"],
  },
  {
    slug: "orb",
    name: "Orb",
    description:
      "The realtime voice orb, with connection, mute, and speaking state controls.",
    traits: ["aui"],
  },
  {
    slug: "reasoning",
    name: "Reasoning",
    description:
      "A collapsible renderer for assistant reasoning that follows the active message part.",
    traits: ["aui"],
  },
  {
    slug: "message-timing",
    name: "Message timing",
    description:
      "Streaming statistics for the current message, including first token, total time, and speed.",
    traits: ["aui"],
  },
  {
    slug: "conversation-map",
    name: "Conversation map",
    description:
      "A rail of the whole thread: one tick per turn, the turn being read marked and the ones on screen deepened, a hover preview, and a click that jumps there.",
    traits: ["aui", "native"],
  },
  {
    slug: "context-display",
    name: "Context display",
    description:
      "Model context usage as a ring, bar, or text value with a detailed hover view.",
    traits: ["aui"],
  },
  {
    slug: "mcp-config",
    name: "MCP config dialog",
    description:
      "A dialog for connectors and custom MCP servers, including authentication and connection state.",
    traits: ["aui"],
  },
  {
    slug: "attachment",
    name: "Attachment",
    description:
      "Runtime attachments for the composer and messages, with previews, progress, and removal.",
    traits: ["aui"],
  },
  {
    slug: "follow-up-suggestions",
    name: "Follow-up suggestions",
    description:
      "Prompt chips populated from the runtime's generated follow-up suggestions.",
    traits: ["aui"],
  },
  {
    slug: "tool-fallback",
    name: "Tool fallback",
    description:
      "The default runtime renderer for tool calls that do not have dedicated UI.",
    traits: ["aui"],
  },
  {
    slug: "tool-group",
    name: "Tool group",
    description:
      "A collapsible runtime wrapper around consecutive tool calls in one assistant turn.",
    traits: ["aui"],
  },
  {
    slug: "quote",
    name: "Quote",
    description:
      "Select message text, quote it from a floating toolbar, and carry it into the composer.",
    traits: ["aui"],
  },
  {
    slug: "sources",
    name: "Sources",
    description:
      "Runtime source links for URLs, with an opt-in favicon, and file badges for documents.",
    traits: ["aui"],
  },
  {
    slug: "image",
    name: "Image",
    description:
      "Image message parts with preview, loading states, actions, and a fullscreen view.",
    traits: ["aui"],
  },
  {
    slug: "file",
    name: "File",
    description:
      "File message parts with type-aware icons, filename, size, and download actions.",
    traits: ["aui"],
  },
  {
    slug: "model-selector",
    name: "Model selector",
    description:
      "A searchable runtime model picker with grouped providers and reasoning effort controls.",
    traits: ["aui"],
  },
  {
    slug: "composer-trigger-popover",
    name: "Composer trigger popover",
    description:
      "A character-triggered picker for mentions, slash commands, and nested composer actions.",
    traits: ["aui"],
  },
  {
    slug: "directive-text",
    name: "Directive text",
    description:
      "A message renderer that turns mention directives into inline, runtime-aware chips.",
    traits: ["aui"],
  },
  {
    slug: "markdown-text",
    name: "Markdown text",
    description:
      "Assistant markdown with headings, lists, links, tables, and code blocks.",
    traits: ["aui"],
  },
  {
    slug: "syntax-highlighter",
    name: "Syntax highlighter",
    description:
      "Prism-based code highlighting for assistant markdown code blocks.",
  },
  {
    slug: "shiki-highlighter",
    name: "Shiki highlighter",
    description:
      "Shiki code highlighting that defers tokenization until a message part settles.",
    traits: ["aui"],
  },
  {
    slug: "mermaid-diagram",
    name: "Mermaid diagram",
    description:
      "Mermaid diagrams rendered inside messages, including partial streaming input.",
  },
  {
    slug: "generative-ui",
    name: "Generative UI",
    description:
      "A styled component library for rendering structured generative UI output.",
  },
  {
    slug: "tooltip-icon-button",
    name: "Tooltip icon button",
    description:
      "An accessible icon button with a tooltip label and shared interaction states.",
  },
  {
    slug: "logos",
    name: "Model logos",
    description:
      "Inline SVG marks for OpenAI, Anthropic, and Google model providers.",
  },
  {
    slug: "heat-graph",
    name: "Heat graph",
    description:
      "An activity heat map with month labels, weekday labels, legend, and tooltip.",
  },
  {
    slug: "generative-stays",
    name: "Riverside Loft",
    description:
      "A stay card with a photo, location and rating details, and a booking action.",
    traits: ["generative"],
  },
  {
    slug: "generative-booking",
    name: "Table reservation",
    description:
      "A booking form collecting party size, date, and seating preference, submitted through the Card form model.",
    traits: ["generative"],
  },
  {
    slug: "generative-order-status",
    name: "Order tracking",
    description:
      "An order status card with a delivery timeline, badges per step, and quick actions.",
    traits: ["generative"],
  },
  {
    slug: "generative-flight-tracker",
    name: "Flight tracker",
    description:
      "A flight card with a live route progress bar between origin and destination.",
    traits: ["generative"],
  },
  {
    slug: "generative-portfolio",
    name: "Portfolio overview",
    description:
      "A holdings summary combining key facts, an axis-labeled bar chart, and a table of positions.",
    traits: ["generative"],
  },
  {
    slug: "generative-create-event",
    name: "Create event",
    description:
      "A calendar day summary with three upcoming events and confirm/cancel actions to add it to the calendar.",
    traits: ["generative"],
  },
  {
    slug: "generative-view-event",
    name: "View event",
    description: "A compact single-event summary card.",
    traits: ["generative"],
  },
  {
    slug: "generative-weather-current",
    name: "Current weather",
    description:
      "A glanceable weather card with a large temperature reading and conditions.",
    traits: ["generative"],
  },
  {
    slug: "generative-ride-status",
    name: "Ride status",
    description: "A live ride card with a big ETA and pick-up/driver facts.",
    traits: ["generative"],
  },
  {
    slug: "generative-draft-email",
    name: "Draft email",
    description:
      "A composer Form with from/to/subject/body fields, submitting the collected values on send.",
    traits: ["generative"],
  },
  {
    slug: "generative-cart",
    name: "Shopping cart",
    description:
      "A cart summary: line items, a Divider, subtotal/tax/total facts, and purchase actions.",
    traits: ["generative"],
  },
  {
    slug: "generative-playlist",
    name: "Playlist",
    description:
      "A media card with a cover image and a numbered track list, each row playable on its own.",
    traits: ["generative"],
  },
  {
    slug: "generative-channel-message",
    name: "Channel message",
    description:
      "A chat message card with a channel/timestamp row, an author row with a round avatar, and a Markdown body.",
    traits: ["generative"],
  },
  {
    slug: "generative-receipt",
    name: "Purchase receipt",
    description:
      "A receipt card (Badge instead of Alert) with the purchased item, delivery/seller/paid facts, and a details link.",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-area",
    name: "Weekly active users",
    description:
      "A stacked two-series area chart with axis ticks and a legend.",
    traits: ["generative"],
  },
  {
    slug: "generative-player-card",
    name: "Player card",
    description:
      "A stat card with four Col-laid-out stats beneath the player header.",
    traits: ["generative"],
  },
  {
    slug: "generative-event-session",
    name: "Conference session",
    description:
      "A conference session card with a kicker, title, description, and two speaker rows with a View action.",
    traits: ["generative"],
  },
  {
    slug: "generative-notify-confirm",
    name: "Confirm dialog",
    description:
      "A compact confirmation card with Yes/No buttons carrying distinct actions.",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-line",
    name: "Response time",
    description: "A single-series line chart with axis ticks.",
    traits: ["generative"],
  },
  {
    slug: "generative-create-task",
    name: "Create task",
    description:
      "A short task-creation Form: title, description, due date, and a submit button.",
    traits: ["generative"],
  },
  {
    slug: "generative-software-purchase",
    name: "Software purchase",
    description:
      "A plan-purchase Card form with volume/frequency selects, a total fact, and confirm/discard actions.",
    traits: ["generative"],
  },
  {
    slug: "generative-chart-bars",
    name: "Support tickets",
    description:
      "A stacked three-series bar chart with axis ticks and a legend.",
    traits: ["generative"],
  },
];

export const LIBRARY_UI_COMPONENTS: readonly LibraryComponent[] = [
  {
    slug: "button",
    name: "Button",
    description:
      "The pressable object: thin, flat, and 8px round, in every weight a surface needs.",
  },
  {
    slug: "dropdown-menu",
    name: "Dropdown Menu",
    description:
      "Actions behind a trigger: items, shortcuts, and separators on a quiet surface.",
  },
  {
    slug: "input",
    name: "Input",
    description: "A single-line field with a label, drawn with a hairline.",
  },
  {
    slug: "select",
    name: "Select",
    description: "Pick one value from a list, with groups and sizes.",
  },
  {
    slug: "combobox",
    name: "Combobox",
    description: "Type to filter, then pick: a select with a search field.",
  },
  {
    slug: "switch",
    name: "Switch",
    description: "A binary control in two sizes; the only capsule in the kit.",
  },
  {
    slug: "kbd",
    name: "Kbd",
    description: "Keyboard keys as printed caps, for shortcuts and hints.",
  },
  {
    slug: "badge",
    name: "Badge",
    description: "A small label for status, categories, or metadata.",
  },
  {
    slug: "avatar",
    name: "Avatar",
    description: "People as initials or images, alone or stacked in groups.",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    description: "The loading shape of content that has a known layout.",
  },
  {
    slug: "separator",
    name: "Separator",
    description: "A hairline between things, horizontal or vertical.",
  },
  {
    slug: "number-roll",
    name: "Number Roll",
    description: "Numbers that roll to their next value instead of jumping.",
  },
  {
    slug: "dot-matrix",
    name: "Dot Matrix",
    description:
      "A dot-grid indicator for connecting, running, and settled states.",
  },
  {
    slug: "diff-viewer",
    name: "Diff Viewer",
    description: "Code changes as unified or split diffs, line by line.",
  },
  {
    slug: "scrollbar",
    name: "Scrollbar",
    description:
      "A quiet overlay scrollbar for panes that keep their own scroll.",
  },
  {
    slug: "callout",
    name: "Callout",
    description:
      "A quiet aside on a colored rule, for notes, warnings, and errors in prose.",
  },
  {
    slug: "steps",
    name: "Steps",
    description: "A numbered rail for processes that happen in order.",
  },
  {
    slug: "code-block",
    name: "Code Block",
    description:
      "Highlighted code on a field panel, with a title bar and a copy button.",
  },
  {
    slug: "command-tabs",
    name: "Command Tabs",
    description:
      "One command in several dialects, with synced tabs and a copy button.",
  },
  {
    slug: "table",
    name: "Table",
    description:
      "A print-register data table with hairline rules and mono headers.",
  },
  {
    slug: "definition-list",
    name: "Definition List",
    description: "A spec sheet of terms and details, one hairline per row.",
  },
  {
    slug: "dialog",
    name: "Dialog",
    description: "A modal sheet for decisions that need the page to wait.",
  },
  {
    slug: "popover",
    name: "Popover",
    description: "Anchored detail on demand, dismissed by clicking away.",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    description:
      "A short label that appears on hover and stays out of the way.",
  },
  {
    slug: "sheet",
    name: "Sheet",
    description: "A panel that slides in from an edge for secondary flows.",
  },
  {
    slug: "toast",
    name: "Toast",
    description: "A passing message for outcomes: success, error, and undo.",
  },
  {
    slug: "tabs",
    name: "Tabs",
    description: "Switch between views without leaving the page.",
  },
  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    description: "Where you are, as a path you can walk back up.",
  },
  {
    slug: "accordion",
    name: "Accordion",
    description: "Sections that expand one at a time, or all at once.",
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    description: "One region that folds open and closed in place.",
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

/** The chat features, services, and starter the components page lists beside its elements. */
export const LIBRARY_FEATURES: readonly {
  name: string;
  description: string;
  href: string;
}[] = [
  {
    name: "Chat Starter",
    description:
      "A streaming chat UI wired to the agent framework you already use.",
    href: "/components/assistant-ui",
  },
  {
    name: "File attachments",
    description:
      "Users attach images and files to messages by picker, drag-drop, or paste.",
    href: "/docs/guides/attachments",
  },
  {
    name: "Text-to-speech",
    description: "A read-aloud button on every assistant message.",
    href: "/docs/guides/speech",
  },
  {
    name: "Voice dictation",
    description:
      "A microphone button that transcribes speech into the composer.",
    href: "/docs/guides/dictation",
  },
  {
    name: "LaTeX math",
    description: "Render LaTeX equations in chat messages with KaTeX.",
    href: "/docs/guides/latex",
  },
  {
    name: "Streamdown renderer",
    description:
      "Replace react-markdown with Streamdown for built-in Shiki, KaTeX, and Mermaid.",
    href: "/docs/guides/streamdown",
  },
  {
    name: "Suggested prompts",
    description:
      "Starter prompts on the empty thread, with optional generated follow-ups.",
    href: "/docs/guides/suggestions",
  },
  {
    name: "@-mentions",
    description:
      "Type @ in the composer to pick a tool or custom item and send it as a directive.",
    href: "/docs/guides/mentions",
  },
  {
    name: "Slash commands",
    description:
      "Type / in the composer to open a command palette that runs your callbacks.",
    href: "/docs/guides/slash-commands",
  },
  {
    name: "Chain of thought",
    description:
      "Group reasoning and tool calls into one collapsible thinking section.",
    href: "/docs/guides/chain-of-thought",
  },
  {
    name: "Resumable streams",
    description:
      "A response keeps streaming after a reload or dropped connection and the client picks it back up.",
    href: "/docs/guides/resumable-streams",
  },
  {
    name: "DevTools",
    description:
      "An in-browser panel for inspecting runtime state, model context, and events in development.",
    href: "/docs/guides/devtools",
  },
  {
    name: "Langfuse tracing",
    description:
      "One Langfuse trace per chat turn, with LLM and tool-call spans, via OpenTelemetry.",
    href: "/docs/integrations/observability/langfuse",
  },
  {
    name: "LangSmith tracing",
    description: "Trace AI SDK calls into a LangSmith project with wrapAISDK.",
    href: "/docs/integrations/observability/langsmith",
  },
  {
    name: "MCP server tools",
    description:
      "Connect MCP servers in the chat route so their tools are available to the model.",
    href: "/docs/tools/mcp",
  },
  {
    name: "User-managed MCP servers",
    description:
      "End users connect, authenticate, and add MCP servers from a dialog in the browser.",
    href: "/docs/tools/user-managed-mcp",
  },
  {
    name: "RTL support",
    description:
      "Right-to-left layout for Arabic, Hebrew, and Persian chat interfaces.",
    href: "/docs/guides/rtl",
  },
  {
    name: "Assistant Cloud",
    description:
      "Persistence, thread history, and titles for an existing assistant-ui app.",
    href: "/components/cloud",
  },
  {
    name: "Agent Tool",
    description: "An action the model can call, with its own UI in the thread.",
    href: "/components/agent-tools",
  },
];
