import type { AgentPhase } from "@/components/pages/shop/agent-status";
import type { CheckoutSession } from "@/lib/checkout/session-store";
import { finishProposed, type Checkout } from "@/lib/checkout/protocol";

/**
 * welcome, connect, plan and install are pages the user can step back to;
 * the rest exist only while they are the live page.
 */
export type WizardPage =
  | { id: "welcome" }
  | { id: "connect" }
  | { id: "question"; input: Checkout.Input; total: number }
  | { id: "plan" }
  | { id: "working" }
  | { id: "install" }
  | { id: "finish" }
  | { id: "closed" };

export type WizardPageId = WizardPage["id"];

/** The pages that stay readable after the setup moves past them. */
export type TrailPageId = "welcome" | "connect" | "plan" | "install";

/** The page the setup is on right now, decided by what the agent needs from the user next. */
export function livePage({
  state,
  session,
  phase,
  openInputs,
  planPending,
}: {
  state: Checkout.State | undefined;
  session: CheckoutSession;
  phase: AgentPhase;
  openInputs: Checkout.Input[];
  planPending: boolean;
}): WizardPage {
  if (phase === "finished" || phase === "stopped") return { id: "closed" };
  if (phase === "unconnected" && !session.introSeen) return { id: "welcome" };
  if (
    phase === "unconnected" ||
    phase === "waiting" ||
    state === undefined ||
    state.status === "waiting"
  )
    return { id: "connect" };
  if (finishProposed(state)) return { id: "finish" };
  const input = openInputs[0];
  if (input) return { id: "question", input, total: openInputs.length };
  if (planPending) return { id: "plan" };
  if (state.status === "installing") return { id: "install" };
  return { id: "working" };
}

/** The pages the user can step back through, in order, ending with the live page. */
export function pageTrail(
  state: Checkout.State | undefined,
  live: WizardPage,
): WizardPageId[] {
  const trail: WizardPageId[] = ["welcome", "connect"];
  if (state !== undefined && state.plans.length > 0) trail.push("plan");
  if (
    state !== undefined &&
    (state.status === "installing" || state.steps.length > 0)
  )
    trail.push("install");
  const index = trail.indexOf(live.id);
  if (index !== -1) return trail.slice(0, index + 1);
  return [...trail, live.id];
}
