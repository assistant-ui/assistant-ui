"use client";

import {
  FlowGraph,
  type FlowEdge,
  type FlowNode,
} from "@/components/elements/flow-graph";
import { useStoryPhases } from "@/components/demo/use-demo";

const NODES: readonly FlowNode[] = [
  { id: "intake", label: "intake", column: 0, row: 1, state: "done" },
  { id: "plan", label: "plan", column: 1, row: 1, state: "done" },
  { id: "search", label: "search", column: 2, row: 0, state: "done" },
  { id: "patch", label: "patch", column: 2, row: 2, state: "active" },
  { id: "verify", label: "verify", column: 3, row: 1, state: "pending" },
];

const EDGES: readonly FlowEdge[] = [
  { from: "intake", to: "plan" },
  { from: "plan", to: "search" },
  { from: "plan", to: "patch" },
  { from: "search", to: "verify" },
  { from: "patch", to: "verify" },
];

const PHASES = [520, 520, 520, 520, 0] as const;

export function FlowGraphDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <FlowGraph
      nodes={NODES}
      edges={EDGES}
      visibleCount={Math.min(phase + 1, NODES.length)}
    />
  );
}
