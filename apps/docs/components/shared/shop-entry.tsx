"use client";

import { Suspense, lazy, type ComponentProps } from "react";
import { checkoutEnabled, shopEnabled } from "@/lib/checkout/config";

const LazyCartButton = lazy(() =>
  import("@/components/shared/cart-button").then((module) => ({
    default: module.CartButton,
  })),
);

const LazyAgentSetup = lazy(() =>
  import("@/components/shared/agent-setup").then((module) => ({
    default: module.AgentSetup,
  })),
);

/** The shop's entry points load the catalog only on a build that has a shop, and only where one renders. */
export function CartButton(props: ComponentProps<typeof LazyCartButton>) {
  if (!shopEnabled) return null;
  return (
    <Suspense fallback={null}>
      <LazyCartButton {...props} />
    </Suspense>
  );
}

export function AgentSetup(props: ComponentProps<typeof LazyAgentSetup>) {
  if (!checkoutEnabled) return null;
  return (
    <Suspense fallback={null}>
      <LazyAgentSetup {...props} />
    </Suspense>
  );
}
