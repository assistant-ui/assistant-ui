export interface ElementPropRow {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  description: string;
}

export interface ElementPropsTable {
  component: string;
  rows: ElementPropRow[];
}

export interface ElementDoc {
  usage: string;
  props: ElementPropsTable[];
}

export const ELEMENT_DOCS: Record<string, ElementDoc> = {
  "loading-state": {
    usage: `import { GenerationLoader } from "@/components/elements/loading-state";

<GenerationLoader label="Generating" tick={24} />`,
    props: [
      {
        component: "GenerationLoader",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "Status copy shown under the pixel grid while the model has nothing else to show.",
          },
          {
            name: "tick",
            type: "number",
            required: true,
            description:
              "Animation clock that advances the pixel pattern and the elapsed seconds counter.",
          },
          {
            name: "variant",
            type: '"dots" | "squares" | "rounded"',
            defaultValue: '"dots"',
            description: "Cell shape of the pixel matrix.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "thinking-indicator": {
    usage: `import { ThinkingIndicator } from "@/components/elements/thinking-indicator";

<ThinkingIndicator label="Reading thread.tsx" elapsed="12s" />`,
    props: [
      {
        component: "ThinkingIndicator",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "What the agent is doing right now. Swapping it replays the entrance animation.",
          },
          {
            name: "elapsed",
            type: "string",
            description:
              "Elapsed time rendered in mono next to the label. Omit to hide the timer.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root row.",
          },
        ],
      },
    ],
  },
  "reasoning-panel": {
    usage: `import { ReasoningPanel } from "@/components/elements/reasoning-panel";

<ReasoningPanel
  steps={[{ title: "Scope", body: "Find the failing path." }]}
  visibleSteps={1}
  streaming
  open
  onOpenChange={setOpen}
  restingLabel="Reasoned for 4s"
  elapsed="2s"
/>`,
    props: [
      {
        component: "ReasoningPanel",
        rows: [
          {
            name: "steps",
            type: "ReasoningStep[]",
            required: true,
            description: "Full list of reasoning steps available to reveal.",
          },
          {
            name: "visibleSteps",
            type: "number",
            required: true,
            description:
              "How many steps from the start are currently shown on the timeline.",
          },
          {
            name: "streaming",
            type: "boolean",
            required: true,
            description:
              "When true the trigger shows a shimmering Thinking label and the active step pulses.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the collapsible step list is expanded.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            required: true,
            description: "Called when the user expands or collapses the panel.",
          },
          {
            name: "restingLabel",
            type: "string",
            required: true,
            description:
              "Trigger label once streaming finishes, for example a summary of how long it thought.",
          },
          {
            name: "elapsed",
            type: "string",
            description:
              "Elapsed timer shown next to Thinking while streaming. Omit to hide it.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "streaming-text": {
    usage: `import { StreamingText } from "@/components/elements/streaming-text";

<StreamingText
  segments={[{ text: "Hello world" }, { text: "thread.tsx", mono: true }]}
  count={3}
  streaming
/>`,
    props: [
      {
        component: "StreamingText",
        rows: [
          {
            name: "segments",
            type: "Segment[]",
            required: true,
            description:
              "Text chunks to stream, optionally marked mono for inline code chips.",
          },
          {
            name: "count",
            type: "number",
            required: true,
            description:
              "How many words from the flattened segments are visible.",
          },
          {
            name: "streaming",
            type: "boolean",
            required: true,
            description:
              "When true the newest words tint blue and a caret blinks at the end.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "typing-indicator": {
    usage: `import { TypingIndicator } from "@/components/elements/typing-indicator";

<TypingIndicator />`,
    props: [
      {
        component: "TypingIndicator",
        rows: [
          {
            name: "variant",
            type: '"bubble" | "bare"',
            defaultValue: '"bubble"',
            description:
              "bubble wraps the dots in a pill; bare renders only the three dots.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "message-pair": {
    usage: `import { MessagePair } from "@/components/elements/message-pair";

<MessagePair
  userMessage="Explain the composer."
  words={["Here", "is", "a", "short", "reply."]}
  visibleWords={5}
  streaming={false}
/>`,
    props: [
      {
        component: "MessagePair",
        rows: [
          {
            name: "userMessage",
            type: "string",
            required: true,
            description: "Text shown in the user bubble on the right.",
          },
          {
            name: "words",
            type: "readonly string[]",
            required: true,
            description: "Assistant reply broken into words for streaming.",
          },
          {
            name: "visibleWords",
            type: "number",
            required: true,
            description: "How many assistant words are currently visible.",
          },
          {
            name: "streaming",
            type: "boolean",
            required: true,
            description:
              "When true the newest assistant words tint blue as they arrive.",
          },
          {
            name: "variant",
            type: '"bubble" | "flat"',
            defaultValue: '"bubble"',
            description:
              "bubble wraps the user message in a surface; flat renders it as plain right-aligned text.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "message-branches": {
    usage: `import { MessageBranches } from "@/components/elements/message-branches";

<MessageBranches
  variants={["First answer.", "Second answer."]}
  index={0}
  onIndexChange={setIndex}
/>`,
    props: [
      {
        component: "MessageBranches",
        rows: [
          {
            name: "variants",
            type: "readonly string[]",
            required: true,
            description:
              "Alternate regenerated answers the user can step through.",
          },
          {
            name: "index",
            type: "number",
            required: true,
            description: "Which variant is currently displayed.",
          },
          {
            name: "onIndexChange",
            type: "(index: number) => void",
            required: true,
            description:
              "Called when the previous or next branch control is pressed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "message-actions": {
    usage: `import { MessageActions } from "@/components/elements/message-actions";

<MessageActions
  copied={false}
  reaction={null}
  regenerating={false}
  onCopy={() => {}}
  onReactionChange={setReaction}
  onRegenerate={() => {}}
  onMore={() => {}}
/>`,
    props: [
      {
        component: "MessageActions",
        rows: [
          {
            name: "copied",
            type: "boolean",
            required: true,
            description:
              "When true the copy button shows a green check confirmation.",
          },
          {
            name: "reaction",
            type: "Reaction",
            required: true,
            description:
              "Active thumbs reaction, or null when none is selected.",
          },
          {
            name: "regenerating",
            type: "boolean",
            required: true,
            description:
              "When true the regenerate icon spins to show work in progress.",
          },
          {
            name: "onCopy",
            type: "() => void",
            required: true,
            description: "Called when the copy control is pressed.",
          },
          {
            name: "onReactionChange",
            type: "(reaction: Reaction) => void",
            required: true,
            description:
              "Called when the user toggles thumbs up or thumbs down.",
          },
          {
            name: "onRegenerate",
            type: "() => void",
            required: true,
            description: "Called when the regenerate control is pressed.",
          },
          {
            name: "onMore",
            type: "() => void",
            required: true,
            description: "Called when the overflow menu control is pressed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  suggestions: {
    usage: `import { Suggestions } from "@/components/elements/suggestions";

<Suggestions
  suggestions={["Explain more", "Show an example"]}
  selectedSuggestion={null}
  cycle={0}
  onSuggestion={setSelected}
/>`,
    props: [
      {
        component: "Suggestions",
        rows: [
          {
            name: "suggestions",
            type: "readonly string[]",
            required: true,
            description: "Follow-up prompt pills rendered in order.",
          },
          {
            name: "selectedSuggestion",
            type: "string | null",
            required: true,
            description:
              "The pill currently pressed, or null when none is selected.",
          },
          {
            name: "cycle",
            type: "number",
            required: true,
            description:
              "Identity key that remounts the row so the stagger entrance can replay.",
          },
          {
            name: "variant",
            type: '"pills" | "list"',
            defaultValue: '"pills"',
            description:
              "pills wraps suggestions into a centered row; list stacks them as full-width rows.",
          },
          {
            name: "onSuggestion",
            type: "(suggestion: string) => void",
            required: true,
            description: "Called when a suggestion pill is pressed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "error-state": {
    usage: `import { ErrorState } from "@/components/elements/error-state";

<ErrorState
  title="Request failed"
  detail="The model timed out."
  retrying={false}
  onRetry={() => {}}
/>`,
    props: [
      {
        component: "ErrorState",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Primary failure headline shown in the banner.",
          },
          {
            name: "detail",
            type: "string",
            required: true,
            description:
              "Supporting detail under the title explaining what went wrong.",
          },
          {
            name: "retrying",
            type: "boolean",
            required: true,
            description:
              "When true the banner swaps to a spinning Retrying status instead of the error.",
          },
          {
            name: "onRetry",
            type: "() => void",
            required: true,
            description: "Called when the retry control is pressed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "tool-call": {
    usage: `import { ToolCall } from "@/components/elements/tool-call";

<ToolCall
  label="Searched"
  activeLabel="Searching"
  query="composer props"
  request='{"q":"composer"}'
  result='{"hits":2}'
  running={false}
  open
  onOpenChange={setOpen}
/>`,
    props: [
      {
        component: "ToolCall",
        rows: [
          {
            name: "activeLabel",
            type: "string",
            required: true,
            description:
              "Verb shown with a shimmer while the tool is running, for example Searching the docs.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description: "Tool name shown on the collapsed trigger row.",
          },
          {
            name: "query",
            type: "string",
            required: true,
            description:
              "Short chip next to the label summarizing the call target.",
          },
          {
            name: "request",
            type: "string",
            required: true,
            description:
              "Request payload shown inside the expanded disclosure.",
          },
          {
            name: "result",
            type: "string",
            required: true,
            description:
              "Result payload shown once the call is no longer running.",
          },
          {
            name: "running",
            type: "boolean",
            required: true,
            description:
              "When true a spinner replaces the success check on the trigger.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the request and result panel is expanded.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            required: true,
            description: "Called when the user expands or collapses the call.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "tool-timeline": {
    usage: `import { FileSearchIcon } from "lucide-react";
import { ToolTimeline } from "@/components/elements/tool-timeline";

<ToolTimeline
  steps={[{ verb: "Read", chip: "thread.tsx", icon: FileSearchIcon }]}
  visibleSteps={1}
  streaming
  open
  onOpenChange={setOpen}
  restingLabel="Worked for 12s"
  activeLabel="Working for 12s"
  stats={[{ file: "thread.tsx", added: 4, removed: 1 }]}
/>`,
    props: [
      {
        component: "ToolTimeline",
        rows: [
          {
            name: "steps",
            type: "readonly TimelineStep[]",
            required: true,
            description:
              "Working-session verbs, chips, and icons to reveal over time.",
          },
          {
            name: "visibleSteps",
            type: "number",
            required: true,
            description: "How many steps from the start are currently shown.",
          },
          {
            name: "streaming",
            type: "boolean",
            required: true,
            description:
              "When true the trigger shows Working with a shimmer and elapsed timer.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the collapsible timeline body is expanded.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            required: true,
            description:
              "Called when the user expands or collapses the timeline.",
          },
          {
            name: "restingLabel",
            type: "string",
            required: true,
            description: "Trigger label once streaming finishes.",
          },
          {
            name: "activeLabel",
            type: "string",
            required: true,
            description:
              "Full-size live label while streaming, for example Working for 12s.",
          },
          {
            name: "stats",
            type: "TimelineStat[]",
            required: true,
            description:
              "Per-file addition and removal counts listed under the steps.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "terminal-block": {
    usage: `import { TerminalBlock } from "@/components/elements/terminal-block";

<TerminalBlock
  command="pnpm test"
  lines={["PASS  thread.test.ts", "Tests: 2 passed"]}
  visibleCount={2}
  done
/>`,
    props: [
      {
        component: "TerminalBlock",
        rows: [
          {
            name: "command",
            type: "string",
            required: true,
            description: "Command string shown in the terminal header.",
          },
          {
            name: "lines",
            type: "readonly string[]",
            required: true,
            description: "Output lines available to stream into the body.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description:
              "How many output lines from the start are currently shown.",
          },
          {
            name: "variant",
            type: '"paper" | "ink"',
            defaultValue: '"paper"',
            description:
              "paper matches the surrounding surfaces; ink renders the classic dark terminal slab.",
          },
          {
            name: "done",
            type: "boolean",
            required: true,
            description:
              "When true the header shows exit 0; otherwise a spinner keeps spinning.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "code-diff": {
    usage: `import { CodeDiff } from "@/components/elements/code-diff";

<CodeDiff
  filename="thread.tsx"
  additions={2}
  deletions={1}
  lines={[
    { kind: "removed", text: "const x = 1" },
    { kind: "added", text: "const x = 2" },
  ]}
  cycle={0}
/>`,
    props: [
      {
        component: "CodeDiff",
        rows: [
          {
            name: "filename",
            type: "string",
            required: true,
            description: "File path shown in the diff header.",
          },
          {
            name: "additions",
            type: "number",
            required: true,
            description:
              "Addition count rendered in green next to the filename.",
          },
          {
            name: "deletions",
            type: "number",
            required: true,
            description: "Deletion count rendered in red next to the filename.",
          },
          {
            name: "lines",
            type: "readonly DiffLine[]",
            required: true,
            description:
              "Unified diff lines with context, added, or removed kind.",
          },
          {
            name: "cycle",
            type: "number",
            required: true,
            description:
              "Identity key that remounts the body so entrance animation can replay.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "web-search": {
    usage: `import { WebSearch } from "@/components/elements/web-search";

<WebSearch
  query="assistant-ui composer"
  results={[{ title: "Composer guide", domain: "docs.example.com" }]}
  visibleResults={1}
  searching={false}
  cycle={0}
/>`,
    props: [
      {
        component: "WebSearch",
        rows: [
          {
            name: "query",
            type: "string",
            required: true,
            description: "Search query shown in the query pill.",
          },
          {
            name: "results",
            type: "readonly WebSearchResult[]",
            required: true,
            description: "Result cards available to reveal one by one.",
          },
          {
            name: "visibleResults",
            type: "number",
            required: true,
            description: "How many results from the start are currently shown.",
          },
          {
            name: "searching",
            type: "boolean",
            required: true,
            description:
              "When true a shimmering Searching label replaces the result count.",
          },
          {
            name: "cycle",
            type: "number",
            required: true,
            description:
              "Identity key that remounts the list so entrance animation can replay.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  sources: {
    usage: `import { Sources } from "@/components/elements/sources";

<Sources
  sources={[{ domain: "docs.example.com", title: "Composer guide" }]}
  open
  onOpenChange={setOpen}
/>`,
    props: [
      {
        component: "Sources",
        rows: [
          {
            name: "sources",
            type: "readonly Source[]",
            required: true,
            description:
              "Citation cards revealed when the sources pill expands.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the source list is expanded under the pill.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            required: true,
            description:
              "Called when the user expands or collapses the sources.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "inline-citation": {
    usage: `import { InlineCitation } from "@/components/elements/inline-citation";

<InlineCitation
  sources={[
    {
      domain: "docs.example.com",
      title: "Optimistic updates",
      snippet: "Confirm writes after paint.",
    },
  ]}
  openIndex={0}
  onOpenIndexChange={setOpenIndex}
/>`,
    props: [
      {
        component: "InlineCitation",
        rows: [
          {
            name: "sources",
            type: "Source[]",
            required: true,
            description:
              "Sources attached to the numbered reference markers in the sentence.",
          },
          {
            name: "openIndex",
            type: "number | null",
            required: true,
            description:
              "Which citation preview is open, or null when none is open.",
          },
          {
            name: "onOpenIndexChange",
            type: "(index: number | null) => void",
            required: true,
            description:
              "Called when a citation marker opens or closes its preview.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "image-generation": {
    usage: `import { ImageGeneration } from "@/components/elements/image-generation";

<ImageGeneration prompt="A calm blue abstract" generating={false} />`,
    props: [
      {
        component: "ImageGeneration",
        rows: [
          {
            name: "prompt",
            type: "string",
            required: true,
            description: "Prompt text shown under the image frame.",
          },
          {
            name: "generating",
            type: "boolean",
            required: true,
            description:
              "When true the frame holds a pulsing dot grid; otherwise the image resolves.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "data-table": {
    usage: `import { DataTable } from "@/components/elements/data-table";

<DataTable
  rows={[{ name: "Sonnet", context: "200k", cost: "$3" }]}
  cycle={0}
/>`,
    props: [
      {
        component: "DataTable",
        rows: [
          {
            name: "rows",
            type: "readonly ModelUsage[]",
            required: true,
            description:
              "Table rows with model name, context window, and cost.",
          },
          {
            name: "cycle",
            type: "number",
            required: true,
            description:
              "Identity key that remounts the body so row entrance can replay.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "number-ticker": {
    usage: `import { NumberTicker } from "@/components/elements/number-ticker";

<NumberTicker value={1284} label="tokens / sec" />`,
    props: [
      {
        component: "NumberTicker",
        rows: [
          {
            name: "value",
            type: "number",
            required: true,
            description:
              "Numeric value whose digits roll into place as it changes.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description: "Mono caption rendered under the rolling number.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "agent-plan": {
    usage: `import { AgentPlan } from "@/components/elements/agent-plan";

<AgentPlan
  steps={["Read the file", "Draft the fix", "Run tests"]}
  activeIndex={1}
/>`,
    props: [
      {
        component: "AgentPlan",
        rows: [
          {
            name: "steps",
            type: "readonly string[]",
            required: true,
            description: "Checklist items the agent works through in order.",
          },
          {
            name: "activeIndex",
            type: "number",
            required: true,
            description:
              "Index of the step currently running. Values past the end mark every step done.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "subagent-list": {
    usage: `import { SubagentList } from "@/components/elements/subagent-list";

<SubagentList
  agents={[{ name: "Researcher", model: "Sonnet" }]}
  completedCount={0}
  progress={[40]}
  showSummary={false}
  summaryAgent={{ name: "Summarizer", model: "Haiku" }}
/>`,
    props: [
      {
        component: "SubagentList",
        rows: [
          {
            name: "agents",
            type: "readonly SubagentItem[]",
            required: true,
            description: "Parallel workers shown as cards with name and model.",
          },
          {
            name: "completedCount",
            type: "number",
            required: true,
            description: "How many agents from the start are marked complete.",
          },
          {
            name: "progress",
            type: "readonly number[]",
            required: true,
            description:
              "Per-agent progress widths used while a worker is still running.",
          },
          {
            name: "showSummary",
            type: "boolean",
            required: true,
            description:
              "When true the summary agent card is revealed under the list.",
          },
          {
            name: "summaryAgent",
            type: "SubagentItem",
            required: true,
            description:
              "Agent shown in the summary card once showSummary is true.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "agent-status": {
    usage: `import { AgentStatus } from "@/components/elements/agent-status";

<AgentStatus state="working" label="Editing composer.tsx" elapsed="8s" />`,
    props: [
      {
        component: "AgentStatus",
        rows: [
          {
            name: "state",
            type: "AgentState",
            required: true,
            description:
              "Visual mode of the pill: working, waiting, or done with a check.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "Short status line describing what the agent is doing.",
          },
          {
            name: "elapsed",
            type: "string",
            description: "Elapsed time shown in mono when provided.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "approval-card": {
    usage: `import { ApprovalCard } from "@/components/elements/approval-card";

<ApprovalCard
  state="request"
  command="pnpm db:migrate"
  title="Run migration"
  subtitle="Needs your approval"
  onAllowOnce={() => approve()}
  onDeny={() => deny()}
/>`,
    props: [
      {
        component: "ApprovalCard",
        rows: [
          {
            name: "state",
            type: '"request" | "running" | "done" | "denied"',
            required: true,
            description:
              "Lifecycle of the card: request with actions, running spinner, done check, or denied.",
          },
          {
            name: "command",
            type: "string",
            required: true,
            description:
              "Command shown in the mono field the agent wants to run.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Headline naming the action that needs approval.",
          },
          {
            name: "subtitle",
            type: "string",
            required: true,
            description:
              "Supporting line under the title explaining the request.",
          },
          {
            name: "onAllowOnce",
            type: "() => void",
            description: "Called when the user clicks Allow once.",
          },
          {
            name: "onAlwaysAllow",
            type: "() => void",
            description: "Called when the user clicks Always allow.",
          },
          {
            name: "onDeny",
            type: "() => void",
            description: "Called when the user clicks Deny.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "recommendation-card": {
    usage: `import { RecommendationCard } from "@/components/elements/recommendation-card";

<RecommendationCard
  state="idle"
  question="Enable draft autosave?"
  confidenceLabel="high confidence"
  acceptedLabel="Enabled for every thread"
  onAccept={() => accept()}
>
  Wire{" "}
  <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
    runtime.drafts
  </span>{" "}
  with three lines.
</RecommendationCard>`,
    props: [
      {
        component: "RecommendationCard",
        rows: [
          {
            name: "state",
            type: "RecommendationState",
            required: true,
            description:
              "idle shows accept controls; accepted swaps in a confirmation row.",
          },
          {
            name: "question",
            type: "string",
            required: true,
            description:
              "Proposal headline the agent is asking the user about.",
          },
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: "Supporting body explaining the recommendation.",
          },
          {
            name: "confidenceLabel",
            type: "string",
            required: true,
            description:
              "Confidence copy shown next to the bar meter while idle.",
          },
          {
            name: "acceptedLabel",
            type: "string",
            required: true,
            description:
              "Confirmation copy shown once the proposal is accepted.",
          },
          {
            name: "onAccept",
            type: "() => void",
            description: "Called when the user clicks Accept.",
          },
          {
            name: "onAlternatives",
            type: "() => void",
            description: "Called when the user clicks Alternatives.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "artifact-card": {
    usage: `import { ArtifactCard } from "@/components/elements/artifact-card";

<ArtifactCard
  title="Draft persistence RFC"
  meta="Document · v3 · just now"
  generating={isWriting}
  words={wordCount}
/>`,
    props: [
      {
        component: "ArtifactCard",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Name of the generated artifact.",
          },
          {
            name: "meta",
            type: "string",
            required: true,
            description:
              "Resting meta line shown once generation finishes, for example kind, version, and recency.",
          },
          {
            name: "generating",
            type: "boolean",
            defaultValue: "false",
            description:
              "While true the icon pulses and the meta line shows a live word count with a shimmer.",
          },
          {
            name: "words",
            type: "number",
            defaultValue: "0",
            description: "Live word count shown while generating.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the card.",
          },
        ],
      },
    ],
  },
  composer: {
    usage: `import { Composer } from "@/components/elements/composer";

<Composer
  value={value}
  onValueChange={setValue}
  onSend={send}
  attachments={[{ name: "notes.md", meta: "12 KB", state: "done" }]}
  commands={[{ name: "review", description: "Review the diff", icon: SearchIcon }]}
  people={[{ name: "Mara", role: "human" }]}
  models={[{ name: "Fable 5", meta: "1M ctx" }]}
  model={model}
  onModelChange={setModel}
  usage={{ system: 12, tools: 8, messages: 54, total: 200 }}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "value",
            type: "string",
            required: true,
            description: "Current draft text in the input field.",
          },
          {
            name: "onValueChange",
            type: "(value: string) => void",
            required: true,
            description: "Called as the user types.",
          },
          {
            name: "onSend",
            type: "() => void",
            description: "Called on Enter or the send button.",
          },
          {
            name: "onStop",
            type: "() => void",
            description: "Called by the stop button while streaming.",
          },
          {
            name: "placeholder",
            type: "string",
            defaultValue: '"Ask anything"',
            description: "Placeholder shown when the value is empty.",
          },
          {
            name: "streaming",
            type: "boolean",
            defaultValue: "false",
            description:
              "When true the send control cross-fades into a stop button.",
          },
          {
            name: "attachments",
            type: "ComposerAttachment[]",
            description:
              "Staged files rendered as tiles above the field, with per-file progress.",
          },
          {
            name: "onRemoveAttachment",
            type: "(name: string) => void",
            description:
              "Enables a remove control on attachments that finished uploading.",
          },
          {
            name: "dragActive",
            type: "boolean",
            defaultValue: "false",
            description: "Tints the surface while a file hovers over it.",
          },
          {
            name: "commands",
            type: "ComposerCommand[]",
            description:
              "Enables the slash menu: it floats above the input while the value starts with /.",
          },
          {
            name: "onCommand",
            type: "(command: ComposerCommand) => void",
            description: "Called when a slash command is picked.",
          },
          {
            name: "people",
            type: "ComposerPerson[]",
            description:
              "Enables the mention menu: it opens while the value ends in an @ token.",
          },
          {
            name: "onMention",
            type: "(person: ComposerPerson) => void",
            description:
              "Called when a person is picked; the token is replaced with their name.",
          },
          {
            name: "models",
            type: "ComposerModel[]",
            description: "Enables the model picker in the composer rail.",
          },
          {
            name: "model",
            type: "string",
            description: "Name of the active model shown on the rail control.",
          },
          {
            name: "onModelChange",
            type: "(name: string) => void",
            description: "Called when a model is picked from the menu.",
          },
          {
            name: "defaultModelMenuOpen",
            type: "boolean",
            defaultValue: "false",
            description: "Opens the model menu on mount.",
          },
          {
            name: "usage",
            type: "ComposerUsage",
            description:
              "Shows a context ring next to the send button; hovering it reveals the breakdown.",
          },
          {
            name: "recording",
            type: "boolean",
            defaultValue: "false",
            description:
              "Replaces the input with a live waveform and elapsed timer.",
          },
          {
            name: "transcribing",
            type: "boolean",
            defaultValue: "false",
            description: "Shows the transcribing state after recording stops.",
          },
          {
            name: "recordingSeconds",
            type: "number",
            defaultValue: "0",
            description: "Elapsed seconds shown next to the waveform.",
          },
          {
            name: "onVoiceStart",
            type: "() => void",
            description:
              "Shows the mic button in the rail and is called when it is pressed.",
          },
          {
            name: "onVoiceStop",
            type: "() => void",
            description: "Called by the stop control while voice is active.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "composer-slash-commands": {
    usage: `import { Composer, type ComposerCommand } from "@/components/elements/composer";

const commands: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
];

<Composer
  value={value}
  onValueChange={setValue}
  commands={commands}
  onCommand={(command) => run(command.name)}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "commands",
            type: "ComposerCommand[]",
            required: true,
            description:
              "Available commands. The menu floats above the input while the value starts with / and filters on the text after it.",
          },
          {
            name: "onCommand",
            type: "(command: ComposerCommand) => void",
            description:
              "Called when a command is picked; the input clears afterwards.",
          },
        ],
      },
      {
        component: "ComposerCommand",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Command name matched against the typed filter.",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "One-line explanation shown next to the name.",
          },
          {
            name: "icon",
            type: "LucideIcon",
            required: true,
            description: "Icon rendered at the start of the row.",
          },
        ],
      },
    ],
  },
  "composer-mentions": {
    usage: `import { Composer, type ComposerPerson } from "@/components/elements/composer";

const people: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
];

<Composer
  value={value}
  onValueChange={setValue}
  people={people}
  onMention={(person) => notify(person.name)}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "people",
            type: "ComposerPerson[]",
            required: true,
            description:
              "People and agents available to mention. The menu opens while the value ends in an @ token.",
          },
          {
            name: "onMention",
            type: "(person: ComposerPerson) => void",
            description:
              "Called when a person is picked; the @ token is replaced with their name.",
          },
        ],
      },
      {
        component: "ComposerPerson",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Display name matched against the typed filter.",
          },
          {
            name: "role",
            type: '"agent" | "human"',
            required: true,
            description: "Role tag shown at the end of the row.",
          },
        ],
      },
    ],
  },
  "composer-attachments": {
    usage: `import { Composer } from "@/components/elements/composer";

<Composer
  value={value}
  onValueChange={setValue}
  attachments={[
    { name: "design-review.pdf", meta: "2.4 MB", state: "done", kind: "text" },
    { name: "screens.zip", meta: "Uploading", state: "uploading", progress: 60, kind: "archive" },
  ]}
  onRemoveAttachment={(name) => remove(name)}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "attachments",
            type: "ComposerAttachment[]",
            required: true,
            description: "Files staged above the input field.",
          },
          {
            name: "onRemoveAttachment",
            type: "(name: string) => void",
            description:
              "Enables a remove control on attachments that finished uploading.",
          },
          {
            name: "dragActive",
            type: "boolean",
            defaultValue: "false",
            description: "Tints the surface while a file hovers over it.",
          },
        ],
      },
      {
        component: "ComposerAttachment",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "File name shown on the tile.",
          },
          {
            name: "meta",
            type: "string",
            required: true,
            description: "Secondary line: size, status, or an error message.",
          },
          {
            name: "state",
            type: '"uploading" | "done" | "error"',
            required: true,
            description: "Drives the progress bar, check, or error styling.",
          },
          {
            name: "progress",
            type: "number",
            description: "Upload percentage for the bottom progress line.",
          },
          {
            name: "kind",
            type: '"image" | "text" | "archive"',
            defaultValue: '"text"',
            description: "Picks the file icon.",
          },
        ],
      },
    ],
  },
  "composer-model-picker": {
    usage: `import { Composer, type ComposerModel } from "@/components/elements/composer";

const models: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

<Composer
  value={value}
  onValueChange={setValue}
  models={models}
  model={model}
  onModelChange={setModel}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "models",
            type: "ComposerModel[]",
            required: true,
            description:
              "Available models listed in the menu above the rail control.",
          },
          {
            name: "model",
            type: "string",
            required: true,
            description:
              "Active model name; shown on the rail control and checked in the menu.",
          },
          {
            name: "onModelChange",
            type: "(name: string) => void",
            description:
              "Called when a model is picked; the menu closes afterwards.",
          },
          {
            name: "defaultModelMenuOpen",
            type: "boolean",
            defaultValue: "false",
            description: "Opens the model menu on mount.",
          },
        ],
      },
      {
        component: "ComposerModel",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Model name shown in the row.",
          },
          {
            name: "meta",
            type: "string",
            required: true,
            description: "Context size or speed note at the end of the row.",
          },
        ],
      },
    ],
  },
  "composer-voice": {
    usage: `import { Composer } from "@/components/elements/composer";

<Composer
  value={value}
  onValueChange={setValue}
  recording={recording}
  transcribing={transcribing}
  recordingSeconds={seconds}
  onVoiceStart={startRecording}
  onVoiceStop={stopRecording}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "recording",
            type: "boolean",
            defaultValue: "false",
            description:
              "Replaces the input with a live waveform and elapsed timer.",
          },
          {
            name: "transcribing",
            type: "boolean",
            defaultValue: "false",
            description:
              "Holds the waveform in a settling state after recording stops.",
          },
          {
            name: "recordingSeconds",
            type: "number",
            defaultValue: "0",
            description:
              "Elapsed seconds shown next to the waveform; also animates the bars.",
          },
          {
            name: "onVoiceStart",
            type: "() => void",
            description:
              "Shows the mic button in the rail and is called when it is pressed.",
          },
          {
            name: "onVoiceStop",
            type: "() => void",
            description: "Called by the stop control while voice is active.",
          },
        ],
      },
    ],
  },
  "composer-context": {
    usage: `import { Composer } from "@/components/elements/composer";

<Composer
  value={value}
  onValueChange={setValue}
  usage={{ system: 24, tools: 12, messages: 142, total: 200 }}
/>`,
    props: [
      {
        component: "Composer",
        rows: [
          {
            name: "usage",
            type: "ComposerUsage",
            required: true,
            description:
              "Renders a ring next to the send button. The numbers stay hidden until hover, which reveals the segmented breakdown; everything turns red past 85% of the window.",
          },
        ],
      },
      {
        component: "ComposerUsage",
        rows: [
          {
            name: "system",
            type: "number",
            required: true,
            description: "Tokens held by the system prompt, in thousands.",
          },
          {
            name: "tools",
            type: "number",
            required: true,
            description: "Tokens held by tool definitions, in thousands.",
          },
          {
            name: "messages",
            type: "number",
            required: true,
            description: "Tokens held by the conversation, in thousands.",
          },
          {
            name: "total",
            type: "number",
            required: true,
            description: "Context window size, in thousands.",
          },
        ],
      },
    ],
  },

  "chat-panel": {
    usage: `import { ChatPanel } from "@/components/elements/chat-panel";

<ChatPanel
  userMessage="What is a runtime?"
  reply="A runtime owns thread state and tools."
  showUserMessage
  typing={false}
  visibleWords={6}
  streaming
/>`,
    props: [
      {
        component: "ChatPanel",
        rows: [
          {
            name: "userMessage",
            type: "string",
            required: true,
            description: "User bubble text shown when showUserMessage is true.",
          },
          {
            name: "reply",
            type: "string",
            required: true,
            description:
              "Full assistant reply that is sliced into streaming words.",
          },
          {
            name: "showUserMessage",
            type: "boolean",
            required: true,
            description: "Whether the user bubble is visible yet.",
          },
          {
            name: "typing",
            type: "boolean",
            required: true,
            description:
              "When true a typing row is shown before the reply starts.",
          },
          {
            name: "visibleWords",
            type: "number",
            required: true,
            description: "How many words of the reply are currently visible.",
          },
          {
            name: "streaming",
            type: "boolean",
            required: true,
            description:
              "When true the newest reply words tint as they arrive.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "empty-state": {
    usage: `import { EmptyState } from "@/components/elements/empty-state";

<EmptyState
  greeting="What are we working on?"
  suggestions={["Draft an RFC", "Debug a test"]}
/>`,
    props: [
      {
        component: "EmptyState",
        rows: [
          {
            name: "greeting",
            type: "string",
            required: true,
            description: "Centered headline shown above the suggestion chips.",
          },
          {
            name: "suggestions",
            type: "readonly string[]",
            required: true,
            description: "Starter chips that offer ways into the first turn.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "thread-list": {
    usage: `import { ThreadList } from "@/components/elements/thread-list";

<ThreadList
  threads={[
    { title: "Composer polish", time: "2m", unread: true },
    { title: "Runtime migration", time: "1h" },
  ]}
  activeIndex={activeIndex}
  onActiveIndexChange={setActiveIndex}
/>`,
    props: [
      {
        component: "ThreadList",
        rows: [
          {
            name: "threads",
            type: "readonly ThreadItem[]",
            required: true,
            description:
              "Conversation rows with title, time, and optional unread mark.",
          },
          {
            name: "activeIndex",
            type: "number",
            required: true,
            description: "Index of the currently selected thread.",
          },
          {
            name: "onActiveIndexChange",
            type: "(index: number) => void",
            description: "Called when the user clicks a thread row.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
  "scroll-anchor": {
    usage: `import { ScrollAnchor } from "@/components/elements/scroll-anchor";

<ScrollAnchor
  messages={[
    { role: "user", text: "Keep scrolling pinned?" },
    { role: "assistant", text: "Only when you are already at the bottom." },
  ]}
/>`,
    props: [
      {
        component: "ScrollAnchor",
        rows: [
          {
            name: "messages",
            type: "ScrollAnchorMessage[]",
            required: true,
            description:
              "Conversation messages appended over time inside the scroll viewport.",
          },
          {
            name: "paused",
            type: "boolean",
            defaultValue: "false",
            description:
              "Freezes the scene where it is; replay happens by remounting.",
          },
          {
            name: "onSettled",
            type: "() => void",
            description:
              "Called once every message has landed and the viewport is pinned.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
    ],
  },
};
