import type { AgentPhase } from "@/components/pages/shop/agent-status";
import type { CheckoutSession } from "@/lib/checkout/session-store";
import {
  finishProposed,
  followedUpSinceProposal,
  type Checkout,
} from "@/lib/checkout/protocol";

/**
 * welcome, connect, plan, install and every answer the user gave are pages
 * the user can step back to; the rest exist only while they are the live page.
 */
export type WizardPage =
  | { id: "welcome" }
  | { id: "connect" }
  | { id: "question"; input: Checkout.Input; total: number }
  | { id: "answer"; input: Checkout.Input }
  | { id: "plan" }
  | { id: "working" }
  | { id: "install" }
  | { id: "finish" }
  | { id: "closed" };

export type WizardPageId = WizardPage["id"];

/** Tells one page from another, including two questions or answers apart. */
export const pageKey = (page: WizardPage) =>
  page.id === "question" || page.id === "answer"
    ? `${page.id}:${page.input.id}`
    : page.id;

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
  if ((phase === "unconnected" || phase === "waiting") && !session.introSeen)
    return { id: "welcome" };
  if (
    phase === "unconnected" ||
    phase === "waiting" ||
    state === undefined ||
    state.status === "waiting"
  )
    return { id: "connect" };
  const input = openInputs[0];
  if (input) return { id: "question", input, total: openInputs.length };
  if (planPending) return { id: "plan" };
  if (finishProposed(state) && !followedUpSinceProposal(state))
    return { id: "finish" };
  if (state.status === "installing") return { id: "install" };
  return { id: "working" };
}

const answersIn = (
  state: Checkout.State,
  phase: Checkout.Status,
): WizardPage[] =>
  state.inputs
    .filter((input) => input.phase === phase && input.status !== "open")
    .sort(
      (a, b) =>
        (a.answeredAt ?? a.createdAt) - (b.answeredAt ?? b.createdAt) ||
        a.createdAt - b.createdAt,
    )
    .map((input) => ({ id: "answer", input }));

/**
 * The pages the user can step back through, in order, ending with the live
 * page: the answers given while planning sit before the plan, those given
 * while installing before the installation overview.
 */
export function pageTrail(
  state: Checkout.State | undefined,
  live: WizardPage,
): WizardPage[] {
  const trail: WizardPage[] = [{ id: "welcome" }, { id: "connect" }];
  if (state !== undefined) {
    trail.push(...answersIn(state, "planning"));
    if (state.plans.length > 0) trail.push({ id: "plan" });
    trail.push(...answersIn(state, "installing"));
    if (state.status === "installing" || state.steps.length > 0)
      trail.push({ id: "install" });
  }
  const index = trail.findIndex((page) => page.id === live.id);
  if (index !== -1) return trail.slice(0, index + 1);
  return [...trail, live];
}
