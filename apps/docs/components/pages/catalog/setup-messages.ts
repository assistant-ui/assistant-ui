import {
  parseChoiceAnswer,
  parseModelAnswer,
  type Checkout,
} from "@/lib/checkout/protocol";

import { getProduct } from "@/lib/catalog";
import type { CheckoutSession } from "@/lib/checkout/session-store";
import { setupStageForPhase, type SetupStageId } from "./setup-stages";

export type SetupMessage = {
  stage: SetupStageId;
  products?: Checkout.Product[];
  id: string;
  at: number;
  role: "agent" | "user";
  text: string;
  plan?: Checkout.Plan;
  question?: Checkout.Input;
  replyTo?: { inputId: string; prompt: string };
  acknowledged?: boolean;
};

function answerText(input: Checkout.Input) {
  const answer = input.answer ?? "";
  if (input.kind === "model") {
    const model = parseModelAnswer(answer);
    if (model)
      return `${input.options?.find((option) => option.id === model.provider)?.label ?? model.provider} · ${model.model}${model.reasoningEffort ? ` · ${model.reasoningEffort} reasoning` : ""}`;
  }
  if (input.kind === "choice") {
    const { option, variant } = parseChoiceAnswer(answer);
    const chosen = input.options?.find((entry) => entry.id === option);
    if (chosen)
      return `${chosen.label}${variant ? ` · ${chosen.variants?.find((entry) => entry.id === variant)?.label ?? variant}` : ""}`;
  }
  return answer;
}

export function setupMessages(
  state: Checkout.State,
  session?: CheckoutSession,
): SetupMessage[] {
  const messages: SetupMessage[] = state.log.map((entry) => ({
    id: entry.id,
    stage: setupStageForPhase(entry.phase),
    at: entry.at,
    role: entry.role,
    text: entry.text,
    ...(entry.role === "user" && {
      acknowledged: entry.acknowledgedAt !== undefined,
    }),
  }));
  if (state.createdAt !== null || session) {
    messages.push({
      id: "order",
      at: state.createdAt ?? session!.startedAt,
      stage: "order",
      role: "user",
      text: state.instructions || session?.instructions || "",
      products:
        state.products.length > 0
          ? state.products
          : (session?.products.map((slug) => ({
              slug,
              name: getProduct(slug)?.name ?? slug,
            })) ?? []),
    });
  }
  for (const plan of state.plans) {
    messages.push({
      id: `plan-${plan.revision}`,
      stage: "plan",
      at: plan.submittedAt,
      role: "agent",
      text: plan.markdown,
      plan,
    });
    if (plan.decidedAt !== undefined) {
      messages.push({
        id: `plan-${plan.revision}-decision`,
        stage: "plan",
        at: plan.decidedAt,
        role: "user",
        text:
          plan.status === "approved"
            ? "I approved the plan."
            : (plan.feedback ?? "I requested changes to the plan."),
      });
    }
  }
  for (const input of state.inputs) {
    messages.push({
      id: `${input.id}-question`,
      stage: setupStageForPhase(input.phase),
      at: input.createdAt,
      role: "agent",
      text: input.prompt,
      question: input,
    });
    if (input.answeredAt !== undefined) {
      const answer =
        input.status === "answered"
          ? answerText(input)
          : "Question closed without an answer.";
      messages.push({
        id: `${input.id}-answer`,
        stage: setupStageForPhase(input.phase),
        replyTo: { inputId: input.id, prompt: input.prompt },
        at: input.answeredAt,
        role: input.status === "answered" ? "user" : "agent",
        text: `${answer}${input.note ? `\n\n${input.note}` : ""}`,
      });
    }
  }
  return messages.sort((a, b) => a.at - b.at);
}
