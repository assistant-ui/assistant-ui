# Trace Model (v1)

This document defines the v1 trace data model used by `ChainOfThought.Trace`.
The goal is quick-scan observability with an opinionated, nested timeline UI.

## Goals
- Fast visual scan of what the agent is doing.
- Support nested subagent traces with a concise summary row.
- Keep adapters flexible for different SDKs.

## Data Types
```ts
type TraceStatus = "running" | "complete" | "incomplete" | "error";

type TraceStep = {
  kind: "step";
  id: string;
  label?: ReactNode;
  type?: "tool" | "search" | "image" | "text" | "default";
  status?: TraceStatus;
  toolName?: string;
  detail?: ReactNode;
  meta?: Record<string, unknown>;
};

type TraceGroup = {
  kind: "group";
  id: string;        // agentId (stable)
  label: string;     // agent name (display)
  status?: TraceStatus;
  summary?: {
    latestLabel?: ReactNode;
    latestType?: TraceStep["type"];
    toolName?: string;
  };
  children: TraceNode[];
  variant?: "subagent" | "default";
  meta?: Record<string, unknown>;
};

type TraceNode = TraceStep | TraceGroup;
```

## Summary Behavior
- Group summaries default to the most recent child step (depth-first, last leaf).
- If `summary.latestLabel` is provided, it overrides the computed label.
- Tool calls are surfaced whenever a `toolName` is present.
- V1 shows the most recent step in the summary row; expand to see all steps.

## Nesting
- Nested timelines are supported by rendering `TraceGroup` children as another
  `ChainOfThoughtTimeline`.
- `maxDepth` defaults to 2. Deeper nesting can be enabled per use-case.

## Styling + Custom UI
- Use `variant` (e.g. `"subagent"`) to differentiate top-level vs. subagent
  styling. `ChainOfThought.Trace` sets `data-variant` on trace groups.
- For custom summaries, pass `nodeComponents.GroupSummary`.
- For richer step layouts, pass `nodeComponents.StepBody`.
- Store adapter-specific IDs in `meta` (e.g. `agentId`, `runId`, `toolCallId`).

## Adapters
- `ChainOfThought.Trace` accepts explicit `TraceNode[]` for v1.
- Legacy message-part grouping is still supported through `groupingFunction`
  and `inferStep`.
- `traceFromThreadMessage(message)` converts a `ThreadMessage` into trace nodes.

### AI SDK (example)
If you use `@assistant-ui/react-ai-sdk`, convert `UIMessage` → `ThreadMessage`
with `AISDKMessageConverter.toThreadMessages`, then call
`traceFromThreadMessage` on the resulting assistant message.
