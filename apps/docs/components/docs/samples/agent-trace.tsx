"use client";

import {
  AgentTrace,
  AgentTraceDisclosure,
  type AgentTraceNode,
} from "@/components/assistant-ui/agent-trace";

const TRACE: AgentTraceNode[] = [
  {
    kind: "step",
    id: "plan",
    label: "Planned lookup",
    type: "text",
    status: "complete",
    output: "Identified the docs and examples to inspect.",
  },
  {
    kind: "group",
    id: "research",
    label: "Research",
    status: "complete",
    summary: {
      latestLabel: "Compared component APIs",
      toolName: "search_docs",
    },
    children: [
      {
        kind: "step",
        id: "search",
        label: "Searched docs",
        type: "search",
        toolName: "search_docs",
        status: "complete",
        output: "Found the grouped message-part guidance.",
      },
      {
        kind: "step",
        id: "read",
        label: "Read source",
        type: "tool",
        toolName: "read_file",
        status: "complete",
        output: "Checked the exported component surface.",
      },
    ],
  },
  {
    kind: "step",
    id: "answer",
    label: "Drafted response",
    type: "complete",
    status: "complete",
  },
];

export function AgentTraceSample() {
  return (
    <div className="bg-background w-full rounded-lg border p-4">
      <AgentTraceDisclosure trace={TRACE} />
    </div>
  );
}

export function AgentTraceInlineSample() {
  return (
    <div className="bg-background w-full rounded-lg border p-4">
      <AgentTrace trace={TRACE} />
    </div>
  );
}
