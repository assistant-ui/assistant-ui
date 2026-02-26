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

export { ChainOfThoughtTrace };
export { ChainOfThoughtTraceDisclosure };
export { ChainOfThoughtTraceNodes };
export { ChainOfThoughtTraceParts };
export { useElapsedSeconds } from "./trace-time";
export {
  traceFromMessageParts,
  traceFromThreadMessage,
  type ChainOfThoughtTraceDisclosureProps,
  type ChainOfThoughtTraceGroupSummaryProps,
  type ChainOfThoughtTraceNodeComponents,
  type ChainOfThoughtTraceProps,
  type ChainOfThoughtTraceStepMeta,
  type TraceFromMessagePartsOptions,
  type TraceFromThreadMessageOptions,
} from "./trace-shared";
