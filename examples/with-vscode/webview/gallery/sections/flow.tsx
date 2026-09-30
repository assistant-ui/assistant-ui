import { Flow } from "@assistant-ui/ui/components/assistant-ui/elements/flow.tsx";
import { FlowExpand } from "@assistant-ui/ui/components/assistant-ui/elements/flow-expand.tsx";
import {
  FlowGraph,
  type FlowEdge,
  type FlowNode,
} from "@assistant-ui/ui/components/assistant-ui/elements/flow-graph.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

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

export default defineSections([
  {
    id: "flow",
    title: "Flow diagram",
    category: "agents",
    notes:
      "Flow.Root with a column of toned nodes, labelled arrows, a decision node and a dashed group. The expand button opens a pan and zoom dialog.",
    render: () => (
      <Flow.Root>
        <Flow.Column>
          <Flow.Node tone="pink">Webview</Flow.Node>
          <Flow.Arrow direction="down" length={36} label="vscodeFetch" />
          <Flow.Node tone="blue">Extension host</Flow.Node>
          <Flow.Arrow direction="down" length={36} />
          <Flow.Node variant="decision">backend?</Flow.Node>
          <Flow.Arrow direction="down" length={36} />
          <Flow.Group>
            <Flow.GroupLabel>Routes</Flow.GroupLabel>
            <Flow.Row>
              <Flow.Node tone="green">/api/chat</Flow.Node>
              <Flow.Arrow length={48} label="stream" reverseLabel="abort" />
              <Flow.Node tone="red">Anthropic</Flow.Node>
            </Flow.Row>
          </Flow.Group>
        </Flow.Column>
      </Flow.Root>
    ),
  },
  {
    id: "flow-canvas",
    title: "Flow canvas",
    category: "agents",
    notes:
      "Flow.Canvas draws measured edges between nodes by flowId: two fanned down edges, a labelled edge and a loop back to the runtime.",
    render: () => (
      <Flow.Root>
        <Flow.Canvas
          edges={[
            { from: "runtime", to: "backend", route: "down", fromOffset: -20 },
            { from: "runtime", to: "cloud", route: "down", fromOffset: 20 },
            { from: "cloud", to: "providers", route: "down", label: "proxy" },
            {
              from: "providers",
              to: "runtime",
              route: "loop-right",
            },
          ]}
        >
          <Flow.Column>
            <Flow.Node tone="pink">Frontend components</Flow.Node>
            <Flow.Arrow direction="down" length={36} />
            <Flow.Node flowId="runtime" tone="blue">
              Runtime
            </Flow.Node>
            <div className="h-10" aria-hidden />
            <Flow.Row>
              <Flow.Node flowId="backend" tone="red">
                Your API backend
              </Flow.Node>
              <Flow.Arrow length={48} />
              <Flow.Node flowId="cloud" tone="green">
                Cloud
              </Flow.Node>
            </Flow.Row>
            <div className="h-10" aria-hidden />
            <Flow.Node flowId="providers" tone="red">
              External providers or LLM APIs
            </Flow.Node>
          </Flow.Column>
        </Flow.Canvas>
      </Flow.Root>
    ),
  },
  {
    id: "flow-graph",
    title: "Flow graph",
    category: "agents",
    notes:
      "Done, active and pending nodes; the first shows three of five nodes revealed, the second all of them.",
    render: () => (
      <States>
        <State label="3 of 5 visible">
          <FlowGraph nodes={NODES} edges={EDGES} visibleCount={3} />
        </State>
        <State label="all visible">
          <FlowGraph nodes={NODES} edges={EDGES} visibleCount={NODES.length} />
        </State>
      </States>
    ),
  },
  {
    id: "flow-expand",
    title: "Flow expand",
    category: "agents",
    notes: "FlowExpand wraps any content with the expand-to-dialog control.",
    render: () => (
      <FlowExpand>
        <FlowGraph nodes={NODES} edges={EDGES} visibleCount={NODES.length} />
      </FlowExpand>
    ),
  },
]);
