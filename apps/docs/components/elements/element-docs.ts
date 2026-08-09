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
  "todo-list": {
    usage: `import { TodoList } from "@/components/elements/todo-list";

<TodoList
  items={[
    { id: "read", text: "Read the failing test", status: "done" },
    { id: "fix", text: "Fix the converter", status: "active" },
    { id: "verify", text: "Re-run the suite", status: "pending" },
  ]}
  revision={2}
/>`,
    props: [
      {
        component: "TodoList",
        rows: [
          {
            name: "items",
            type: "TodoItem[]",
            required: true,
            description:
              "The list as it stands right now. Each item carries its own status, so the agent can add, reorder, and complete items in any order between renders.",
          },
          {
            name: "revision",
            type: "number",
            description:
              "Which rewrite of the list this is. Omit to show a plain done/total count instead.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "TodoItem",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity across revisions. Reusing an id keeps an item in place while its text or status changes.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description: "The item as the agent phrased it.",
          },
          {
            name: "status",
            type: '"pending" | "active" | "done"',
            required: true,
            description:
              "Per-item state. More than one item may be active if the agent works in parallel.",
          },
        ],
      },
    ],
  },
  "message-queue": {
    usage: `import { MessageQueue } from "@/components/elements/message-queue";

<MessageQueue
  running="Fix the converter and add a guard"
  queued={[{ id: "a", text: "Also add a changeset" }]}
  onCancel={(id) => drop(id)}
/>`,
    props: [
      {
        component: "MessageQueue",
        rows: [
          {
            name: "running",
            type: "string",
            required: true,
            description: "The turn currently in flight, shown above the queue.",
          },
          {
            name: "queued",
            type: "QueuedMessage[]",
            required: true,
            description:
              "Turns waiting to send, in the order they will drain once the run finishes.",
          },
          {
            name: "onCancel",
            type: "(id: string) => void",
            description:
              "Called when a queued turn is removed before it ever sends.",
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
  "message-attachment": {
    usage: `import { MessageAttachments } from "@/components/elements/message-attachment";

<MessageAttachments
  attachments={[
    { id: "spec", name: "migration.pdf", size: "1.2 MB", kind: "document", pages: 14 },
  ]}
  onOpen={(id) => preview(id)}
/>`,
    props: [
      {
        component: "MessageAttachments",
        rows: [
          {
            name: "attachments",
            type: "MessageAttachmentItem[]",
            required: true,
            description:
              "Files carried by the message. Images render as a thumbnail row, everything else as a chip.",
          },
          {
            name: "onOpen",
            type: "(id: string) => void",
            description: "Called when an attachment is opened for preview.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "MessageAttachmentItem",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity for the list key and for the callbacks that report a selection.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "File name as shown.",
          },
          {
            name: "size",
            type: "string",
            required: true,
            description:
              "Pre-formatted size. The element never converts bytes.",
          },
          {
            name: "kind",
            type: '"image" | "document" | "file"',
            required: true,
            description:
              "Chooses the shape: a thumbnail button, a paged document chip, or a plain file chip.",
          },
          {
            name: "swatch",
            type: "string",
            description:
              "CSS background-image for the thumbnail, used when kind is image. A gradient stands in for a real preview.",
          },
          {
            name: "pages",
            type: "number",
            description: "Page count appended to the size, for documents.",
          },
        ],
      },
    ],
  },
  "reviewable-diff": {
    usage: `import { ReviewableDiff } from "@/components/elements/reviewable-diff";

<ReviewableDiff
  filename="composer.tsx"
  hunks={hunks}
  onKeep={(id) => decide(id, "kept")}
  onDiscard={(id) => decide(id, "discarded")}
  onApply={commit}
/>`,
    props: [
      {
        component: "ReviewableDiff",
        rows: [
          {
            name: "filename",
            type: "string",
            required: true,
            description: "File the hunks belong to.",
          },
          {
            name: "hunks",
            type: "DiffHunk[]",
            required: true,
            description:
              "Each hunk carries its own decision. Apply stays disabled until none are pending.",
          },
          {
            name: "onKeep",
            type: "(id: string) => void",
            description: "Called when a hunk is accepted.",
          },
          {
            name: "onDiscard",
            type: "(id: string) => void",
            description: "Called when a hunk is rejected.",
          },
          {
            name: "onApply",
            type: "() => void",
            description:
              "Called when the reviewed set is committed. Only kept hunks should be written.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "DiffHunk",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity, reported back by onKeep and onDiscard.",
          },
          {
            name: "range",
            type: "string",
            required: true,
            description: "Unified-diff range header, shown in mono.",
          },
          {
            name: "decision",
            type: '"pending" | "kept" | "discarded"',
            required: true,
            description:
              "Discarded hunks stay visible at reduced opacity so the review reads as a whole.",
          },
          {
            name: "lines",
            type: "DiffLine[]",
            required: true,
            description:
              "Reuses the DiffLine shape from the code diff element.",
          },
        ],
      },
    ],
  },
  "file-tree": {
    usage: `import { FileTree } from "@/components/elements/file-tree";

<FileTree
  nodes={nodes}
  visibleCount={nodes.length}
  totalAdditions={78}
  totalDeletions={9}
/>`,
    props: [
      {
        component: "FileTree",
        rows: [
          {
            name: "nodes",
            type: "FileTreeNode[]",
            required: true,
            description:
              "Flat list in display order. Nesting comes from each node's depth, not from children arrays.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description:
              "How many nodes have landed. Raise it as the run touches more files.",
          },
          {
            name: "totalAdditions",
            type: "number",
            required: true,
            description: "Added lines across the whole change.",
          },
          {
            name: "totalDeletions",
            type: "number",
            required: true,
            description: "Removed lines across the whole change.",
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
  "elicitation-form": {
    usage: `import { ElicitationForm } from "@/components/elements/elicitation-form";

<ElicitationForm
  server="github-mcp"
  message="Confirm where the release notes should be published."
  fields={fields}
  state="request"
  onAccept={send}
  onDecline={decline}
/>`,
    props: [
      {
        component: "ElicitationForm",
        rows: [
          {
            name: "server",
            type: "string",
            required: true,
            description: "Which server paused to ask.",
          },
          {
            name: "message",
            type: "string",
            required: true,
            description: "Why the input is needed, in the server's words.",
          },
          {
            name: "fields",
            type: "ElicitationField[]",
            required: true,
            description:
              "The schema the server sent, already resolved to display values.",
          },
          {
            name: "state",
            type: '"request" | "accepted" | "declined"',
            required: true,
            description:
              "Swaps the action row for the outcome once the user answers.",
          },
          {
            name: "onAccept",
            type: "() => void",
            description: "Called when the filled form is sent back.",
          },
          {
            name: "onDecline",
            type: "() => void",
            description: "Called when the request is refused.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ElicitationField",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Field name sent back to the server.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description: "Label shown above the control.",
          },
          {
            name: "value",
            type: "string",
            required: true,
            description:
              "Current value, already resolved to what should be displayed.",
          },
          {
            name: "kind",
            type: '"text" | "choice" | "toggle"',
            required: true,
            description:
              "Chooses the control: a value chip, a row of options, or a switch.",
          },
          {
            name: "options",
            type: "string[]",
            description: "Choices rendered when kind is choice.",
          },
          {
            name: "required",
            type: "boolean",
            defaultValue: "false",
            description: "Marks the label with an asterisk.",
          },
        ],
      },
    ],
  },
  "retrieval-chunks": {
    usage: `import { RetrievalChunks } from "@/components/elements/retrieval-chunks";

<RetrievalChunks
  query="how does draft restore work"
  chunks={chunks}
  visibleCount={3}
  searching={false}
/>`,
    props: [
      {
        component: "RetrievalChunks",
        rows: [
          {
            name: "query",
            type: "string",
            required: true,
            description: "The text that was embedded and searched.",
          },
          {
            name: "chunks",
            type: "RetrievalChunk[]",
            required: true,
            description:
              "Passages returned above the threshold, already sorted by score.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many passages have landed so far.",
          },
          {
            name: "searching",
            type: "boolean",
            required: true,
            description:
              "Shimmers the status line while the index is still being queried.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "RetrievalChunk",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the list key.",
          },
          {
            name: "source",
            type: "string",
            required: true,
            description:
              "Where the passage came from: a file, a document, a record.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description: "The passage itself, clamped to two lines.",
          },
          {
            name: "locator",
            type: "string",
            required: true,
            description:
              "Where inside the source the passage sits: a section, a line range, a page.",
          },
          {
            name: "score",
            type: "number",
            required: true,
            description:
              "Similarity from 0 to 1. Drives both the printed value and the bar, and turns green at 0.8.",
          },
        ],
      },
    ],
  },
  chart: {
    usage: `import { Chart } from "@/components/elements/chart";

<Chart
  label="Runs this week"
  value="92"
  delta="+34%"
  points={points}
  visibleCount={points.length}
  variant="area"
/>`,
    props: [
      {
        component: "Chart",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description: "What the series measures.",
          },
          {
            name: "value",
            type: "string",
            required: true,
            description:
              "The headline figure, pre-formatted. The chart never formats numbers itself.",
          },
          {
            name: "delta",
            type: "string",
            description:
              "Change against the previous window. Renders green unless it starts with a minus sign.",
          },
          {
            name: "points",
            type: "number[]",
            required: true,
            description:
              "The full series. The scale is computed from all of it, so the axis does not jump while streaming.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many points have arrived.",
          },
          {
            name: "variant",
            type: '"area" | "line" | "bars"',
            defaultValue: '"area"',
            description:
              "Mark type. The last point stays emphasized in all three.",
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
  "trace-waterfall": {
    usage: `import { TraceWaterfall } from "@/components/elements/trace-waterfall";

<TraceWaterfall spans={spans} totalMs={1840} visibleCount={spans.length} />`,
    props: [
      {
        component: "TraceWaterfall",
        rows: [
          {
            name: "spans",
            type: "TraceSpan[]",
            required: true,
            description:
              "Flat list in start order. Nesting comes from each span's depth.",
          },
          {
            name: "totalMs",
            type: "number",
            required: true,
            description:
              "Width of the axis. Bars are positioned against this, not against the widest span.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many spans have been reported so far.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "TraceSpan",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description:
              "Span label in the left rail; truncates rather than wraps.",
          },
          {
            name: "depth",
            type: "number",
            required: true,
            description:
              "Nesting level. Indents the label; the bar position comes from startMs, not from this.",
          },
          {
            name: "startMs",
            type: "number",
            required: true,
            description: "Offset from the start of the trace.",
          },
          {
            name: "durationMs",
            type: "number",
            required: true,
            description:
              "How long the span took. A running span still needs one so its bar has width.",
          },
          {
            name: "status",
            type: '"running" | "completed" | "failed"',
            required: true,
            description:
              "Running pulses in blue, completed is neutral, failed is red.",
          },
        ],
      },
    ],
  },
  "canvas-split": {
    usage: `import { CanvasSplit } from "@/components/elements/canvas-split";

<CanvasSplit
  messages={messages}
  title="migration-0.14.md"
  version={3}
  lines={lines}
  visibleLines={lines.length}
  saved
/>`,
    props: [
      {
        component: "CanvasSplit",
        rows: [
          {
            name: "messages",
            type: "CanvasMessage[]",
            required: true,
            description:
              "The thread, compressed into the side rail while the document holds the room.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "Document name in the canvas header.",
          },
          {
            name: "version",
            type: "number",
            required: true,
            description: "Which revision is on screen.",
          },
          {
            name: "lines",
            type: "string[]",
            required: true,
            description:
              "Document body, one paragraph per entry. A leading # marks a heading.",
          },
          {
            name: "visibleLines",
            type: "number",
            required: true,
            description:
              "How much has been written. A caret trails the last line until this reaches the end.",
          },
          {
            name: "saved",
            type: "boolean",
            required: true,
            description: "Swaps the header status between editing and saved.",
          },
          {
            name: "onCopy",
            type: "() => void",
            description:
              "Called from the copy action. Omit it and the control renders disabled rather than promising a copy it cannot make.",
          },
          {
            name: "onClose",
            type: "() => void",
            description: "Called when the canvas is dismissed.",
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
  "voice-conversation": {
    usage: `import { VoiceConversation } from "@/components/elements/voice-conversation";

<VoiceConversation
  mode="listening"
  amplitude={0.6}
  transcript={transcript}
  onToggleMute={toggleMute}
  onEnd={hangUp}
/>`,
    props: [
      {
        component: "VoiceConversation",
        rows: [
          {
            name: "mode",
            type: '"connecting" | "listening" | "thinking" | "speaking"',
            required: true,
            description:
              "Drives the orb and the caption. Only listening and speaking react to amplitude.",
          },
          {
            name: "amplitude",
            type: "number",
            required: true,
            description:
              "Current level from 0 to 1, clamped internally. Feed it from the analyser node.",
          },
          {
            name: "transcript",
            type: "VoiceTurn[]",
            required: true,
            description: "Turns so far, oldest first.",
          },
          {
            name: "muted",
            type: "boolean",
            defaultValue: "false",
            description: "Marks the mic control as engaged and swaps the hint.",
          },
          {
            name: "onToggleMute",
            type: "() => void",
            description: "Called when the mic is muted or unmuted.",
          },
          {
            name: "onInterrupt",
            type: "() => void",
            description:
              "Called when the orb is pressed while the assistant is speaking. The orb is inert in every other mode, so the caption only offers the interrupt when one is possible.",
          },
          {
            name: "onEnd",
            type: "() => void",
            description: "Called when the call is ended.",
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
  "read-aloud": {
    usage: `import { ReadAloud } from "@/components/elements/read-aloud";

<ReadAloud
  words={words}
  spokenIndex={12}
  playing
  rate={1}
  elapsed="0:04"
  duration="0:11"
  onToggle={toggle}
  onRateChange={cycleRate}
/>`,
    props: [
      {
        component: "ReadAloud",
        rows: [
          {
            name: "words",
            type: "string[]",
            required: true,
            description:
              "The answer split into words, so the spoken one can be lit without re-parsing the text.",
          },
          {
            name: "spokenIndex",
            type: "number",
            required: true,
            description:
              "Index of the word being spoken. Everything before it dims, everything after stays waiting.",
          },
          {
            name: "playing",
            type: "boolean",
            required: true,
            description: "Swaps the transport button between play and pause.",
          },
          {
            name: "rate",
            type: "number",
            required: true,
            description: "Playback speed, printed on the rate control.",
          },
          {
            name: "elapsed",
            type: "string",
            required: true,
            description: "Pre-formatted elapsed time.",
          },
          {
            name: "duration",
            type: "string",
            required: true,
            description: "Pre-formatted total duration.",
          },
          {
            name: "onToggle",
            type: "() => void",
            description: "Called when playback is started or paused.",
          },
          {
            name: "onRateChange",
            type: "() => void",
            description:
              "Called when the rate control is tapped; cycle the rate yourself.",
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
  "mcp-server-panel": {
    usage: `import { McpServerPanel } from "@/components/elements/mcp-server-panel";

<McpServerPanel
  servers={servers}
  expandedId={expandedId}
  onToggle={setExpandedId}
  onAuthorize={startOAuth}
/>`,
    props: [
      {
        component: "McpServerPanel",
        rows: [
          {
            name: "servers",
            type: "McpServer[]",
            required: true,
            description:
              "Every configured server, connected or not. The header counts how many are live.",
          },
          {
            name: "expandedId",
            type: "string",
            description:
              "Which server is open. Only one expands at a time; omit for an all-collapsed list.",
          },
          {
            name: "onToggle",
            type: "(id: string) => void",
            description: "Called when a server row is expanded or collapsed.",
          },
          {
            name: "onAuthorize",
            type: "(id: string) => void",
            description:
              "Called from the Authorize button, shown only while a server needs auth.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "McpServer",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity, reported back by onToggle and onAuthorize.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Server name as configured.",
          },
          {
            name: "transport",
            type: "string",
            required: true,
            description:
              "How the server is reached: stdio, sse, streamable-http.",
          },
          {
            name: "status",
            type: '"connected" | "connecting" | "needs-auth" | "failed"',
            required: true,
            description:
              "Drives the status dot and, for needs-auth, surfaces the authorize action.",
          },
          {
            name: "tools",
            type: "string[]",
            required: true,
            description:
              "Tool names the server contributed, counted collapsed and listed expanded.",
          },
        ],
      },
    ],
  },
  "feedback-dialog": {
    usage: `import { FeedbackDialog } from "@/components/elements/feedback-dialog";

<FeedbackDialog
  reasons={["Not factual", "Too long"]}
  selected={selected}
  note={note}
  sent={sent}
  onToggleReason={toggle}
  onNoteChange={setNote}
  onSubmit={send}
/>`,
    props: [
      {
        component: "FeedbackDialog",
        rows: [
          {
            name: "reasons",
            type: "string[]",
            required: true,
            description:
              "The reason chips offered. Keep them short enough to scan in one line.",
          },
          {
            name: "selected",
            type: "string[]",
            required: true,
            description:
              "Which reasons are currently picked. More than one is allowed.",
          },
          {
            name: "note",
            type: "string",
            required: true,
            description: "Free-text detail, always optional.",
          },
          {
            name: "sent",
            type: "boolean",
            required: true,
            description:
              "Replaces the whole form with an acknowledgement once the report is filed.",
          },
          {
            name: "onToggleReason",
            type: "(reason: string) => void",
            description: "Called when a reason chip is picked or unpicked.",
          },
          {
            name: "onNoteChange",
            type: "(note: string) => void",
            description: "Called as the free-text note is typed.",
          },
          {
            name: "onSubmit",
            type: "() => void",
            description: "Called when the report is sent.",
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
  "quote-reply": {
    usage: `import { QuoteReply } from "@/components/elements/quote-reply";

<QuoteReply
  before="The regression happens because "
  selection="the converter drops parts with no text"
  after=", so the turn never lands."
  actions={actions}
  toolbarVisible
  onAction={handle}
/>`,
    props: [
      {
        component: "QuoteReply",
        rows: [
          {
            name: "before",
            type: "string",
            required: true,
            description: "Text preceding the selection.",
          },
          {
            name: "selection",
            type: "string",
            required: true,
            description: "The highlighted run the actions apply to.",
          },
          {
            name: "after",
            type: "string",
            required: true,
            description: "Text following the selection.",
          },
          {
            name: "actions",
            type: "QuoteAction[]",
            required: true,
            description:
              "What the toolbar offers. Each action names one of the three built-in icons.",
          },
          {
            name: "toolbarVisible",
            type: "boolean",
            required: true,
            description:
              "Whether the floating toolbar is showing. Drive it from your own selection handler.",
          },
          {
            name: "quoted",
            type: "string",
            description:
              "Once quoted, the text carried into the composer, shown under a rule.",
          },
          {
            name: "onAction",
            type: "(key: string) => void",
            description: "Called with the key of the action that was chosen.",
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
  "edit-message": {
    usage: `import { EditMessage } from "@/components/elements/edit-message";

<EditMessage
  value={value}
  discardedReplies={3}
  editing={editing}
  onValueChange={setValue}
  onStartEdit={() => setEditing(true)}
  onCancel={cancel}
  onSave={save}
/>`,
    props: [
      {
        component: "EditMessage",
        rows: [
          {
            name: "value",
            type: "string",
            required: true,
            description:
              "The message text, read when resting and edited when open.",
          },
          {
            name: "discardedReplies",
            type: "number",
            required: true,
            description:
              "How many replies sending would drop. The warning hides at zero.",
          },
          {
            name: "editing",
            type: "boolean",
            required: true,
            description:
              "Swaps between the resting bubble and the edit composer.",
          },
          {
            name: "onValueChange",
            type: "(value: string) => void",
            description: "Called as the message is edited.",
          },
          {
            name: "onStartEdit",
            type: "() => void",
            description: "Called when the resting bubble is clicked.",
          },
          {
            name: "onCancel",
            type: "() => void",
            description:
              "Called when the edit is abandoned. Restore the original yourself.",
          },
          {
            name: "onSave",
            type: "() => void",
            description: "Called when the edited message is sent.",
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
  "stopped-run": {
    usage: `import { StoppedRun } from "@/components/elements/stopped-run";

<StoppedRun words={words} reason="stopped by you" onContinue={resume} />`,
    props: [
      {
        component: "StoppedRun",
        rows: [
          {
            name: "words",
            type: "string[]",
            required: true,
            description:
              "The partial answer as it stood when the run stopped. It stays on screen.",
          },
          {
            name: "reason",
            type: "string",
            required: true,
            description:
              "Why it ended: stopped by you, hit the token limit, timed out.",
          },
          {
            name: "onContinue",
            type: "() => void",
            description: "Called to resume from where the answer left off.",
          },
          {
            name: "onDiscard",
            type: "() => void",
            description: "Called to drop the partial answer.",
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
  "message-timing": {
    usage: `import { MessageTiming } from "@/components/elements/message-timing";

<MessageTiming
  stats={[
    { label: "ttft", value: "0.4s" },
    { label: "total", value: "2.6s" },
  ]}
/>`,
    props: [
      {
        component: "MessageTiming",
        rows: [
          {
            name: "stats",
            type: "TimingStat[]",
            required: true,
            description:
              "Label and value pairs, pre-formatted. Show fewer while streaming and the full set once the turn settles.",
          },
          {
            name: "streaming",
            type: "boolean",
            defaultValue: "false",
            description: "Tints the values blue while they are still moving.",
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
  "connection-state": {
    usage: `import { ConnectionState } from "@/components/elements/connection-state";

<ConnectionState phase="reconnecting" attempt={2} onRetry={reconnect} />`,
    props: [
      {
        component: "ConnectionState",
        rows: [
          {
            name: "phase",
            type: '"online" | "dropped" | "reconnecting" | "resumed"',
            required: true,
            description:
              "Which banner to show. online renders nothing, so the element can stay mounted.",
          },
          {
            name: "attempt",
            type: "number",
            description: "Retry number, shown while reconnecting.",
          },
          {
            name: "resumedTokens",
            type: "number",
            description:
              "How much of the stream was recovered, shown once resumed.",
          },
          {
            name: "onRetry",
            type: "() => void",
            description: "Called from the Reconnect button while dropped.",
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
  "agent-card": {
    usage: `import { AgentCard } from "@/components/elements/agent-card";

<AgentCard
  name="Maintainer"
  description="Reproduces the report, writes the fix, opens the PR."
  provider="assistant-ui"
  version="1.4.0"
  model="opus"
  endpoint="https://agents.example.com/a2a"
  skills={skills}
  connected={false}
  onConnect={connect}
/>`,
    props: [
      {
        component: "AgentCard",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Display name of the agent.",
          },
          {
            name: "description",
            type: "string",
            required: true,
            description: "What it does, in one or two sentences.",
          },
          {
            name: "provider",
            type: "string",
            required: true,
            description: "Who publishes it.",
          },
          {
            name: "version",
            type: "string",
            required: true,
            description: "Card version, printed next to the name.",
          },
          {
            name: "model",
            type: "string",
            required: true,
            description: "Model the agent runs on.",
          },
          {
            name: "endpoint",
            type: "string",
            required: true,
            description: "Where it is reached. Truncates rather than wraps.",
          },
          {
            name: "skills",
            type: "AgentSkill[]",
            required: true,
            description: "Named capabilities the card advertises.",
          },
          {
            name: "connected",
            type: "boolean",
            required: true,
            description:
              "Swaps the action for a settled Connected state and disables it.",
          },
          {
            name: "onConnect",
            type: "() => void",
            description: "Called when the agent is added.",
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
  "web-preview": {
    usage: `import { WebPreview } from "@/components/elements/web-preview";

<WebPreview origin="scf.auiusercontent.com" loading={false} onReload={reload}>
  <iframe title="Preview" src={sandboxUrl} sandbox="allow-scripts" />
</WebPreview>`,
    props: [
      {
        component: "WebPreview",
        rows: [
          {
            name: "origin",
            type: "string",
            required: true,
            description:
              "Host the content is served from. Show the sandbox origin, not your own, so the isolation is legible. Displaying it does not create the isolation; the frame you pass as children must already be sandboxed.",
          },
          {
            name: "loading",
            type: "boolean",
            required: true,
            description:
              "Fades the frame out and shimmers a status while the sandbox is being set up.",
          },
          {
            name: "children",
            type: "React.ReactNode",
            required: true,
            description:
              "The frame itself. In production this is a sandboxed iframe, not inline markup.",
          },
          {
            name: "onReload",
            type: "() => void",
            description: "Called from the reload control.",
          },
          {
            name: "onOpenExternal",
            type: "() => void",
            description: "Called from the open-in-new-tab control.",
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
  "draft-restore": {
    usage: `import { DraftRestore } from "@/components/elements/draft-restore";

<DraftRestore
  draft="Add a regression test for draft restore"
  savedAt="2 minutes ago"
  onRestore={restore}
  onDiscard={discard}
/>`,
    props: [
      {
        component: "DraftRestore",
        rows: [
          {
            name: "draft",
            type: "string",
            required: true,
            description: "The unsent text, truncated to one line.",
          },
          {
            name: "savedAt",
            type: "string",
            required: true,
            description: "When it was last touched, pre-formatted.",
          },
          {
            name: "onRestore",
            type: "() => void",
            description: "Called to put the draft back in the composer.",
          },
          {
            name: "onDiscard",
            type: "() => void",
            description: "Called to throw the draft away.",
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
  diagram: {
    usage: `import { Diagram } from "@/components/elements/diagram";

<Diagram title="message flow" zoom={zoom} onZoomIn={zoomIn} onReset={reset}>
  <MermaidSvg chart={chart} />
</Diagram>`,
    props: [
      {
        component: "Diagram",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "What the diagram shows.",
          },
          {
            name: "zoom",
            type: "number",
            required: true,
            description:
              "Scale factor applied to the content. 1 is fit; the header prints it as a percentage.",
          },
          {
            name: "children",
            type: "React.ReactNode",
            required: true,
            description:
              "The rendered graphic. The element owns the frame and never parses or injects markup itself, so whatever renders your chart stays your choice.",
          },
          {
            name: "onZoomIn",
            type: "() => void",
            description:
              "Called from the zoom-in control. Clamp the range yourself.",
          },
          {
            name: "onZoomOut",
            type: "() => void",
            description: "Called from the zoom-out control.",
          },
          {
            name: "onReset",
            type: "() => void",
            description: "Called to return to the default view.",
          },
          {
            name: "onExpand",
            type: "() => void",
            description: "Called to open the diagram full screen.",
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
  "flow-graph": {
    usage: `import { FlowGraph } from "@/components/elements/flow-graph";

<FlowGraph nodes={nodes} edges={edges} visibleCount={nodes.length} />`,
    props: [
      {
        component: "FlowGraph",
        rows: [
          {
            name: "nodes",
            type: "FlowNode[]",
            required: true,
            description:
              "Every node with its grid position. Layout is explicit; the element runs no solver.",
          },
          {
            name: "edges",
            type: "FlowEdge[]",
            required: true,
            description:
              "Connections by node id. An edge dims until both of its ends are visible.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many nodes have been reached so far.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "FlowNode",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity for the row key, and how edges name their endpoints. FlowGraph exposes no callbacks, so nothing else reports it.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "Text inside the node, rendered in mono and not wrapped.",
          },
          {
            name: "column",
            type: "number",
            required: true,
            description:
              "Zero-based column. Drives horizontal position and the edge curves.",
          },
          {
            name: "row",
            type: "number",
            required: true,
            description: "Zero-based row.",
          },
          {
            name: "state",
            type: '"done" | "active" | "pending"',
            required: true,
            description:
              "Done is filled and dim, active is tinted, pending is a dashed outline.",
          },
        ],
      },
    ],
  },
  "activity-graph": {
    usage: `import { ActivityGraph } from "@/components/elements/activity-graph";

<ActivityGraph
  data={data}
  start={start}
  end={end}
  title="Agent runs"
  total="1,204 in 6 months"
/>`,
    props: [
      {
        component: "ActivityGraph",
        rows: [
          {
            name: "data",
            type: "DataPoint[]",
            required: true,
            description:
              "Date and count pairs from the heat-graph package. Levels are classified for you; gaps are filled as empty cells.",
          },
          {
            name: "start",
            type: "string | Date",
            required: true,
            description:
              "First day of the window. Pass it explicitly: left unset, heat-graph draws a full year ending today, which will not match your data.",
          },
          {
            name: "end",
            type: "string | Date",
            required: true,
            description:
              "Last day of the window. Cells are fixed-size, so a long window scrolls horizontally rather than shrinking.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "What is being counted.",
          },
          {
            name: "total",
            type: "string",
            required: true,
            description: "Pre-formatted summary shown opposite the title.",
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
  "tool-group": {
    usage: `import { ToolGroup } from "@/components/elements/tool-group";

<ToolGroup
  label="Read 4 files in parallel"
  tools={tools}
  open={open}
  onOpenChange={setOpen}
/>`,
    props: [
      {
        component: "ToolGroup",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description: "What the group did, as one line.",
          },
          {
            name: "tools",
            type: "GroupedTool[]",
            required: true,
            description:
              "Calls issued together. The header summarizes them: progress while any run, failures if any failed, otherwise the count.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the per-call list is expanded.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            description: "Called when the group is expanded or collapsed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "GroupedTool",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Tool name, rendered in mono.",
          },
          {
            name: "target",
            type: "string",
            required: true,
            description: "What the call acted on: a path, a query, an id.",
          },
          {
            name: "state",
            type: '"running" | "done" | "failed"',
            required: true,
            description: "Per-call state, rolled up into the header summary.",
          },
          {
            name: "durationMs",
            type: "number",
            description: "Printed once the call settles. Omit while running.",
          },
        ],
      },
    ],
  },
  "context-breakdown": {
    usage: `import { ContextBreakdown } from "@/components/elements/context-breakdown";

<ContextBreakdown segments={segments} limit={128000} />`,
    props: [
      {
        component: "ContextBreakdown",
        rows: [
          {
            name: "segments",
            type: "ContextSegment[]",
            required: true,
            description:
              "What is occupying the window, in stacking order. Headroom is derived, not passed.",
          },
          {
            name: "limit",
            type: "number",
            required: true,
            description:
              "Window size. The header turns amber once the segments pass 85 percent of it. A zero limit is treated as zero pressure rather than dividing by it.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ContextSegment",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "What this slice of the window is, shown in the legend.",
          },
          {
            name: "tokens",
            type: "number",
            required: true,
            description: "Raw token count. The element formats it.",
          },
          {
            name: "tint",
            type: "string",
            required: true,
            description:
              "Background class shared by the bar slice and the legend dot, so the two always agree.",
          },
        ],
      },
    ],
  },
  "model-picker": {
    usage: `import { ModelPicker } from "@/components/elements/model-picker";

<ModelPicker models={models} selectedId={selectedId} onSelect={setSelectedId} />`,
    props: [
      {
        component: "ModelPicker",
        rows: [
          {
            name: "models",
            type: "PickableModel[]",
            required: true,
            description:
              "Every model on offer. Families are derived from the entries and keep their first-seen order.",
          },
          {
            name: "selectedId",
            type: "string",
            required: true,
            description: "Which model is active.",
          },
          {
            name: "onSelect",
            type: "(id: string) => void",
            description: "Called when a model is picked.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "PickableModel",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity, compared against selectedId and reported by onSelect.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Display name of the model.",
          },
          {
            name: "family",
            type: "string",
            required: true,
            description: "Group heading the model sits under.",
          },
          {
            name: "context",
            type: "string",
            required: true,
            description: "Window size, pre-formatted.",
          },
          {
            name: "price",
            type: "string",
            required: true,
            description:
              "Cost, pre-formatted. The element never does currency math.",
          },
          {
            name: "capabilities",
            type: "string[]",
            required: true,
            description: "Short capability chips: vision, tools, thinking.",
          },
        ],
      },
    ],
  },
  "reasoning-effort": {
    usage: `import { ReasoningEffort } from "@/components/elements/reasoning-effort";

<ReasoningEffort
  levels={levels}
  selectedKey="high"
  spent={5200}
  onSelect={setLevel}
/>`,
    props: [
      {
        component: "ReasoningEffort",
        rows: [
          {
            name: "levels",
            type: "EffortLevel[]",
            required: true,
            description:
              "Every tier on offer, each carrying its own token budget.",
          },
          {
            name: "selectedKey",
            type: "string",
            required: true,
            description:
              "Which tier is active. Its budget becomes the denominator.",
          },
          {
            name: "spent",
            type: "number",
            required: true,
            description:
              "Thinking tokens used so far, filling the bar against the selected budget.",
          },
          {
            name: "onSelect",
            type: "(key: string) => void",
            description: "Called when a tier is picked.",
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
  "guardrail-notice": {
    usage: `import { GuardrailNotice } from "@/components/elements/guardrail-notice";

<GuardrailNotice
  title="I can't help with that"
  explanation="This asks for a working attack against infrastructure you don't own."
  policy="policy"
  alternatives={alternatives}
/>`,
    props: [
      {
        component: "GuardrailNotice",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description:
              "The refusal in one line, stated plainly rather than apologetically.",
          },
          {
            name: "explanation",
            type: "string",
            required: true,
            description: "Why, and where the line actually sits.",
          },
          {
            name: "policy",
            type: "string",
            required: true,
            description: "Short label for the rule that applied.",
          },
          {
            name: "alternatives",
            type: "string[]",
            required: true,
            description:
              "The nearest things it can do. Pass an empty array to hide the section.",
          },
          {
            name: "onPick",
            type: "(alternative: string) => void",
            description: "Called when an alternative is chosen.",
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
  "day-separator": {
    usage: `import { DaySeparator } from "@/components/elements/day-separator";

<DaySeparator messages={messages} />`,
    props: [
      {
        component: "DaySeparator",
        rows: [
          {
            name: "messages",
            type: "DatedMessage[]",
            required: true,
            description:
              "Turns in order. A separator is inserted wherever day changes from the previous message, so grouping needs no pre-processing.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "DatedMessage",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "role",
            type: '"user" | "assistant"',
            required: true,
            description:
              "Who sent it. User turns sit right in a bubble, assistant turns run flush left.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description: "Message body.",
          },
          {
            name: "day",
            type: "string",
            required: true,
            description:
              "Pre-formatted day label. Compared against the previous message to decide where a rule goes.",
          },
          {
            name: "time",
            type: "string",
            required: true,
            description: "Pre-formatted time, revealed on hover.",
          },
        ],
      },
    ],
  },
  "speaker-identity": {
    usage: `import { SpeakerIdentity } from "@/components/elements/speaker-identity";

<SpeakerIdentity turns={turns} />`,
    props: [
      {
        component: "SpeakerIdentity",
        rows: [
          {
            name: "turns",
            type: "SpeakerTurn[]",
            required: true,
            description: "Turns in order, each naming who produced it.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "SpeakerTurn",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description: "What this speaker said.",
          },
          {
            name: "kind",
            type: '"user" | "agent" | "subagent" | "tool"',
            required: true,
            description:
              "Chooses the badge shape and tone. Subagents get a round badge so they read as delegated.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Display name for the speaker.",
          },
          {
            name: "detail",
            type: "string",
            description:
              "Secondary fact next to the name: the model, a duration.",
          },
        ],
      },
    ],
  },
  "regenerate-menu": {
    usage: `import { RegenerateMenu } from "@/components/elements/regenerate-menu";

<RegenerateMenu
  options={options}
  open={open}
  currentId="sonnet"
  onOpenChange={setOpen}
  onPick={regenerate}
/>`,
    props: [
      {
        component: "RegenerateMenu",
        rows: [
          {
            name: "options",
            type: "RegenerateOption[]",
            required: true,
            description: "What the turn can be re-run with.",
          },
          {
            name: "open",
            type: "boolean",
            required: true,
            description: "Whether the menu is showing.",
          },
          {
            name: "currentId",
            type: "string",
            required: true,
            description:
              "Which option produced the answer on screen; it is labelled current instead of showing its detail.",
          },
          {
            name: "onOpenChange",
            type: "(open: boolean) => void",
            description: "Called when the trigger is toggled.",
          },
          {
            name: "onPick",
            type: "(id: string) => void",
            description: "Called with the chosen option.",
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
  "confidence-marker": {
    usage: `import { ConfidenceMarker } from "@/components/elements/confidence-marker";

<ConfidenceMarker claims={claims} hoveredId={hoveredId} onHover={setHoveredId} />`,
    props: [
      {
        component: "ConfidenceMarker",
        rows: [
          {
            name: "claims",
            type: "ConfidenceClaim[]",
            required: true,
            description:
              "The answer split into claims. Each is underlined according to how well it is supported.",
          },
          {
            name: "hoveredId",
            type: "string",
            required: true,
            description:
              "Which claim is hovered. Pass an empty string for none.",
          },
          {
            name: "onHover",
            type: "(id: string) => void",
            description:
              "Called with the hovered claim id, or an empty string on exit.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ConfidenceClaim",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, compared against hoveredId.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description:
              "The claim, rendered inline with its confidence underline.",
          },
          {
            name: "confidence",
            type: '"grounded" | "inferred" | "uncertain"',
            required: true,
            description:
              "Drives the underline: solid green, solid amber, dotted red.",
          },
          {
            name: "basis",
            type: "string",
            required: true,
            description: "What backs the claim, shown in the hover pill.",
          },
        ],
      },
    ],
  },
  "tool-error": {
    usage: `import { ToolError } from "@/components/elements/tool-error";

<ToolError
  name="fetch"
  target="https://api.example.com/v1/issues"
  message="ETIMEDOUT after 30000ms"
  attempt={2}
  maxAttempts={3}
  retrying={false}
  onRetry={retry}
/>`,
    props: [
      {
        component: "ToolError",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "Tool that failed.",
          },
          {
            name: "target",
            type: "string",
            required: true,
            description: "What it was called against.",
          },
          {
            name: "message",
            type: "string",
            required: true,
            description: "The raw error, shown in mono rather than reworded.",
          },
          {
            name: "attempt",
            type: "number",
            required: true,
            description: "Which attempt this was.",
          },
          {
            name: "maxAttempts",
            type: "number",
            required: true,
            description: "How many the runtime will make.",
          },
          {
            name: "retrying",
            type: "boolean",
            required: true,
            description:
              "Swaps the retry control for a spinner and disables it.",
          },
          {
            name: "onRetry",
            type: "() => void",
            description:
              "Called to run the call again without restarting the turn.",
          },
          {
            name: "onSkip",
            type: "() => void",
            description:
              "Called to give up on this call and let the turn continue.",
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
  "permission-grant": {
    usage: `import { PermissionGrant } from "@/components/elements/permission-grant";

<PermissionGrant
  capability="Filesystem access"
  requester="filesystem-mcp"
  reach={reach}
  scope="pending"
  onGrant={setScope}
/>`,
    props: [
      {
        component: "PermissionGrant",
        rows: [
          {
            name: "capability",
            type: "string",
            required: true,
            description:
              "What is being granted, named as a capability rather than an action.",
          },
          {
            name: "requester",
            type: "string",
            required: true,
            description: "Who is asking.",
          },
          {
            name: "reach",
            type: "string[]",
            required: true,
            description:
              "Exactly what the grant covers, and what it does not. Write the limits in too.",
          },
          {
            name: "scope",
            type: '"pending" | "session" | "always" | "denied"',
            required: true,
            description:
              "pending shows the choices; anything else shows the settled outcome.",
          },
          {
            name: "onGrant",
            type: "(scope: GrantScope) => void",
            description: "Called with the scope the user chose.",
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
  "computer-use": {
    usage: `import { ComputerUse } from "@/components/elements/computer-use";

<ComputerUse url="github.com/..." steps={steps} activeIndex={2}>
  <iframe title="Session" src={streamUrl} />
</ComputerUse>`,
    props: [
      {
        component: "ComputerUse",
        rows: [
          {
            name: "url",
            type: "string",
            required: true,
            description: "What the session is pointed at.",
          },
          {
            name: "steps",
            type: "ComputerStep[]",
            required: true,
            description:
              "Actions taken, in order. Each carries the coordinates the cursor moved to.",
          },
          {
            name: "activeIndex",
            type: "number",
            required: true,
            description:
              "Which step is happening now. The two before it stay as a fading trail.",
          },
          {
            name: "children",
            type: "React.ReactNode",
            required: true,
            description:
              "The viewport being driven: a video stream, a screenshot, an iframe.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ComputerStep",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the step key.",
          },
          {
            name: "action",
            type: "string",
            required: true,
            description: "Verb the agent performed: click, type, scroll.",
          },
          {
            name: "target",
            type: "string",
            required: true,
            description: "What it acted on.",
          },
          {
            name: "x",
            type: "number",
            required: true,
            description:
              "Horizontal position as a percentage of the viewport width.",
          },
          {
            name: "y",
            type: "number",
            required: true,
            description:
              "Vertical position as a percentage of the viewport height.",
          },
        ],
      },
    ],
  },
  "code-runner": {
    usage: `import { CodeRunner } from "@/components/elements/code-runner";

<CodeRunner
  language="typescript"
  code={code}
  state="ok"
  output={["1"]}
  durationMs={38}
  onRun={run}
/>`,
    props: [
      {
        component: "CodeRunner",
        rows: [
          {
            name: "language",
            type: "string",
            required: true,
            description: "Language label above the snippet.",
          },
          {
            name: "code",
            type: "string",
            required: true,
            description:
              "The snippet. Rendered as plain mono; wrap it yourself for highlighting.",
          },
          {
            name: "state",
            type: '"idle" | "running" | "ok" | "error"',
            required: true,
            description:
              "idle hides the output pane entirely; error tints the output red.",
          },
          {
            name: "output",
            type: "string[]",
            required: true,
            description: "Output lines, revealed in sequence.",
          },
          {
            name: "durationMs",
            type: "number",
            description: "How long the run took, printed once it settles.",
          },
          {
            name: "onRun",
            type: "() => void",
            description: "Called when the run control is pressed.",
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
  "document-reference": {
    usage: `import { DocumentReference } from "@/components/elements/document-reference";

<DocumentReference
  title="migration-0.14.pdf"
  pages={14}
  anchors={anchors}
  activePage={4}
  onJump={setPage}
/>`,
    props: [
      {
        component: "DocumentReference",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Document name.",
          },
          {
            name: "pages",
            type: "number",
            required: true,
            description: "Total page count.",
          },
          {
            name: "anchors",
            type: "DocumentAnchor[]",
            required: true,
            description:
              "The passages the answer drew on, each pinned to a page.",
          },
          {
            name: "activePage",
            type: "number",
            required: true,
            description: "Which anchor is highlighted.",
          },
          {
            name: "onJump",
            type: "(page: number) => void",
            description: "Called with the page to open.",
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
  "memory-chips": {
    usage: `import { MemoryChips } from "@/components/elements/memory-chips";

<MemoryChips chips={chips} onForget={forget} />`,
    props: [
      {
        component: "MemoryChips",
        rows: [
          {
            name: "chips",
            type: "MemoryChip[]",
            required: true,
            description:
              "What is remembered. Anything not marked existing is counted as new this turn and tinted.",
          },
          {
            name: "onForget",
            type: "(id: string) => void",
            description:
              "Called to drop a fact. Every chip is removable, including ones it just learned.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "MemoryChip",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, reported back by onForget.",
          },
          {
            name: "text",
            type: "string",
            required: true,
            description: "The remembered fact, in the assistant's words.",
          },
          {
            name: "change",
            type: '"added" | "updated" | "existing"',
            required: true,
            description:
              "existing is neutral; added and updated are tinted and counted in the header.",
          },
        ],
      },
    ],
  },
  "research-report": {
    usage: `import { ResearchReport } from "@/components/elements/research-report";

<ResearchReport title="Draft ownership in 0.14" sections={sections} sourcesRead={12} />`,
    props: [
      {
        component: "ResearchReport",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "What the report is about.",
          },
          {
            name: "sections",
            type: "ReportSection[]",
            required: true,
            description:
              "The outline. It exists from the start and fills in, so the shape is legible before the prose lands.",
          },
          {
            name: "sourcesRead",
            type: "number",
            required: true,
            description: "Running count of sources consumed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ReportSection",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "heading",
            type: "string",
            required: true,
            description: "Section title, shown before any prose exists.",
          },
          {
            name: "state",
            type: '"pending" | "writing" | "done"',
            required: true,
            description:
              "Only one section is usually writing; pending sections stay visible but dim.",
          },
          {
            name: "sources",
            type: "number",
            required: true,
            description: "How many sources back this section. Hidden at zero.",
          },
          {
            name: "preview",
            type: "string",
            description:
              "First lines of the written section, shown once there is something to show.",
          },
        ],
      },
    ],
  },
  "map-answer": {
    usage: `import { MapAnswer } from "@/components/elements/map-answer";

<MapAnswer pins={pins} activeId="b" route onSelect={setActive} />`,
    props: [
      {
        component: "MapAnswer",
        rows: [
          {
            name: "pins",
            type: "MapPin[]",
            required: true,
            description:
              "Places in the answer, positioned as percentages so the element needs no tiles.",
          },
          {
            name: "activeId",
            type: "string",
            required: true,
            description:
              "Which pin is selected, in both the plot and the list.",
          },
          {
            name: "route",
            type: "boolean",
            defaultValue: "false",
            description: "Draws a dashed path through the pins in order.",
          },
          {
            name: "onSelect",
            type: "(id: string) => void",
            description:
              "Called when a pin or its list row is chosen. Both surfaces report the same id.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "MapPin",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity for the list key and for the callbacks that report a selection.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description:
              "Place name, shown on the pin and in the list below it.",
          },
          {
            name: "x",
            type: "number",
            required: true,
            description: "Horizontal position as a percentage.",
          },
          {
            name: "y",
            type: "number",
            required: true,
            description: "Vertical position as a percentage.",
          },
          {
            name: "detail",
            type: "string",
            required: true,
            description: "Secondary fact: a distance, a duration, a rating.",
          },
        ],
      },
    ],
  },
  "math-block": {
    usage: `import { MathBlock, Frac, Sup } from "@/components/elements/math-block";

<MathBlock label="derivation" steps={steps} visibleSteps={2} />`,
    props: [
      {
        component: "MathBlock",
        rows: [
          {
            name: "label",
            type: "string",
            description: "Optional eyebrow above the working.",
          },
          {
            name: "steps",
            type: "MathStep[]",
            required: true,
            description:
              "Each step is a node, so you compose expressions from the exported Frac, Sup, and Sub helpers rather than passing a string to parse.",
          },
          {
            name: "visibleSteps",
            type: "number",
            required: true,
            description: "How much of the derivation has been shown.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "Frac",
        rows: [
          {
            name: "over",
            type: "React.ReactNode",
            required: true,
            description: "Numerator.",
          },
          {
            name: "under",
            type: "React.ReactNode",
            required: true,
            description: "Denominator.",
          },
        ],
      },
    ],
  },
  "spec-sheet": {
    usage: `import { SpecSheet } from "@/components/elements/spec-sheet";

<SpecSheet title="Opus 5" subtitle="claude-opus-5" rows={rows} visibleCount={6} />`,
    props: [
      {
        component: "SpecSheet",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "What the sheet describes.",
          },
          {
            name: "subtitle",
            type: "string",
            description: "Secondary identifier: a model id, a SKU, a version.",
          },
          {
            name: "rows",
            type: "SpecRow[]",
            required: true,
            description:
              "Label and value pairs. Values are pre-formatted and right-aligned on tabular figures.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many rows have landed.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "SpecRow",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description: "Field name, rendered in mono on the left.",
          },
          {
            name: "value",
            type: "string",
            required: true,
            description:
              "Pre-formatted value. The element never formats numbers itself.",
          },
          {
            name: "emphasis",
            type: "boolean",
            defaultValue: "false",
            description:
              "Renders the value in full ink. Use it for the one row that answers the question.",
          },
        ],
      },
    ],
  },
  "comparison-card": {
    usage: `import { ComparisonCard } from "@/components/elements/comparison-card";

<ComparisonCard
  traitLabels={traits}
  options={options}
  recommendedId="local"
  reason="You already hold messages in your own store."
/>`,
    props: [
      {
        component: "ComparisonCard",
        rows: [
          {
            name: "traitLabels",
            type: "string[]",
            required: true,
            description:
              "The dimensions compared, in order. Used as the fallback label when an option lacks a trait.",
          },
          {
            name: "options",
            type: "ComparisonOption[]",
            required: true,
            description:
              "Two or three options. More than that wants a table, not a comparison.",
          },
          {
            name: "recommendedId",
            type: "string",
            required: true,
            description:
              "Which option is the pick. It is tinted and labelled rather than merely ordered first.",
          },
          {
            name: "reason",
            type: "string",
            required: true,
            description:
              "Why that one, in the user's terms. A comparison without a recommendation is an unanswered question.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ComparisonOption",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, compared against recommendedId.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description: "Option name.",
          },
          {
            name: "headline",
            type: "string",
            required: true,
            description: "One-line summary under the name.",
          },
          {
            name: "traits",
            type: "(string | false)[]",
            required: true,
            description:
              "Positional against traitLabels. A string is what the option does; false means it lacks the trait and shows the label struck back.",
          },
        ],
      },
    ],
  },
  timeline: {
    usage: `import { Timeline } from "@/components/elements/timeline";

<Timeline events={events} visibleCount={events.length} />`,
    props: [
      {
        component: "Timeline",
        rows: [
          {
            name: "events",
            type: "TimelineEvent[]",
            required: true,
            description:
              "Events in chronological order, past and scheduled together.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many events have been resolved.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "TimelineEvent",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the row key.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "What happened.",
          },
          {
            name: "when",
            type: '"past" | "now" | "future"',
            required: true,
            description:
              "past is filled, now gets a ring, future is an outline with a lighter rail.",
          },
          {
            name: "time",
            type: "string",
            required: true,
            description: "Pre-formatted timestamp in the left rail.",
          },
          {
            name: "detail",
            type: "string",
            description: "Optional second line under the title.",
          },
        ],
      },
    ],
  },
  "job-progress": {
    usage: `import { JobProgress } from "@/components/elements/job-progress";

<JobProgress
  title="Verify the fix on CI"
  stages={stages}
  stageIndex={1}
  stageProgress={0.6}
  eta="about 3 min"
/>`,
    props: [
      {
        component: "JobProgress",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "What the job is doing.",
          },
          {
            name: "stages",
            type: "JobStage[]",
            required: true,
            description:
              "Stages with relative weights, so a long install does not read the same as a fast clone.",
          },
          {
            name: "stageIndex",
            type: "number",
            required: true,
            description:
              "Which stage is running. Passing stages.length marks the job finished.",
          },
          {
            name: "stageProgress",
            type: "number",
            required: true,
            description: "Progress inside the current stage, 0 to 1.",
          },
          {
            name: "eta",
            type: "string",
            required: true,
            description:
              "Pre-formatted estimate. Replaced by done once finished.",
          },
          {
            name: "onCancel",
            type: "() => void",
            description: "Called to stop the job. Hidden once it finishes.",
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
  "score-breakdown": {
    usage: `import { ScoreBreakdown } from "@/components/elements/score-breakdown";

<ScoreBreakdown
  verdict="approve"
  total={4.2}
  outOf={5}
  criteria={criteria}
  visibleCount={3}
/>`,
    props: [
      {
        component: "ScoreBreakdown",
        rows: [
          {
            name: "verdict",
            type: "string",
            required: true,
            description:
              "The decision in a word. Its tint follows total over outOf.",
          },
          {
            name: "total",
            type: "number",
            required: true,
            description: "The composite score.",
          },
          {
            name: "outOf",
            type: "number",
            required: true,
            description:
              "Maximum possible, for the headline and for every criterion bar.",
          },
          {
            name: "criteria",
            type: "ScoreCriterion[]",
            required: true,
            description:
              "What produced the number, so the verdict can be argued with.",
          },
          {
            name: "visibleCount",
            type: "number",
            required: true,
            description: "How many criteria have been scored.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "ScoreCriterion",
        rows: [
          {
            name: "label",
            type: "string",
            required: true,
            description: "What is being scored. Truncates rather than wraps.",
          },
          {
            name: "score",
            type: "number",
            required: true,
            description:
              "Score for this criterion, on the same scale as outOf. Its bar is drawn against outOf, so the two cannot drift apart.",
          },
          {
            name: "weight",
            type: "number",
            required: true,
            description: "How much it counted toward the total.",
          },
          {
            name: "note",
            type: "string",
            description:
              "Why it scored that way. Worth writing for anything below full marks.",
          },
        ],
      },
    ],
  },
  "cost-meter": {
    usage: `import { CostMeter } from "@/components/elements/cost-meter";

<CostMeter runCost="$2.76" sessionCost="$18.40" lines={lines} />`,
    props: [
      {
        component: "CostMeter",
        rows: [
          {
            name: "runCost",
            type: "string",
            required: true,
            description: "Pre-formatted cost of this run.",
          },
          {
            name: "sessionCost",
            type: "string",
            required: true,
            description: "Pre-formatted cumulative cost.",
          },
          {
            name: "lines",
            type: "CostLine[]",
            required: true,
            description:
              "Per-model breakdown, ordered largest first so the bar reads left to right.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "CostLine",
        rows: [
          {
            name: "model",
            type: "string",
            required: true,
            description: "Model this line accounts for.",
          },
          {
            name: "inputTokens",
            type: "number",
            required: true,
            description:
              "Input tokens consumed. The element divides by 1000 for display.",
          },
          {
            name: "outputTokens",
            type: "number",
            required: true,
            description: "Output tokens produced.",
          },
          {
            name: "share",
            type: "number",
            required: true,
            description:
              "Fraction of the run's cost, 0 to 1. Drives the stacked bar.",
          },
          {
            name: "cost",
            type: "string",
            required: true,
            description: "Pre-formatted. The element never does currency math.",
          },
        ],
      },
    ],
  },
  "quota-banner": {
    usage: `import { QuotaBanner } from "@/components/elements/quota-banner";

<QuotaBanner used={47} limit={50} unit="messages" resetsIn="3h 12m" upgradeLabel="Upgrade" />`,
    props: [
      {
        component: "QuotaBanner",
        rows: [
          {
            name: "used",
            type: "number",
            required: true,
            description: "How much has been consumed.",
          },
          {
            name: "limit",
            type: "number",
            required: true,
            description: "The allowance. The banner turns amber at 90 percent.",
          },
          {
            name: "unit",
            type: "string",
            required: true,
            description: "What is being counted: messages, runs, credits.",
          },
          {
            name: "resetsIn",
            type: "string",
            required: true,
            description: "Pre-formatted time until the window rolls over.",
          },
          {
            name: "upgradeLabel",
            type: "string",
            required: true,
            description: "Label for the way out.",
          },
          {
            name: "onUpgrade",
            type: "() => void",
            description: "Called from the upgrade action.",
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
  "agent-handoff": {
    usage: `import { AgentHandoff } from "@/components/elements/agent-handoff";

<AgentHandoff from="Triage" to="Maintainer" reason={reason} carried={carried} settled />`,
    props: [
      {
        component: "AgentHandoff",
        rows: [
          {
            name: "from",
            type: "string",
            required: true,
            description: "Agent giving up control.",
          },
          {
            name: "to",
            type: "string",
            required: true,
            description: "Agent taking it.",
          },
          {
            name: "reason",
            type: "string",
            required: true,
            description:
              "Why the baton moved. Without it a handoff reads as an unexplained jump.",
          },
          {
            name: "carried",
            type: "string[]",
            required: true,
            description:
              "Context that travelled across. Pass an empty array to hide the section.",
          },
          {
            name: "settled",
            type: "boolean",
            required: true,
            description:
              "Cools the arrow and the receiving badge once the new agent is underway.",
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
  "background-inbox": {
    usage: `import { BackgroundInbox } from "@/components/elements/background-inbox";

<BackgroundInbox runs={runs} onCollect={collect} />`,
    props: [
      {
        component: "BackgroundInbox",
        rows: [
          {
            name: "runs",
            type: "BackgroundRun[]",
            required: true,
            description:
              "Detached runs. The header counts what is ready rather than what is in flight, because ready is the thing that needs you.",
          },
          {
            name: "onCollect",
            type: "(id: string) => void",
            description:
              "Called to pull a finished run back into the thread. Running rows are not clickable.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "BackgroundRun",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, reported back by onCollect.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description: "What the detached run is doing.",
          },
          {
            name: "state",
            type: '"running" | "ready" | "failed"',
            required: true,
            description: "Only ready and failed rows can be collected.",
          },
          {
            name: "elapsed",
            type: "string",
            required: true,
            description: "Pre-formatted run time.",
          },
          {
            name: "summary",
            type: "string",
            description: "One-line result, shown once there is one.",
          },
        ],
      },
    ],
  },
  "checkpoint-history": {
    usage: `import { CheckpointHistory } from "@/components/elements/checkpoint-history";

<CheckpointHistory checkpoints={checkpoints} currentId="3" onRestore={restore} />`,
    props: [
      {
        component: "CheckpointHistory",
        rows: [
          {
            name: "checkpoints",
            type: "Checkpoint[]",
            required: true,
            description:
              "Points in the run you can fall back to, oldest first.",
          },
          {
            name: "currentId",
            type: "string",
            required: true,
            description:
              "Where the run stands. Everything after it dims, since restoring would discard it.",
          },
          {
            name: "onRestore",
            type: "(id: string) => void",
            description: "Called with the checkpoint to return to.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "Checkpoint",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity, compared against currentId and reported by onRestore.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description: "What the checkpoint captured.",
          },
          {
            name: "files",
            type: "number",
            required: true,
            description: "How many files that checkpoint touched.",
          },
          {
            name: "at",
            type: "string",
            required: true,
            description: "Pre-formatted time.",
          },
        ],
      },
    ],
  },
  "schedule-card": {
    usage: `import { ScheduleCard } from "@/components/elements/schedule-card";

<ScheduleCard
  name="Triage the issue queue"
  cadence="every day at 06:00"
  nextRun="Tomorrow, 06:00"
  enabled
  history={history}
  onToggle={toggle}
/>`,
    props: [
      {
        component: "ScheduleCard",
        rows: [
          {
            name: "name",
            type: "string",
            required: true,
            description: "What the scheduled run does.",
          },
          {
            name: "cadence",
            type: "string",
            required: true,
            description: "Human-readable recurrence, not a cron string.",
          },
          {
            name: "nextRun",
            type: "string",
            required: true,
            description:
              "When it fires next. Replaced by paused when disabled.",
          },
          {
            name: "enabled",
            type: "boolean",
            required: true,
            description: "Whether the schedule is live.",
          },
          {
            name: "history",
            type: "ScheduleRun[]",
            required: true,
            description:
              "Recent runs, so a silently failing schedule is visible.",
          },
          {
            name: "onToggle",
            type: "() => void",
            description: "Called when the schedule is paused or resumed.",
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
  "prompt-library": {
    usage: `import { PromptLibrary } from "@/components/elements/prompt-library";

<PromptLibrary
  prompts={prompts}
  query={query}
  selectedId={selectedId}
  onQueryChange={setQuery}
  onSelect={setSelectedId}
  onInsert={insert}
/>`,
    props: [
      {
        component: "PromptLibrary",
        rows: [
          {
            name: "prompts",
            type: "SavedPrompt[]",
            required: true,
            description:
              "Everything saved. Filtering happens inside against the name.",
          },
          {
            name: "query",
            type: "string",
            required: true,
            description: "Current search text.",
          },
          {
            name: "selectedId",
            type: "string",
            required: true,
            description: "Which prompt is previewed below the list.",
          },
          {
            name: "onQueryChange",
            type: "(query: string) => void",
            description: "Called as the search is typed.",
          },
          {
            name: "onSelect",
            type: "(id: string) => void",
            description: "Called when a prompt is highlighted.",
          },
          {
            name: "onInsert",
            type: "(id: string) => void",
            description:
              "Called on double click, to drop the prompt into the composer.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "SavedPrompt",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, compared against selectedId.",
          },
          {
            name: "name",
            type: "string",
            required: true,
            description:
              "Prompt name, and the only field the search filters on.",
          },
          {
            name: "body",
            type: "string",
            required: true,
            description:
              "The prompt text, shown in the preview below the list.",
          },
          {
            name: "variables",
            type: "string[]",
            required: true,
            description:
              "Placeholder names in the body, listed so you know what the prompt will ask for.",
          },
        ],
      },
    ],
  },
  "command-palette": {
    usage: `import { CommandPalette } from "@/components/elements/command-palette";

<CommandPalette
  commands={commands}
  query={query}
  activeId={activeId}
  onQueryChange={setQuery}
  onRun={run}
/>`,
    props: [
      {
        component: "CommandPalette",
        rows: [
          {
            name: "commands",
            type: "PaletteCommand[]",
            required: true,
            description:
              "Everything runnable. Groups are derived from the entries and keep first-seen order.",
          },
          {
            name: "query",
            type: "string",
            required: true,
            description: "Current filter text.",
          },
          {
            name: "activeId",
            type: "string",
            required: true,
            description:
              "Which row is highlighted. The element only styles it; wire your own arrow-key and Enter handling and drive this prop from it.",
          },
          {
            name: "onQueryChange",
            type: "(query: string) => void",
            description: "Called as the filter is typed.",
          },
          {
            name: "onRun",
            type: "(id: string) => void",
            description: "Called when a command is chosen.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "PaletteCommand",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description:
              "Stable identity, compared against activeId and reported by onRun.",
          },
          {
            name: "label",
            type: "string",
            required: true,
            description: "Command text, and the field the query filters on.",
          },
          {
            name: "group",
            type: "string",
            required: true,
            description: "Heading the command sits under.",
          },
          {
            name: "keys",
            type: "string[]",
            required: true,
            description: "Shortcut, one chip per key.",
          },
        ],
      },
    ],
  },
  "shared-conversation": {
    usage: `import { SharedConversation } from "@/components/elements/shared-conversation";

<SharedConversation
  title="Draft restore across threads"
  sharedBy="harry"
  sharedAt="2 days ago"
  turns={turns}
  onContinue={fork}
/>`,
    props: [
      {
        component: "SharedConversation",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Name of the shared thread.",
          },
          {
            name: "sharedBy",
            type: "string",
            required: true,
            description: "Who shared it.",
          },
          {
            name: "sharedAt",
            type: "string",
            required: true,
            description: "Pre-formatted share time.",
          },
          {
            name: "turns",
            type: "SharedTurn[]",
            required: true,
            description: "The transcript, read only.",
          },
          {
            name: "onContinue",
            type: "() => void",
            description:
              "Called to fork the transcript into the reader's own thread.",
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
  "conversation-search": {
    usage: `import { ConversationSearch } from "@/components/elements/conversation-search";

<ConversationSearch
  query={query}
  hits={hits}
  activeIndex={0}
  onQueryChange={setQuery}
  onStep={step}
/>`,
    props: [
      {
        component: "ConversationSearch",
        rows: [
          {
            name: "query",
            type: "string",
            required: true,
            description: "Current search text.",
          },
          {
            name: "hits",
            type: "SearchHit[]",
            required: true,
            description:
              "Matches in document order. Each carries its own surrounding text so no lookup is needed to render the preview.",
          },
          {
            name: "activeIndex",
            type: "number",
            required: true,
            description:
              "Which hit is current, in both the counter and the rail. Clamped to the current hit set, so narrowing the results cannot strand it out of range.",
          },
          {
            name: "onQueryChange",
            type: "(query: string) => void",
            description: "Called as the search is typed.",
          },
          {
            name: "onStep",
            type: "(delta: number) => void",
            description:
              "Called with -1 or 1 to walk the matches. Wrap the index yourself.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "SearchHit",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity for the rail mark.",
          },
          {
            name: "before",
            type: "string",
            required: true,
            description: "Text preceding the match, for the preview.",
          },
          {
            name: "after",
            type: "string",
            required: true,
            description: "Text following the match.",
          },
          {
            name: "position",
            type: "number",
            required: true,
            description:
              "Where the hit sits in the thread, as a percentage. Drives the scrollbar marks.",
          },
          {
            name: "match",
            type: "string",
            required: true,
            description:
              "The matched run, highlighted between before and after.",
          },
        ],
      },
    ],
  },
  "thread-search": {
    usage: `import { ThreadSearch } from "@/components/elements/thread-search";

<ThreadSearch
  threads={threads}
  query={query}
  activeId={activeId}
  onQueryChange={setQuery}
  onSelect={setActiveId}
/>`,
    props: [
      {
        component: "ThreadSearch",
        rows: [
          {
            name: "threads",
            type: "SearchableThread[]",
            required: true,
            description:
              "All threads. Filtering matches title and preview together.",
          },
          {
            name: "query",
            type: "string",
            required: true,
            description: "Current search text.",
          },
          {
            name: "activeId",
            type: "string",
            required: true,
            description: "Which thread is open.",
          },
          {
            name: "onQueryChange",
            type: "(query: string) => void",
            description: "Called as the search is typed.",
          },
          {
            name: "onSelect",
            type: "(id: string) => void",
            description: "Called when a thread is opened.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "SearchableThread",
        rows: [
          {
            name: "id",
            type: "string",
            required: true,
            description: "Stable identity, compared against activeId.",
          },
          {
            name: "title",
            type: "string",
            required: true,
            description:
              "Thread title. Filtering matches this and preview together.",
          },
          {
            name: "preview",
            type: "string",
            required: true,
            description: "Second line under the title.",
          },
          {
            name: "group",
            type: "string",
            required: true,
            description:
              "Date bucket the thread falls into: Today, Yesterday, Earlier.",
          },
          {
            name: "pinned",
            type: "boolean",
            defaultValue: "false",
            description:
              "Lifts the thread out of its date group into its own pinned section.",
          },
        ],
      },
    ],
  },
  "launcher-bubble": {
    usage: `import { LauncherBubble } from "@/components/elements/launcher-bubble";

<LauncherBubble
  open={open}
  unread={2}
  greeting="Need a hand?"
  prompts={prompts}
  onToggle={toggle}
/>`,
    props: [
      {
        component: "LauncherBubble",
        rows: [
          {
            name: "open",
            type: "boolean",
            required: true,
            description:
              "Whether the panel is showing. The trigger icon crossfades either way.",
          },
          {
            name: "unread",
            type: "number",
            required: true,
            description:
              "Badge count on the closed bubble. Hidden at zero and while open.",
          },
          {
            name: "greeting",
            type: "string",
            required: true,
            description: "Opening line in the panel.",
          },
          {
            name: "prompts",
            type: "string[]",
            required: true,
            description:
              "Ways in, so the first message does not have to be invented.",
          },
          {
            name: "onToggle",
            type: "() => void",
            description: "Called when the bubble is pressed.",
          },
          {
            name: "onPick",
            type: "(prompt: string) => void",
            description: "Called when a starter prompt is chosen.",
          },
          {
            name: "onStart",
            type: "() => void",
            description:
              "Called from the Start a conversation action, for opening an empty thread.",
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
  "settings-panel": {
    usage: `import { SettingsPanel } from "@/components/elements/settings-panel";

<SettingsPanel
  model={model}
  models={models}
  systemPrompt={prompt}
  temperature={0.7}
  toggles={toggles}
  onModelChange={setModel}
/>`,
    props: [
      {
        component: "SettingsPanel",
        rows: [
          {
            name: "model",
            type: "string",
            required: true,
            description: "Selected model.",
          },
          {
            name: "models",
            type: "string[]",
            required: true,
            description:
              "Models offered in the segmented control. Keep it to a few; more wants the model picker.",
          },
          {
            name: "systemPrompt",
            type: "string",
            required: true,
            description: "Current system prompt.",
          },
          {
            name: "temperature",
            type: "number",
            required: true,
            description: "Current temperature, 0 to 2.",
          },
          {
            name: "toggles",
            type: "SettingToggle[]",
            required: true,
            description:
              "Capability switches with a line each explaining what they turn on.",
          },
          {
            name: "onModelChange",
            type: "(model: string) => void",
            description: "Called when the model changes.",
          },
          {
            name: "onSystemPromptChange",
            type: "(prompt: string) => void",
            description: "Called as the prompt is edited.",
          },
          {
            name: "onTemperatureChange",
            type: "(temperature: number) => void",
            description: "Called as the slider moves.",
          },
          {
            name: "onToggle",
            type: "(key: string) => void",
            description: "Called with the switched capability's key.",
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
  onboarding: {
    usage: `import { Onboarding } from "@/components/elements/onboarding";

<Onboarding steps={steps} index={index} onNext={next} onSkip={skip} />`,
    props: [
      {
        component: "Onboarding",
        rows: [
          {
            name: "steps",
            type: "OnboardingStep[]",
            required: true,
            description:
              "What to teach, in order. Three is usually the limit before it is skipped.",
          },
          {
            name: "index",
            type: "number",
            required: true,
            description:
              "Which step is showing. The final step's action reads Start instead of Next.",
          },
          {
            name: "onNext",
            type: "() => void",
            description: "Called to advance.",
          },
          {
            name: "onSkip",
            type: "() => void",
            description: "Called to dismiss. Always offer it.",
          },
          {
            name: "className",
            type: "string",
            description: "Extra classes merged onto the root.",
          },
        ],
      },
      {
        component: "OnboardingStep",
        rows: [
          {
            name: "title",
            type: "string",
            required: true,
            description: "Step heading.",
          },
          {
            name: "body",
            type: "string",
            required: true,
            description: "What this step teaches, in a sentence or two.",
          },
          {
            name: "example",
            type: "string",
            required: true,
            description:
              "A prompt the user could actually send. Showing beats describing.",
          },
        ],
      },
    ],
  },
  "mobile-composer": {
    usage: `import { MobileComposer } from "@/components/elements/mobile-composer";

<MobileComposer
  value={value}
  keyboardOpen={keyboardOpen}
  running={false}
  actions={actions}
  onValueChange={setValue}
  onSend={send}
/>`,
    props: [
      {
        component: "MobileComposer",
        rows: [
          {
            name: "value",
            type: "string",
            required: true,
            description:
              "Current input. The field is 16px so iOS does not zoom on focus.",
          },
          {
            name: "keyboardOpen",
            type: "boolean",
            required: true,
            description:
              "Collapses the quick actions and the home indicator inset when the keyboard is up.",
          },
          {
            name: "running",
            type: "boolean",
            required: true,
            description:
              "Swaps send for stop, and suppresses Return-to-send while a run is in flight.",
          },
          {
            name: "actions",
            type: "string[]",
            required: true,
            description:
              "Quick actions above the field, scrolled horizontally.",
          },
          {
            name: "onAttach",
            type: "() => void",
            description:
              "Called from the attachment control. Omit it and the control renders disabled.",
          },
          {
            name: "onAction",
            type: "(action: string) => void",
            description:
              "Called when a quick action is tapped. Omit it and the chips render disabled, since actions is required and the row would otherwise be inert.",
          },
          {
            name: "onValueChange",
            type: "(value: string) => void",
            description: "Called as the message is typed.",
          },
          {
            name: "onSend",
            type: "() => void",
            description: "Called to send.",
          },
          {
            name: "onStop",
            type: "() => void",
            description: "Called to stop a run in flight.",
          },
          {
            name: "onFocus",
            type: "() => void",
            description:
              "Called when the field takes focus; drive keyboardOpen from it.",
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
