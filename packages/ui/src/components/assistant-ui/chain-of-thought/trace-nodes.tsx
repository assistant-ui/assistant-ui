"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ChainOfThoughtTimeline } from "./layout";
import type { TraceNode } from "./model";
import { ChainOfThoughtTraceGroupNode } from "./trace-group-node";
import { ChainOfThoughtTraceStepNode } from "./trace-step-node";
import {
  isTraceGroup,
  type ChainOfThoughtTraceNodesProps,
} from "./trace-shared";

export function ChainOfThoughtTraceNodes({
  className,
  trace,
  maxDepth = 2,
  nodeComponents,
  constrainHeight = true,
  allowGroupExpand = true,
  ...timelineProps
}: ChainOfThoughtTraceNodesProps) {
  const renderNode = (
    node: TraceNode,
    stepIndex: number,
    depth: number,
  ): ReactNode => {
    const style = { "--step-index": stepIndex } as CSSProperties;
    if (isTraceGroup(node)) {
      return (
        <ChainOfThoughtTraceGroupNode
          key={node.id}
          group={node}
          depth={depth}
          maxDepth={maxDepth}
          nodeComponents={nodeComponents}
          allowGroupExpand={allowGroupExpand}
          renderNode={renderNode}
          style={style}
        />
      );
    }
    return (
      <ChainOfThoughtTraceStepNode
        key={node.id}
        step={node}
        nodeComponents={nodeComponents}
        style={style}
      />
    );
  };

  return (
    <ChainOfThoughtTimeline
      className={className}
      constrainHeight={constrainHeight}
      {...timelineProps}
    >
      {trace.map((node, i) => renderNode(node, i, 0))}
    </ChainOfThoughtTimeline>
  );
}
