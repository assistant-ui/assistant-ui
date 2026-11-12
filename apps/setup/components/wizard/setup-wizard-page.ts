import type { AgentPhase } from "@/components/wizard/agent-status";
import { finishProposed, type Checkout } from "@/lib/checkout/protocol";

/**
 * plan, install and every answer the user gave are pages the user can step
 * back to; the rest exist only while they are the live page. A product the
 * agent proposed is added without a page, so it leaves no answer.
 */
export type WizardPage =
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
  phase,
  openInputs,
  planPending,
}: {
  state: Checkout.State | undefined;
  phase: AgentPhase;
  openInputs: Checkout.Input[];
  planPending: boolean;
}): WizardPage {
  if (phase === "finished" || phase === "stopped") return { id: "closed" };
  // The agent ran `assistant-ui setup`, which started the setup and its plan, so its first question can arrive before it says hello.
  const unconnected = phase === "unconnected" || phase === "waiting";
  if (
    (unconnected && openInputs.length === 0) ||
    state === undefined ||
    state.status === "waiting"
  )
    return { id: "connect" };
  const input = openInputs[0];
  if (input) return { id: "question", input, total: openInputs.length };
  if (planPending) return { id: "plan" };
  if (finishProposed(state) && !hasOpenSteps(state)) return { id: "finish" };
  if (state.status === "installing") return { id: "install" };
  return { id: "working" };
}

const hasOpenSteps = (state: Checkout.State) =>
  state.steps.some(
    (step) => step.status !== "done" && step.status !== "skipped",
  );

const answersIn = (
  state: Checkout.State,
  phase: Checkout.Status,
): WizardPage[] =>
  state.inputs
    .filter(
      (input) =>
        input.phase === phase &&
        input.status !== "open" &&
        input.kind !== "product",
    )
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
  // The setup opens on the agent's questions; the connect page is never stepped back to.
  const trail: WizardPage[] = [];
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
