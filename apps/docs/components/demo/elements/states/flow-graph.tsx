"use client";

import {
  FlowGraph,
  type FlowEdge,
  type FlowNode,
  type FlowNodeState,
} from "@/components/assistant-ui/elements/flow-graph";
import { defineStates } from "./types";

const LAYOUT = [
  { id: "intake", label: "intake", column: 0, row: 1 },
  { id: "plan", label: "plan", column: 1, row: 1 },
  { id: "search", label: "search", column: 2, row: 0 },
  { id: "patch", label: "patch", column: 2, row: 2 },
  { id: "verify", label: "verify", column: 3, row: 1 },
] as const;

const EDGES: readonly FlowEdge[] = [
  { from: "intake", to: "plan" },
  { from: "plan", to: "search" },
  { from: "plan", to: "patch" },
  { from: "search", to: "verify" },
  { from: "patch", to: "verify" },
];

const withStates = (states: readonly FlowNodeState[]): readonly FlowNode[] =>
  LAYOUT.map((node, i) => ({ ...node, state: states[i] ?? "pending" }));

const RUNNING = withStates(["done", "done", "done", "active", "pending"]);

const WIDE_NODES: readonly FlowNode[] = [
  { id: "fetch", label: "fetch", column: 0, row: 1, state: "done" },
  { id: "parse", label: "parse", column: 1, row: 1, state: "done" },
  { id: "lint", label: "lint", column: 2, row: 0, state: "done" },
  { id: "types", label: "typecheck", column: 2, row: 1, state: "done" },
  { id: "unit", label: "unit tests", column: 2, row: 2, state: "done" },
  { id: "build", label: "build", column: 3, row: 1, state: "done" },
  { id: "e2e", label: "e2e", column: 4, row: 0, state: "active" },
  { id: "bundle", label: "bundle size", column: 4, row: 2, state: "active" },
  { id: "preview", label: "preview", column: 5, row: 1, state: "pending" },
  { id: "release", label: "release", column: 6, row: 1, state: "pending" },
];

const WIDE_EDGES: readonly FlowEdge[] = [
  { from: "fetch", to: "parse" },
  { from: "parse", to: "lint" },
  { from: "parse", to: "types" },
  { from: "parse", to: "unit" },
  { from: "lint", to: "build" },
  { from: "types", to: "build" },
  { from: "unit", to: "build" },
  { from: "build", to: "e2e" },
  { from: "build", to: "bundle" },
  { from: "e2e", to: "preview" },
  { from: "bundle", to: "preview" },
  { from: "preview", to: "release" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "Only the first two nodes have arrived, and the other edges stay faint.",
    Component: () => (
      <FlowGraph nodes={RUNNING} edges={EDGES} visibleCount={2} />
    ),
  },
  {
    key: "pending",
    label: "Not started",
    note: "Every node is laid out but none has run yet.",
    Component: () => (
      <FlowGraph
        nodes={withStates([
          "pending",
          "pending",
          "pending",
          "pending",
          "pending",
        ])}
        edges={EDGES}
        visibleCount={LAYOUT.length}
      />
    ),
  },
  {
    key: "running",
    label: "Running",
    note: "Both branches are in flight at once before they rejoin.",
    Component: () => (
      <FlowGraph
        nodes={withStates(["done", "done", "active", "active", "pending"])}
        edges={EDGES}
        visibleCount={LAYOUT.length}
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "Every node has finished.",
    Component: () => (
      <FlowGraph
        nodes={withStates(["done", "done", "done", "done", "done"])}
        edges={EDGES}
        visibleCount={LAYOUT.length}
      />
    ),
  },
  {
    key: "long-content",
    label: "Wide graph",
    note: "A graph wider than the card scrolls sideways.",
    Component: () => (
      <FlowGraph
        nodes={WIDE_NODES}
        edges={WIDE_EDGES}
        visibleCount={WIDE_NODES.length}
      />
    ),
  },
]);
