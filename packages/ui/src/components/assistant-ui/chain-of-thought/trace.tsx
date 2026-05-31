"use client";

import { ChainOfThoughtTraceNodes } from "./trace-nodes";
import { ChainOfThoughtTraceParts } from "./trace-parts";
import { ChainOfThoughtTraceDisclosure } from "./trace-disclosure";
import type { ChainOfThoughtTraceProps } from "./trace-shared";

function ChainOfThoughtTrace(props: ChainOfThoughtTraceProps) {
  if ("trace" in props && props.trace !== undefined) {
    const { trace, nodeComponents, maxDepth, ...timelineProps } = props;
    return (
      <ChainOfThoughtTraceNodes
        trace={trace}
        {...(nodeComponents != null ? { nodeComponents } : {})}
        maxDepth={maxDepth ?? 2}
        {...timelineProps}
      />
    );
  }

  return <ChainOfThoughtTraceParts {...props} />;
}

export { ChainOfThoughtTrace, ChainOfThoughtTraceDisclosure };
export type {
  ChainOfThoughtTraceDisclosureProps,
  ChainOfThoughtTraceProps,
} from "./trace-shared";
