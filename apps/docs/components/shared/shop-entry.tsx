"use client";

import { Suspense, lazy, type ComponentProps } from "react";

const LazyAgentSetup = lazy(() =>
  import("@/components/shared/agent-setup").then((module) => ({
    default: module.AgentSetup,
  })),
);

/** The setup banner loads the catalog only where one renders. */
export function AgentSetup(props: ComponentProps<typeof LazyAgentSetup>) {
  return (
    <Suspense fallback={null}>
      <LazyAgentSetup {...props} />
    </Suspense>
  );
}
