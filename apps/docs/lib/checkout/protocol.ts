import type { Checkout } from "setup-agent";

export type { Checkout, OptionIcon } from "setup-agent";
export {
  AGENT_HEARTBEAT_MS,
  AGENT_PRESENCE_MS,
  OPTION_ICONS,
  classifyChoiceAnswer,
  currentPlan,
  initialCheckoutState,
  finishProposed,
  followedUpSinceProposal,
  isAgentPresent,
  isClosed,
  isOptionIcon,
  isValidModelAnswer,
  isValidEntryPointAnswer,
  isValidEntryPointInput,
  openInputs,
  parseChoiceAnswer,
  parseEntryPointOptions,
  parseModelAnswer,
  parseMultipleAnswer,
  parsePreviewUrl,
  planNeedsReview,
  stepProgress,
} from "setup-agent";

export const inputPrompt = (input: Checkout.Input) =>
  input.prompt.trim() || "Your agent needs an answer.";

export const awaitingUserAt = (state: Checkout.State, at: number) =>
  state.inputs.some(
    (input) =>
      input.createdAt <= at &&
      (input.answeredAt === undefined
        ? input.status === "open"
        : input.answeredAt > at),
  ) ||
  state.plans.some(
    (plan) =>
      plan.submittedAt <= at &&
      (plan.decidedAt === undefined
        ? plan.status === "proposed"
        : plan.decidedAt > at),
  ) ||
  (state.completion !== undefined && state.completion.proposedAt <= at);

export const unreadAgentEntries = (
  state: Checkout.State | undefined,
  entries: readonly Checkout.LogEntry[],
  readAt: number,
) =>
  state === undefined
    ? []
    : entries.filter(
        (entry, index) =>
          entry.role === "agent" &&
          entry.at > readAt &&
          (entries[index - 1]?.role === "user" ||
            !awaitingUserAt(state, entry.at)),
      );

export const isStepClosingLine = (
  entry: Checkout.LogEntry,
  state: Checkout.State,
) => {
  if (entry.role !== "agent") return false;
  const step = state.steps.find((candidate) => candidate.id === entry.stepId);
  return (
    step !== undefined &&
    ["Completed", "Skipped"].some(
      (verb) =>
        entry.text === `${verb}: ${step.title}` ||
        entry.text.startsWith(`${verb}: ${step.title}\n\n`),
    )
  );
};

export const stepActivity = (state: Checkout.State, stepId: string) =>
  state.log.filter(
    (entry) =>
      entry.role === "agent" &&
      entry.stepId === stepId &&
      !isStepClosingLine(entry, state),
  );

export const stepsFinalized = (state: Checkout.State) =>
  state.steps.some((step) => step.status !== "pending");
