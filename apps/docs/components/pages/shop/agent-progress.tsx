"use client";

import { agentPhase } from "@/components/pages/shop/agent-status";
import { useSyntheticProgress } from "@/components/pages/shop/use-synthetic-progress";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { finishProposed } from "@/lib/checkout/protocol";
import { cn } from "@/lib/utils";

const agentWorking = (checkout: CheckoutContextValue) =>
  agentPhase(checkout) === "connected" &&
  checkout.state !== undefined &&
  checkout.state.status !== "waiting" &&
  checkout.openInputs.length === 0 &&
  !checkout.planPending &&
  !finishProposed(checkout.state);

export function AgentProgress({
  checkout,
  pageKey,
}: {
  checkout: CheckoutContextValue;
  pageKey: string;
}) {
  const active = agentWorking(checkout);
  const { value, complete } = useSyntheticProgress({
    active,
    stepKey: `${pageKey}:${checkout.progress.done}`,
  });
  if (agentPhase(checkout) !== "connected") return null;
  const frozen = !active && !complete;
  return (
    <div
      role="progressbar"
      aria-label="Agent progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={frozen ? "Waiting for your input" : undefined}
      data-frozen={frozen || undefined}
      className="bg-foreground/10 relative h-0.5 w-full shrink-0 overflow-hidden"
    >
      <div
        className={cn(
          "bg-foreground absolute inset-y-0 left-0 transition-[width] duration-300 ease-out motion-reduce:transition-none",
          value === 0 && "transition-none",
        )}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}
