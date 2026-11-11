"use client";

import { Suspense, lazy, type ComponentProps } from "react";
import { checkoutEnabled } from "@/lib/checkout/config";

const LazyAgentSetup = lazy(() =>
  import("@/components/shared/agent-setup").then((module) => ({
    default: module.AgentSetup,
  })),
);

/** The setup banner loads the catalog only on a build with the agent setup, and only where one renders. */
export function AgentSetup(props: ComponentProps<typeof LazyAgentSetup>) {
  if (!checkoutEnabled) return null;
  return (
    <Suspense fallback={null}>
      <LazyAgentSetup {...props} />
    </Suspense>
  );
}
